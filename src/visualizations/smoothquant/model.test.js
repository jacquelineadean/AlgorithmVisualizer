import { describe, expect, it } from 'vitest';
import {
    ALPHAS,
    CHANNELS,
    OUTLIER_CHANNELS,
    PRESETS,
    SEEDS,
    channelErrors,
    makeLayer,
    runSmoothQuant,
    smooth,
    smoothingFactors,
} from './model';
import { buildSmoothQuantTrace } from './trace';
import { columnAbsMax, linear } from '../quantization/model';

const everyConfig = () => PRESETS.flatMap((preset) => SEEDS.map((seed) => ({ preset: preset.id, seed })));

describe('the toy activations', () => {
    it('put the outliers in the same channels in every token', () => {
        for (const config of everyConfig()) {
            const { X } = makeLayer(config);
            for (const row of X) {
                const quietest = Math.min(...OUTLIER_CHANNELS.map((j) => Math.abs(row[j])));
                const loudest = Math.max(
                    ...row.filter((_, j) => !OUTLIER_CHANNELS.includes(j)).map(Math.abs)
                );
                expect(quietest).toBeGreaterThan(loudest);
            }
        }
    });

    it('match the spread their preset labels promise', () => {
        for (const seed of SEEDS) {
            const moderate = runSmoothQuant({ preset: 'moderate', seed }).spread;
            const severe = runSmoothQuant({ preset: 'severe', seed }).spread;
            expect(moderate).toBeGreaterThan(10);
            expect(moderate).toBeLessThan(16);
            expect(severe).toBeGreaterThan(30);
            expect(severe).toBeLessThan(50);
        }
    });
});

describe('smoothing (eqs. 3–4)', () => {
    it('leaves the layer’s output exactly as it was', () => {
        for (const config of everyConfig()) {
            for (const alpha of [0, 0.25, 0.5, 0.85, 1]) {
                const { X, W } = makeLayer(config);
                const { Xs, Ws } = smooth(X, W, smoothingFactors(X, W, alpha));
                const Y = linear(X, W);
                linear(Xs, Ws).forEach((row, i) => row.forEach((value, j) => expect(value).toBeCloseTo(Y[i][j], 10)));
            }
        }
    });

    it('meets in the middle at α = 0.5: max|X̂_j| = max|Ŵ_j| = √(max|X_j| · max|W_j|)', () => {
        const { X, W } = makeLayer({ preset: 'severe', seed: 2 });
        const { Xs, Ws } = smooth(X, W, smoothingFactors(X, W, 0.5));
        const [ax, aw, sx, sw] = [columnAbsMax(X), columnAbsMax(W), columnAbsMax(Xs), columnAbsMax(Ws)];
        for (let j = 0; j < CHANNELS; j++) {
            expect(sx[j]).toBeCloseTo(sw[j], 10);
            expect(sx[j]).toBeCloseTo(Math.sqrt(ax[j] * aw[j]), 10);
        }
    });

    it('flattens the weights at α = 0 and the activations at α = 1', () => {
        const { X, W } = makeLayer({ preset: 'moderate', seed: 4 });
        const zero = smooth(X, W, smoothingFactors(X, W, 0));
        const one = smooth(X, W, smoothingFactors(X, W, 1));
        columnAbsMax(zero.Ws).forEach((value) => expect(value).toBeCloseTo(1, 12));
        columnAbsMax(one.Xs).forEach((value) => expect(value).toBeCloseTo(1, 12));
    });
});

describe('W8A8 at each granularity', () => {
    it('scores a channel by how much of x_j w_jᵀ survives', () => {
        const X = [[2, 1]];
        const W = [[1, 3]];
        expect(channelErrors(X, W, X, W)).toEqual([0, 0]);
        expect(channelErrors(X, W, [[1, 1]], W)).toEqual([0.5, 0]);
    });

    it('orders the schemes as the paper argues, in every configuration', () => {
        for (const config of everyConfig()) {
            const run = runSmoothQuant({ ...config, alpha: 0.5 });
            expect(run.perToken.worst).toBeLessThan(run.perTensor.worst);
            expect(run.smoothed.worst).toBeLessThan(run.perToken.worst);
            expect(run.smoothed.mean).toBeLessThan(run.perTensor.mean / 2);
            // Per-channel is the unreachable reference: best of all.
            expect(run.perChannel.worst).toBeLessThan(run.smoothed.worst);
        }
    });

    it('lets the quiet channels reach more INT8 levels once smoothed', () => {
        for (const config of everyConfig()) {
            const run = runSmoothQuant({ ...config, alpha: 0.5 });
            expect(run.smoothedQuietLevels).toBeGreaterThan(2 * run.quietLevels);
        }
        expect(runSmoothQuant({ preset: 'severe', seed: 1 }).quietLevels).toBeLessThanOrEqual(5);
    });

    it('finds its best α in the middle of the range, never at an end', () => {
        for (const config of everyConfig()) {
            const { sweep, best } = runSmoothQuant(config);
            expect(sweep.map((point) => point.alpha)).toEqual(ALPHAS);
            expect(best.alpha).toBeGreaterThan(0.3);
            expect(best.alpha).toBeLessThan(0.9);
            expect(sweep[0].mean).toBeGreaterThan(2 * best.mean);
            expect(sweep.at(-1).mean).toBeGreaterThan(1.5 * best.mean);
        }
    });
});

describe('buildSmoothQuantTrace', () => {
    it('walks problem, method, and result', () => {
        const { steps } = buildSmoothQuantTrace({});
        expect(steps.map((step) => step.id)).toEqual([
            'layer',
            'int8',
            'outliers',
            'baseline',
            'per-token',
            'per-channel',
            'migrate',
            'smoothed',
            'alpha',
            'fuse',
            'scale',
        ]);
        expect(steps.find((step) => step.id === 'alpha').stream.events).toHaveLength(ALPHAS.length);
    });

    it('mentions the α = 0.5 meeting point only at α = 0.5', () => {
        const text = (alpha) =>
            buildSmoothQuantTrace({ alpha }).steps.find((step) => step.id === 'migrate').explanation;
        expect(text(0.5)).toMatch(/meet exactly/);
        expect(text(0.75)).not.toMatch(/meet exactly/);
    });

    it('rejects inputs it does not offer', () => {
        expect(() => buildSmoothQuantTrace({ alpha: 0.33 })).toThrow(/α/);
        expect(() => buildSmoothQuantTrace({ preset: 'extreme' })).toThrow(/preset/);
        expect(() => buildSmoothQuantTrace({ seed: 7 })).toThrow(/layer/);
    });
});
