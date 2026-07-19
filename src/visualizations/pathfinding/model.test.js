import { describe, expect, it } from 'vitest';
import {
    ALGORITHMS,
    applyGridEvents,
    COLS,
    FINISH,
    keyOf,
    manhattan,
    ROWS,
    scatterWalls,
    searchEvents,
    START,
    START_KEY,
    FINISH_KEY,
} from './model';

const IDS = Object.keys(ALGORITHMS);
const openGrid = new Set();

// A full column of walls between start and finish (no way around).
const blockingWall = new Set(
    Array.from({ length: ROWS }, (_, r) => keyOf(r, 25))
);

describe('searchEvents', () => {
    it('all three algorithms find the optimal path on an open grid', () => {
        // Manhattan distance start→finish is 20, so the path has 21 nodes.
        const expected = Math.abs(FINISH.c - START.c) + Math.abs(FINISH.r - START.r) + 1;
        for (const algorithm of IDS) {
            const result = searchEvents({ algorithm, walls: openGrid });
            expect(result.found, algorithm).toBe(true);
            expect(result.pathLength, algorithm).toBe(expected);
        }
    });

    it('BFS, Dijkstra, and A* agree on path length through scattered walls', () => {
        for (const seed of [3, 7, 11]) {
            const walls = scatterWalls(seed, 0.25);
            const lengths = IDS.map(
                (algorithm) => searchEvents({ algorithm, walls }).pathLength
            );
            // Unit costs: all three are optimal, so lengths must match
            // (0 for all if unreachable).
            expect(new Set(lengths).size, `seed ${seed}`).toBe(1);
        }
    });

    it('A* settles no more nodes than Dijkstra on an open grid', () => {
        const dijkstra = searchEvents({ algorithm: 'dijkstra', walls: openGrid });
        const astar = searchEvents({ algorithm: 'astar', walls: openGrid });
        expect(astar.visitedCount).toBeLessThanOrEqual(dijkstra.visitedCount);
        expect(astar.visitedCount).toBeLessThan(dijkstra.visitedCount); // strictly, here
    });

    it('reports not-found across a blocking wall', () => {
        for (const algorithm of IDS) {
            const result = searchEvents({ algorithm, walls: blockingWall });
            expect(result.found).toBe(false);
            expect(result.pathLength).toBe(0);
            expect(result.events.every((e) => e.t === 'visit')).toBe(true);
        }
    });

    it('path events run start → finish and chain by unit steps', () => {
        const { events, searchEnd } = searchEvents({ algorithm: 'astar', walls: openGrid });
        const path = events.slice(searchEnd).map((e) => e.k);
        expect(path[0]).toBe(START_KEY);
        expect(path.at(-1)).toBe(FINISH_KEY);
        for (let i = 1; i < path.length; i++) {
            const diff = Math.abs(path[i] - path[i - 1]);
            expect(diff === 1 || diff === COLS).toBe(true);
        }
    });
});

describe('applyGridEvents', () => {
    it('folds visits and path incrementally', () => {
        const { events, searchEnd } = searchEvents({ algorithm: 'bfs', walls: openGrid });
        const mid = applyGridEvents(events, Math.floor(searchEnd / 2));
        expect(mid.visited.size).toBe(Math.floor(searchEnd / 2));
        expect(mid.path.size).toBe(0);
        expect(mid.head).not.toBeNull();
        const full = applyGridEvents(events, events.length);
        expect(full.path.size).toBeGreaterThan(0);
    });
});

describe('helpers', () => {
    it('manhattan is zero at the finish and positive elsewhere', () => {
        expect(manhattan(FINISH_KEY)).toBe(0);
        expect(manhattan(START_KEY)).toBe(20);
    });

    it('scatterWalls is deterministic and never covers the endpoints', () => {
        const a = scatterWalls(5);
        const b = scatterWalls(5);
        expect([...a].sort()).toEqual([...b].sort());
        expect(a.has(START_KEY)).toBe(false);
        expect(a.has(FINISH_KEY)).toBe(false);
    });
});
