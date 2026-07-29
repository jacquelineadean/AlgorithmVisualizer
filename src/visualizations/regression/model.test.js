import { describe, expect, it } from 'vitest';
import {
    DATASETS,
    leastSquares,
    makePoints,
    orthogonality,
    residuals,
    sumSquares,
} from './model';
import { buildRegressionTrace } from './trace';

describe('leastSquares', () => {
    it('recovers an exact line with zero error', () => {
        const points = [1, 2, 3, 4, 5].map((x) => ({ x, y: 3 * x - 2 }));
        const fit = leastSquares(points);
        expect(fit.slope).toBeCloseTo(3, 12);
        expect(fit.intercept).toBeCloseTo(-2, 12);
        expect(fit.sse).toBeCloseTo(0, 12);
        expect(fit.r2).toBeCloseTo(1, 12);
    });

    it('passes through the centroid', () => {
        for (const set of DATASETS) {
            const points = makePoints({ datasetId: set.id, n: 30, seed: 4 });
            const fit = leastSquares(points);
            expect(fit.intercept + fit.slope * fit.meanX).toBeCloseTo(fit.meanY, 10);
        }
    });

    it('beats every nearby line — it is the minimum, not a good guess', () => {
        const points = makePoints({ datasetId: 'linear', n: 40, seed: 11 });
        const fit = leastSquares(points);
        for (const db of [-0.2, -0.05, 0.05, 0.2]) {
            for (const da of [-0.5, -0.1, 0.1, 0.5]) {
                expect(sumSquares(points, fit.slope + db, fit.intercept + da)).toBeGreaterThan(
                    fit.sse
                );
            }
        }
    });

    it('makes the residual orthogonal to both columns of X', () => {
        for (const set of DATASETS) {
            const points = makePoints({ datasetId: set.id, n: 25, seed: 6 });
            const fit = leastSquares(points);
            const { dotOnes, dotX } = orthogonality(points, fit.slope, fit.intercept);
            expect(Math.abs(dotOnes)).toBeLessThan(1e-9);
            expect(Math.abs(dotX)).toBeLessThan(1e-9);
        }
    });

    it('decomposes the variance: SST = SSE + explained', () => {
        const points = makePoints({ datasetId: 'weak', n: 50, seed: 3 });
        const fit = leastSquares(points);
        const explained = residuals(points, fit.slope, fit.intercept).reduce(
            (sum, row) => sum + (row.fit - fit.meanY) ** 2,
            0
        );
        expect(fit.sse + explained).toBeCloseTo(fit.sst, 8);
    });
});

describe('buildRegressionTrace', () => {
    it('scores the trial line worse than the fit and validates n', () => {
        const { artifacts } = buildRegressionTrace({
            datasetId: 'linear',
            n: 24,
            seed: 5,
            trialSlope: 2.4,
            trialIntercept: 0.4,
        });
        expect(artifacts.trialSse).toBeGreaterThan(artifacts.fit.sse);
        expect(Math.abs(artifacts.ortho.dotX)).toBeLessThan(1e-9);
        expect(() => buildRegressionTrace({ datasetId: 'linear', n: 2, seed: 1 })).toThrow(
            /between 4 and 200/
        );
    });

    it('includes the flagged high-leverage point in the outlier preset', () => {
        const { artifacts } = buildRegressionTrace({
            datasetId: 'outlier',
            n: 18,
            seed: 2,
            trialSlope: 1,
            trialIntercept: 3,
        });
        expect(artifacts.points.filter((point) => point.flagged)).toHaveLength(1);
    });
});
