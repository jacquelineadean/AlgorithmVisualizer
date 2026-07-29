import { describe, expect, it } from 'vitest';
import { errors, makePoints, novikoffBound, predict, train } from './model';
import { buildPerceptronTrace } from './trace';

describe('perceptron learning rule', () => {
    it('separates separable data and stops', () => {
        for (const seed of [1, 2, 3, 4]) {
            const points = makePoints({ datasetId: 'separable', n: 60, seed });
            const run = train({ points, rate: 1, epochs: 60 });
            expect(run.converged).toBe(true);
            expect(errors(points, run.w)).toBe(0);
        }
    });

    it('never converges on XOR, whatever the rate', () => {
        const points = makePoints({ datasetId: 'xor', n: 4, seed: 1 });
        for (const rate of [0.5, 1, 2]) {
            const run = train({ points, rate, epochs: 200 });
            expect(run.converged).toBe(false);
            expect(errors(points, run.w)).toBeGreaterThan(0);
        }
    });

    it('only ever updates on a mistake, and by η·y·x', () => {
        const points = makePoints({ datasetId: 'separable', n: 30, seed: 9 });
        const run = train({ points, rate: 0.5, epochs: 40 });
        for (const event of run.events) {
            if (event.t === 'ok') continue;
            const point = points[event.index];
            expect(predict(event.before, point)).not.toBe(point.label);
            expect(event.w[0]).toBeCloseTo(event.before[0] + 0.5 * point.label, 10);
            expect(event.w[1]).toBeCloseTo(event.before[1] + 0.5 * point.label * point.x, 10);
            expect(event.w[2]).toBeCloseTo(event.before[2] + 0.5 * point.label * point.y, 10);
        }
        expect(run.events.filter((event) => event.t === 'fix')).toHaveLength(run.mistakes);
    });

    it('respects Novikoff’s mistake bound on separable data', () => {
        for (const datasetId of ['separable', 'narrow']) {
            const points = makePoints({ datasetId, n: 50, seed: 3 });
            const { bound } = novikoffBound(points);
            expect(bound).toBeGreaterThan(0);
            expect(train({ points, rate: 1, epochs: 200 }).mistakes).toBeLessThanOrEqual(bound);
        }
    });

    it('reports no positive margin when the classes overlap', () => {
        const points = makePoints({ datasetId: 'xor', n: 4, seed: 1 });
        expect(novikoffBound(points).bound).toBeNull();
    });
});

describe('buildPerceptronTrace', () => {
    it('streams one event per example examined and validates inputs', () => {
        const { steps, artifacts } = buildPerceptronTrace({
            datasetId: 'separable',
            n: 40,
            seed: 6,
            rate: 1,
            epochs: 30,
        });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toHaveLength(artifacts.run.events.length);
        expect(() => buildPerceptronTrace({ datasetId: 'separable', n: 2, seed: 1 })).toThrow(
            /between 4 and 200/
        );
        expect(() =>
            buildPerceptronTrace({ datasetId: 'separable', n: 20, seed: 1, rate: 0 })
        ).toThrow(/learning rate/);
    });

    it('titles the training step by what actually happened', () => {
        const xor = buildPerceptronTrace({ datasetId: 'xor', n: 4, seed: 1, rate: 1, epochs: 10 });
        expect(xor.steps.find((step) => step.id === 'train').title).toMatch(/cycling/i);
    });
});
