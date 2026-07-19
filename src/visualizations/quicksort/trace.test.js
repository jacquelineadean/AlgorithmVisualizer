import { describe, expect, it } from 'vitest';
import { makeArray } from '../sorting/model';
import { buildQuicksortTrace } from './trace';

describe('buildQuicksortTrace', () => {
    it('streams every recorded event exactly once, in order', () => {
        const values = makeArray({ size: 24, preset: 'random', seed: 5 });
        const { steps, artifacts } = buildQuicksortTrace({ values });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toEqual(artifacts.events);
    });

    it('eventBase matches the number of events applied before each step', () => {
        const values = makeArray({ size: 16, preset: 'reversed', seed: 1 });
        const { steps, artifacts } = buildQuicksortTrace({ values });
        let applied = 0;
        for (const step of steps) {
            expect(step.data.eventBase).toBe(applied);
            applied += step.stream?.events.length ?? 0;
        }
        expect(steps.at(-1).data.eventBase).toBe(artifacts.events.length);
    });

    it('sorts and reports honest counters', () => {
        const values = makeArray({ size: 33, preset: 'few-unique', seed: 9 });
        const { artifacts, steps } = buildQuicksortTrace({ values });
        expect([...artifacts.input].sort((a, b) => a - b)).toEqual(artifacts.sorted);
        const cost = steps.find((s) => s.id === 'the-cost');
        expect(cost.explanation).toContain(String(artifacts.comparisons));
    });

    it('validates inputs', () => {
        expect(() => buildQuicksortTrace({ values: [1] })).toThrow(/2 to 64/);
        expect(() => buildQuicksortTrace({ values: [1, 'x'] })).toThrow(/number/);
    });
});
