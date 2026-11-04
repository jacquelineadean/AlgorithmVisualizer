import { describe, expect, it } from 'vitest';
import {
    BITS,
    COLS,
    GROUP_SIZES,
    N_GRID,
    S_TRIALS,
    SEEDS,
    keepChannel,
    makeLayer,
    runAwq,
    scaledQuantize,
    searchScales,
} from './model';
import { buildAwqTrace } from './trace';
import { linear, median, minmaxGrid, quantizeGroups, scaleColumns } from '../quantization/model';

const everyConfig = () =>
    SEEDS.flatMap((seed) => BITS.flatMap((bits) => GROUP_SIZES.map((groupSize) => ({ seed, bits, groupSize }))));

describe('the toy layer', () => {
    it('has one far louder input channel, and a different channel with the largest weights', () => {
        for (const seed of SEEDS) {
            const run = runAwq({ seed });
            const { salient, decoy } = makeLayer({ seed });
            expect(run.byActivation).toBe(salient);
            expect(run.byWeight).toBe(decoy);
            expect(salient).not.toBe(decoy);
            const others = run.sX.filter((_, j) => j !== salient);
            expect(run.sX[salient] / median(others)).toBeGreaterThan(5);
        }
    });
});

describe('scaling is an equivalence until you round', () => {
    it('reproduces the layer exactly with the scales folded into the input', () => {
        const { W, X } = makeLayer({ seed: 3 });
        const s = [0.5, 2, 1.5, 1, 3, 0.8, 1.2, 4];
        const Y = linear(X, W);
        const Ys = linear(scaleColumns(X, s, { invert: true }), scaleColumns(W, s));
        Ys.forEach((row, i) => row.forEach((value, j) => expect(value).toBeCloseTo(Y[i][j], 12)));
    });

    it('bounds a scaled weight’s error by Δ′/(2s) — the §3.2 argument', () => {
        for (const { seed, bits, groupSize } of everyConfig()) {
            const run = runAwq({ seed, bits, groupSize });
            const j = run.byActivation;
            const group = Math.floor(j / groupSize);
            for (const factor of S_TRIALS) {
                const s = run.sX.map((_, k) => (k === j ? factor : 1));
                const { Weff, grids } = scaledQuantize(run.W, s, bits, groupSize);
                run.W.forEach((row, r) => {
                    const members = scaleColumns(run.W, s)[r].slice(group * groupSize, (group + 1) * groupSize);
                    // Only groups that straddle zero: the reference quantizer's zero-point
                    // clamp can leave a one-signed group's grid short of its range.
                    if (Math.min(...members) >= 0 || Math.max(...members) <= 0) return;
                    expect(Math.abs(Weff[r][j] - row[j])).toBeLessThanOrEqual(grids[r][group].scale / (2 * factor) + 1e-12);
                });
            }
        }
    });
});

describe('which channel to protect (Table 1 at toy size)', () => {
    it('keeping the loud-input channel in FP16 beats keeping the large-weight one, every time', () => {
        for (const config of everyConfig()) {
            const { errors } = runAwq(config);
            expect(errors.keepActivation).toBeLessThan(errors.keepWeight);
            expect(errors.keepActivation).toBeLessThan(errors.rtn);
        }
    });

    it('restores exactly the kept channel', () => {
        const { W } = makeLayer({ seed: 1 });
        const { Q } = quantizeGroups(W, 3, 4);
        const kept = keepChannel(W, Q, 2);
        kept.forEach((row, r) => {
            expect(row[2]).toBe(W[r][2]);
            expect(row[3]).toBe(Q[r][3]);
        });
    });
});

describe('the scale search (auto_scale.py)', () => {
    it('tries α = 0, 0.05, …, 0.95 and normalizes s by √(max · min)', () => {
        const { W, X } = makeLayer({ seed: 2 });
        const { history } = searchScales(W, X, 3, 4);
        expect(history.map((p) => p.alpha)).toEqual(Array.from({ length: N_GRID }, (_, i) => i / N_GRID));
        for (const point of history) {
            expect(Math.max(...point.s) * Math.min(...point.s)).toBeCloseTo(1, 12);
        }
    });

    it('reduces to round-to-nearest at α = 0', () => {
        for (const config of everyConfig()) {
            const run = runAwq(config);
            expect(run.search.history[0].Weff).toEqual(run.rtn);
        }
    });

    it('never does worse than rounding, and does better in almost every configuration', () => {
        let better = 0;
        for (const config of everyConfig()) {
            const { errors } = runAwq(config);
            expect(errors.awq).toBeLessThanOrEqual(errors.rtn);
            if (errors.awq < errors.rtn) better += 1;
        }
        expect(better).toBeGreaterThanOrEqual(everyConfig().length - 2);
    });

    it('keeps its grid reference: Δ from a group’s min and max', () => {
        expect(minmaxGrid([-1, 0.5, 2], 2).scale).toBeCloseTo(1, 12);
    });
});

describe('buildAwqTrace', () => {
    it('walks problem, method, and result', () => {
        const { steps } = buildAwqTrace({});
        expect(steps.map((step) => step.id)).toEqual([
            'layer',
            'rtn',
            'salient',
            'scale-instead',
            'trial',
            'search',
            'fold',
            'result',
            'why',
        ]);
        expect(steps.find((step) => step.id === 'search').stream.events).toHaveLength(N_GRID);
    });

    it('says what s = 2 actually did', () => {
        for (const config of everyConfig()) {
            const { steps, artifacts } = buildAwqTrace(config);
            const text = steps.find((step) => step.id === 'trial').explanation;
            if (artifacts.errors.scale2 < artifacts.errors.rtn) expect(text).toMatch(/^Doubling/);
            else expect(text).toMatch(/does not help/);
        }
    });

    it('titles the result by what actually happened', () => {
        for (const config of everyConfig()) {
            const { steps, artifacts } = buildAwqTrace(config);
            const title = steps.find((step) => step.id === 'result').title;
            expect(title).toMatch(artifacts.errors.awq < artifacts.errors.rtn ? /^AWQ \d/ : /AWQ = RTN/);
        }
    });

    it('rejects inputs it does not offer', () => {
        expect(() => buildAwqTrace({ bits: 2 })).toThrow(/bits/);
        expect(() => buildAwqTrace({ groupSize: 3 })).toThrow(/group size/);
        expect(() => buildAwqTrace({ seed: 0 })).toThrow(/layer/);
    });

    it('draws every frame from artifacts, tints included', () => {
        const { artifacts } = buildAwqTrace({ seed: 4 });
        expect(artifacts.shares.search).toHaveLength(N_GRID);
        expect(artifacts.shares.original.flat().every((value) => value === 0)).toBe(true);
        expect(artifacts.shares.rtn[0]).toHaveLength(COLS);
    });
});
