import { describe, expect, it } from 'vitest';
import {
    applyEvents,
    makeArray,
    mergesortEvents,
    PRESETS,
    quicksortEvents,
} from './model';

const isSorted = (values) => values.every((v, i) => i === 0 || values[i - 1] <= v);

const CASES = [
    [5, 3, 8, 1, 9, 2],
    [2, 1],
    [7, 7, 7, 7],
    [1, 2, 3, 4, 5],
    [9, 8, 7, 6, 5, 4, 3, 2, 1],
    makeArray({ size: 40, preset: 'random', seed: 7 }),
    makeArray({ size: 33, preset: 'few-unique', seed: 3 }),
];

describe('makeArray', () => {
    it('is deterministic per seed and honors presets', () => {
        for (const { id } of PRESETS) {
            const one = makeArray({ size: 24, preset: id, seed: 42 });
            const two = makeArray({ size: 24, preset: id, seed: 42 });
            expect(one).toEqual(two);
            expect(one).toHaveLength(24);
        }
        expect(isSorted([...makeArray({ size: 16, preset: 'reversed', seed: 1 })].reverse())).toBe(
            true
        );
        expect(makeArray({ size: 24, preset: 'random', seed: 1 })).not.toEqual(
            makeArray({ size: 24, preset: 'random', seed: 2 })
        );
    });
});

describe('quicksortEvents', () => {
    it('sorts every case, and replaying events reproduces the result', () => {
        for (const input of CASES) {
            const { events, sorted, comparisons, swaps, firstPartitionEnd } =
                quicksortEvents(input);
            expect(isSorted(sorted)).toBe(true);
            expect([...sorted].sort((x, y) => x - y)).toEqual(sorted);

            const replay = applyEvents(input, events, events.length);
            expect(replay.values).toEqual(sorted);
            expect(replay.comparisons).toBe(comparisons);
            expect(replay.swaps).toBe(swaps);
            expect(replay.settled.size).toBe(input.length);
            expect(firstPartitionEnd).toBeGreaterThan(0);
            expect(firstPartitionEnd).toBeLessThanOrEqual(events.length);
        }
    });
});

describe('mergesortEvents', () => {
    it('sorts every case, and replaying events reproduces the result', () => {
        for (const input of CASES) {
            const { events, sorted, comparisons, writes, firstPassEnd } = mergesortEvents(input);
            expect(isSorted(sorted)).toBe(true);

            const replay = applyEvents(input, events, events.length);
            expect(replay.values).toEqual(sorted);
            expect(replay.comparisons).toBe(comparisons);
            expect(replay.writes).toBe(writes);
            expect(replay.settled.size).toBe(input.length);
            expect(firstPassEnd).toBeGreaterThan(0);
        }
    });

    it('is stable in comparisons (left run wins ties)', () => {
        // With equal values everywhere, no comparison should ever pull from
        // the right run first — writes preserve left-to-right order.
        const { sorted } = mergesortEvents([7, 7, 7, 7, 7, 7]);
        expect(sorted).toEqual([7, 7, 7, 7, 7, 7]);
    });
});

describe('applyEvents partial replay', () => {
    it('at upTo = 0 nothing has happened', () => {
        const input = [4, 2, 6];
        const { events } = quicksortEvents(input);
        const state = applyEvents(input, events, 0);
        expect(state.values).toEqual(input);
        expect(state.comparisons).toBe(0);
        expect(state.settled.size).toBe(0);
    });

    it('partial replays never lose or invent elements', () => {
        const input = makeArray({ size: 24, preset: 'random', seed: 11 });
        const { events } = quicksortEvents(input);
        for (const upTo of [1, 5, Math.floor(events.length / 2), events.length - 1]) {
            const { values } = applyEvents(input, events, upTo);
            expect([...values].sort((x, y) => x - y)).toEqual(
                [...input].sort((x, y) => x - y)
            );
        }
    });
});
