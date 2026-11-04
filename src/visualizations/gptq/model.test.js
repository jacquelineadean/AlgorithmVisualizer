import { describe, expect, it } from 'vitest';
import {
    BITS,
    BLOCK_SIZES,
    COLS,
    PERCDAMP,
    PRESETS,
    SEEDS,
    costs,
    dampen,
    gptq,
    hessianOf,
    makeLayer,
    obsSequential,
    quadraticError,
    roundToNearest,
    rowGrids,
    runGptq,
    storageBytes,
    tailPasses,
} from './model';
import { buildGptqTrace } from './trace';
import { gridLevels, invertSPD, upperCholesky } from '../quantization/model';

const setup = ({ preset = 'correlated', seed = 1, bits = 3 } = {}) => {
    const { W, X } = makeLayer({ preset, seed });
    const H = hessianOf(X);
    const { H: Hd, damp } = dampen(H);
    return { W, X, H, Hd, damp, grids: rowGrids(W, bits) };
};

const maxDiff = (A, B) => Math.max(...A.flatMap((row, i) => row.map((value, j) => Math.abs(value - B[i][j]))));

describe('the Hessian and its dampening', () => {
    it('is (2/N)·XᵀX: symmetric, with a non-negative diagonal', () => {
        const { H, X } = setup();
        H.forEach((row, i) => row.forEach((value, j) => expect(value).toBeCloseTo(H[j][i], 12)));
        const manual = (2 / X.length) * X.reduce((sum, x) => sum + x[0] * x[1], 0);
        expect(H[0][1]).toBeCloseTo(manual, 12);
    });

    it('adds 1% of the mean diagonal, as the reference code does', () => {
        const { H, damp, Hd } = setup();
        const mean = H.reduce((sum, row, i) => sum + row[i], 0) / H.length;
        expect(damp).toBeCloseTo(PERCDAMP * mean, 12);
        expect(Hd[2][2] - H[2][2]).toBeCloseTo(damp, 12);
        expect(Hd[2][3]).toBe(H[2][3]);
    });

    it('is exactly diagonal for the decorrelated preset', () => {
        const { H } = setup({ preset: 'decorrelated' });
        H.forEach((row, i) => row.forEach((value, j) => i !== j && expect(value).toBe(0)));
    });
});

describe('Optimal Brain Surgeon, one column at a time', () => {
    it('leaves the remaining weights at the optimum given the ones fixed (stationarity)', () => {
        // After quantizing column 0 and compensating, the gradient of
        // ½ δ H δᵀ with respect to every weight still free is zero.
        const { W, Hd, grids } = setup();
        const { states } = obsSequential(W, Hd, grids);
        const after = states[1];
        after.forEach((row, r) => {
            const delta = row.map((value, j) => value - W[r][j]);
            for (let f = 1; f < COLS; f++) {
                const gradient = delta.reduce((sum, d, i) => sum + d * Hd[i][f], 0);
                expect(Math.abs(gradient)).toBeLessThan(1e-10);
            }
        });
    });

    it('reads, at column j, exactly the rows of the Cholesky factor of H⁻¹ (Step 3)', () => {
        const { Hd } = setup({ seed: 4 });
        const U = upperCholesky(invertSPD(Hd));
        let Hinv = invertSPD(Hd);
        for (let j = 0; j < COLS; j++) {
            for (let f = j; f < COLS; f++) expect(Hinv[j][f]).toBeCloseTo(U[j][j] * U[j][f], 10);
            const pivot = [...Hinv[j]];
            Hinv = Hinv.map((row) => row.map((value, k) => value - (row[j] * pivot[k]) / pivot[j]));
        }
    });
});

describe('GPTQ (fasterquant)', () => {
    it('matches the one-column-at-a-time OBS run for every input, bit width, and block size', () => {
        for (const preset of PRESETS.map((item) => item.id)) {
            for (const seed of SEEDS) {
                for (const bits of BITS) {
                    const { W, Hd } = setup({ preset, seed });
                    const grids = rowGrids(W, bits);
                    const reference = obsSequential(W, Hd, grids).Q;
                    for (const blockSize of BLOCK_SIZES) {
                        expect(maxDiff(gptq(W, Hd, grids, blockSize).Q, reference)).toBeLessThan(1e-12);
                    }
                }
            }
        }
    });

    it('books losses that add up to the final quadratic error', () => {
        const { W, Hd, grids } = setup({ seed: 2 });
        const { Q, losses } = gptq(W, Hd, grids, 4);
        const booked = losses.flat().reduce((a, b) => a + b, 0);
        expect(booked).toBeCloseTo(quadraticError(W, Q, Hd), 10);
    });

    it('puts every weight on its row’s grid', () => {
        const { W, Hd, grids } = setup({ seed: 5 });
        const { Q } = gptq(W, Hd, grids, 2);
        Q.forEach((row, r) => {
            const levels = gridLevels(grids[r]);
            row.forEach((value) => expect(Math.min(...levels.map((l) => Math.abs(l - value)))).toBeLessThan(1e-12));
        });
    });

    it('reduces exactly to round-to-nearest when H is diagonal', () => {
        for (const seed of SEEDS) {
            for (const bits of BITS) {
                const { W, Hd } = setup({ preset: 'decorrelated', seed });
                const grids = rowGrids(W, bits);
                expect(gptq(W, Hd, grids, 4).Q).toEqual(roundToNearest(W, grids));
            }
        }
    });

    it('beats rounding on correlated inputs — clearly on average, not always', () => {
        let logRatio = 0;
        let runs = 0;
        for (const seed of SEEDS) {
            for (const bits of BITS) {
                const run = runGptq({ preset: 'correlated', seed, bits });
                logRatio += Math.log(run.rtnError / run.gptqError);
                runs += 1;
            }
        }
        expect(Math.exp(logRatio / runs)).toBeGreaterThan(1.4);
        const fixture = runGptq({ preset: 'correlated', seed: 1, bits: 3 });
        expect(fixture.gptqError).toBeLessThan(fixture.rtnError / 1.4);
    });

    it('records one frame per column plus one per deferred tail update', () => {
        const { W, Hd, grids } = setup();
        for (const blockSize of BLOCK_SIZES) {
            const { frames } = gptq(W, Hd, grids, blockSize);
            expect(frames.filter((f) => f.kind === 'column').map((f) => f.col)).toEqual([...Array(COLS).keys()]);
            expect(frames.filter((f) => f.kind === 'flush')).toHaveLength(tailPasses(COLS, blockSize));
        }
    });
});

describe('the numbers the page states', () => {
    it('computes Step 1’s cost saving as min(d_row, d_col)', () => {
        expect(costs(4, 8)).toEqual({ obq: 2048, gptq: 512, ratio: 4 });
        expect(costs(12288, 12288).ratio).toBe(12288);
        expect(costs(4096, 11008).ratio).toBe(4096);
    });

    it('counts Step 2’s tail rewrites', () => {
        expect(tailPasses(8, 1)).toBe(7);
        expect(tailPasses(8, 4)).toBe(1);
        expect(tailPasses(8, 8)).toBe(0);
        expect(tailPasses(12288, 128)).toBe(95);
    });

    it('sizes a 175B model’s weights', () => {
        expect(storageBytes(175e9, 16)).toBe(350e9);
        expect(storageBytes(175e9, 3)).toBe(65.625e9);
        expect(storageBytes(175e9, 4)).toBe(87.5e9);
    });
});

describe('buildGptqTrace', () => {
    it('walks the problem, the algorithm, and the result', () => {
        const { steps } = buildGptqTrace({});
        expect(steps.map((step) => step.id)).toEqual([
            'layer',
            'objective',
            'rtn',
            'hessian',
            'obs',
            'order',
            'sweep',
            'lazy',
            'cholesky',
            'result',
            'scale',
        ]);
        const sweep = steps.find((step) => step.id === 'sweep');
        expect(sweep.stream.events).toHaveLength(COLS + tailPasses(COLS, 4));
    });

    it('titles the result by what actually happened', () => {
        const title = (inputs) => buildGptqTrace(inputs).steps.find((step) => step.id === 'result').title;
        expect(title({ preset: 'decorrelated', seed: 1, bits: 3 })).toMatch(/GPTQ = RTN/);
        expect(title({ preset: 'correlated', seed: 1, bits: 3 })).toMatch(/^GPTQ \d/);
        // A layer where the greedy pass loses — the page must say so.
        const loss = buildGptqTrace({ preset: 'correlated', seed: 3, bits: 3 });
        expect(loss.artifacts.outcome).toBe('loss');
        expect(loss.steps.find((step) => step.id === 'result').explanation).toMatch(/it lost/);
    });

    it('rejects inputs it does not offer', () => {
        expect(() => buildGptqTrace({ bits: 5 })).toThrow(/bits/);
        expect(() => buildGptqTrace({ blockSize: 3 })).toThrow(/block size/);
        expect(() => buildGptqTrace({ seed: 99 })).toThrow(/layer/);
    });
});
