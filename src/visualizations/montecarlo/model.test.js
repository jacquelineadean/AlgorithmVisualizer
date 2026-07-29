import { describe, expect, it } from 'vitest';
import { SIGMA, convergence, dartsForError, errorBand, estimateAfter, throwDarts } from './model';
import { buildMonteCarloTrace } from './trace';

describe('throwDarts', () => {
    it('classifies every dart by the unit-circle test and keeps a running count', () => {
        const { darts, inside } = throwDarts({ count: 500, seed: 3 });
        expect(darts).toHaveLength(500);
        let running = 0;
        for (const dart of darts) {
            expect(dart.x).toBeGreaterThanOrEqual(-1);
            expect(dart.x).toBeLessThanOrEqual(1);
            expect(dart.inside).toBe(dart.x * dart.x + dart.y * dart.y <= 1);
            if (dart.inside) running += 1;
            expect(dart.hits).toBe(running);
        }
        expect(inside).toBe(running);
    });

    it('estimates π within the band the theory predicts', () => {
        for (const seed of [1, 2, 3, 4, 5]) {
            const n = 20000;
            const { inside } = throwDarts({ count: n, seed });
            // Three standard errors is a ~99.7% claim; a failure here means
            // the generator or the test is wrong, not bad luck.
            expect(Math.abs(estimateAfter(inside, n) - Math.PI)).toBeLessThan(3 * errorBand(n));
        }
    });

    it('is deterministic in the seed', () => {
        expect(throwDarts({ count: 20, seed: 9 }).darts).toEqual(
            throwDarts({ count: 20, seed: 9 }).darts
        );
    });
});

describe('error analysis', () => {
    it('uses σ = 4√(p(1−p)) with p = π/4', () => {
        const p = Math.PI / 4;
        expect(SIGMA).toBeCloseTo(4 * Math.sqrt(p * (1 - p)), 12);
        expect(errorBand(10000)).toBeCloseTo(SIGMA / 100, 12);
    });

    it('inverts the rate: ten times the precision costs a hundred times the darts', () => {
        expect(dartsForError(0.001) / dartsForError(0.01)).toBeGreaterThan(99);
        expect(dartsForError(0.001) / dartsForError(0.01)).toBeLessThan(101);
    });
});

describe('buildMonteCarloTrace', () => {
    it('streams every dart once and reports the run’s own numbers', () => {
        const { steps, artifacts } = buildMonteCarloTrace({ count: 600, seed: 21 });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toHaveLength(600);
        expect(artifacts.estimate).toBeCloseTo((4 * artifacts.inside) / 600, 12);
        expect(artifacts.error).toBeCloseTo(Math.abs(artifacts.estimate - Math.PI), 12);
    });

    it('thins the convergence curve but keeps it monotone in n', () => {
        const { artifacts } = buildMonteCarloTrace({ count: 4000, seed: 5 });
        const ns = convergence(artifacts.darts, 20).map((point) => point.n);
        expect(ns).toEqual([...ns].sort((a, b) => a - b));
        expect(artifacts.curve.at(-1).n).toBeLessThanOrEqual(4000);
    });

    it('validates the dart count', () => {
        expect(() => buildMonteCarloTrace({ count: 10, seed: 1 })).toThrow(/between 50/);
    });
});
