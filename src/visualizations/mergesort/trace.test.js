import { describe, expect, it } from 'vitest';
import { makeArray } from '../sorting/model';
import { buildMergesortTrace } from './trace';

describe('buildMergesortTrace', () => {
    it('streams every recorded event exactly once, in order', () => {
        const values = makeArray({ size: 24, preset: 'random', seed: 5 });
        const { steps, artifacts } = buildMergesortTrace({ values });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toEqual(artifacts.events);
    });

    it('eventBase matches the number of events applied before each step', () => {
        const values = makeArray({ size: 17, preset: 'nearly', seed: 2 });
        const { steps, artifacts } = buildMergesortTrace({ values });
        let applied = 0;
        for (const step of steps) {
            expect(step.data.eventBase).toBe(applied);
            applied += step.stream?.events.length ?? 0;
        }
        expect(steps.at(-1).data.eventBase).toBe(artifacts.events.length);
    });

    it('sorts within the n·log₂n comparison bound it claims', () => {
        for (const seed of [1, 2, 3]) {
            const values = makeArray({ size: 32, preset: 'random', seed });
            const { artifacts } = buildMergesortTrace({ values });
            expect([...artifacts.input].sort((a, b) => a - b)).toEqual(artifacts.sorted);
            expect(artifacts.comparisons).toBeLessThanOrEqual(
                Math.ceil(32 * Math.log2(32))
            );
        }
    });

    it('validates inputs', () => {
        expect(() => buildMergesortTrace({ values: [] })).toThrow(/2 to 64/);
        expect(() => buildMergesortTrace({ values: [Infinity, 2] })).toThrow(/number/);
    });
});
