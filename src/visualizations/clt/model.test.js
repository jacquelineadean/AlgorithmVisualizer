import { describe, expect, it } from 'vitest';
import {
    POPULATIONS,
    histogram,
    normalCurve,
    populationDraws,
    sampleMeans,
    standardError,
} from './model';
import { buildCltTrace } from './trace';

// The CLT page claims a specific number — σ/√n — so the tests check the
// sampling distribution against it rather than eyeballing a shape.

describe('populations', () => {
    it('declare means and standard deviations that match what they draw', () => {
        for (const population of POPULATIONS) {
            const draws = populationDraws(population, 40000, 5);
            const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
            const sd = Math.sqrt(
                draws.reduce((sum, v) => sum + (v - mean) ** 2, 0) / draws.length
            );
            expect(Math.abs(mean - population.mean)).toBeLessThan(0.06);
            expect(Math.abs(sd - population.sd)).toBeLessThan(0.06);
        }
    });
});

describe('sampling distribution', () => {
    it('narrows as σ/√n for every population', () => {
        for (const population of POPULATIONS) {
            for (const n of [4, 25]) {
                const { means } = sampleMeans({
                    populationId: population.id,
                    n,
                    count: 4000,
                    seed: 12,
                });
                const mean = means.reduce((a, b) => a + b, 0) / means.length;
                const sd = Math.sqrt(
                    means.reduce((sum, v) => sum + (v - mean) ** 2, 0) / means.length
                );
                const predicted = standardError(population, n);
                expect(Math.abs(mean - population.mean)).toBeLessThan(0.12);
                // Within 12% of the predicted standard error at this sample count.
                expect(Math.abs(sd - predicted) / predicted).toBeLessThan(0.12);
            }
        }
    });

    it('is deterministic in the seed', () => {
        const a = sampleMeans({ populationId: 'dice', n: 5, count: 50, seed: 42 });
        const b = sampleMeans({ populationId: 'dice', n: 5, count: 50, seed: 42 });
        expect(a.means).toEqual(b.means);
        const c = sampleMeans({ populationId: 'dice', n: 5, count: 50, seed: 43 });
        expect(c.means).not.toEqual(a.means);
    });
});

describe('histogram and normal curve', () => {
    it('bins to densities that integrate to one', () => {
        const bins = histogram([0.1, 0.4, 0.6, 0.9, 0.95], 5, [0, 1]);
        expect(bins.map((bin) => bin.count)).toEqual([1, 0, 1, 1, 2]);
        const area = bins.reduce((sum, bin) => sum + bin.density * (bin.x1 - bin.x0), 0);
        expect(area).toBeCloseTo(1, 10);
    });

    it('peaks at the mean with the standard normal height', () => {
        const curve = normalCurve(0, 1, [-4, 4], 800);
        const peak = curve.reduce((best, point) => (point.y > best.y ? point : best));
        expect(peak.x).toBeCloseTo(0, 1);
        expect(peak.y).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 3);
    });
});

describe('buildCltTrace', () => {
    it('streams every sample mean exactly once', () => {
        const { steps, artifacts } = buildCltTrace({
            populationId: 'exponential',
            n: 10,
            count: 200,
            seed: 7,
        });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toHaveLength(200);
        expect(streamed.map((event) => event.value)).toEqual(artifacts.means);
    });

    it('reports coverage near the normal law’s 68.3%', () => {
        const { artifacts } = buildCltTrace({
            populationId: 'uniform',
            n: 30,
            count: 2000,
            seed: 9,
        });
        expect(artifacts.coverage).toBeGreaterThan(0.63);
        expect(artifacts.coverage).toBeLessThan(0.73);
    });

    it('validates inputs', () => {
        expect(() => buildCltTrace({ populationId: 'dice', n: 0, count: 100, seed: 1 })).toThrow(
            /Sample size/
        );
        expect(() => buildCltTrace({ populationId: 'dice', n: 5, count: 5, seed: 1 })).toThrow(
            /2,000|between/
        );
    });
});
