// Pathfinding model: a fixed unit-cost grid, three event-recording search
// algorithms (Dijkstra, A*, BFS), and helpers the stage folds with.
// Pure and UI-free. Replaces the Phase-0 engine/ + algorithms/ modules —
// searches now emit the Phase 2b stream-event vocabulary:
//   {t:'visit', k}   node settled (in settle order)
//   {t:'path', k}    shortest-path node, start → finish

export const ROWS = 20;
export const COLS = 50;
export const START = { r: 10, c: 15 };
export const FINISH = { r: 10, c: 35 };

export const keyOf = (r, c) => r * COLS + c;
export const rcOf = (k) => ({ r: Math.floor(k / COLS), c: k % COLS });
export const START_KEY = keyOf(START.r, START.c);
export const FINISH_KEY = keyOf(FINISH.r, FINISH.c);

const neighborsOf = (k) => {
    const { r, c } = rcOf(k);
    const out = [];
    if (r > 0) out.push(k - COLS);
    if (c < COLS - 1) out.push(k + 1);
    if (r < ROWS - 1) out.push(k + COLS);
    if (c > 0) out.push(k - 1);
    return out;
};

export const manhattan = (k) => {
    const { r, c } = rcOf(k);
    return Math.abs(r - FINISH.r) + Math.abs(c - FINISH.c);
};

// Small binary min-heap on [priority, tieBreak, key].
class Heap {
    constructor() {
        this.items = [];
    }
    get size() {
        return this.items.length;
    }
    push(item) {
        const a = this.items;
        a.push(item);
        let i = a.length - 1;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.less(a[i], a[parent])) {
                [a[i], a[parent]] = [a[parent], a[i]];
                i = parent;
            } else break;
        }
    }
    pop() {
        const a = this.items;
        const top = a[0];
        const last = a.pop();
        if (a.length > 0) {
            a[0] = last;
            let i = 0;
            for (;;) {
                const l = 2 * i + 1;
                const r = l + 1;
                let m = i;
                if (l < a.length && this.less(a[l], a[m])) m = l;
                if (r < a.length && this.less(a[r], a[m])) m = r;
                if (m === i) break;
                [a[i], a[m]] = [a[m], a[i]];
                i = m;
            }
        }
        return top;
    }
    less(x, y) {
        return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1];
    }
}

// Shared best-first search: priority = g (Dijkstra) or g + h (A*).
function bestFirst(walls, useHeuristic) {
    const dist = new Map([[START_KEY, 0]]);
    const prev = new Map();
    const settled = new Set();
    const events = [];
    const heap = new Heap();
    let counter = 0;
    heap.push([useHeuristic ? manhattan(START_KEY) : 0, counter++, START_KEY]);

    while (heap.size > 0) {
        const [, , k] = heap.pop();
        if (settled.has(k)) continue;
        settled.add(k);
        events.push({ t: 'visit', k });
        if (k === FINISH_KEY) break;
        const g = dist.get(k);
        for (const nk of neighborsOf(k)) {
            if (walls.has(nk) || settled.has(nk)) continue;
            const ng = g + 1;
            if (ng < (dist.get(nk) ?? Infinity)) {
                dist.set(nk, ng);
                prev.set(nk, k);
                const priority = useHeuristic ? ng + manhattan(nk) : ng;
                heap.push([priority, counter++, nk]);
            }
        }
    }
    return finish(events, prev, settled);
}

function breadthFirst(walls) {
    const prev = new Map();
    const seen = new Set([START_KEY]);
    const events = [];
    const queue = [START_KEY];
    let head = 0;
    while (head < queue.length) {
        const k = queue[head++];
        events.push({ t: 'visit', k });
        if (k === FINISH_KEY) break;
        for (const nk of neighborsOf(k)) {
            if (walls.has(nk) || seen.has(nk)) continue;
            seen.add(nk);
            prev.set(nk, k);
            queue.push(nk);
        }
    }
    return finish(events, prev, new Set(queue.slice(0, head)));
}

function finish(events, prev, settled) {
    const found = settled.has(FINISH_KEY);
    const path = [];
    if (found) {
        let k = FINISH_KEY;
        while (k !== undefined) {
            path.unshift(k);
            k = prev.get(k);
        }
        for (const k of path) events.push({ t: 'path', k });
    }
    return {
        events,
        visitedCount: events.filter((e) => e.t === 'visit').length,
        pathLength: found ? path.length : 0,
        found,
        searchEnd: events.length - (found ? path.length : 0),
    };
}

export const ALGORITHMS = {
    dijkstra: { name: "Dijkstra's algorithm", run: (walls) => bestFirst(walls, false) },
    astar: { name: 'A* search', run: (walls) => bestFirst(walls, true) },
    bfs: { name: 'Breadth-first search', run: (walls) => breadthFirst(walls) },
};

export function searchEvents({ algorithm, walls }) {
    const impl = ALGORITHMS[algorithm];
    if (!impl) throw new Error(`Unknown algorithm "${algorithm}".`);
    return impl.run(walls);
}

// Fold events[0 … upTo) into a drawable state.
export function applyGridEvents(events, upTo) {
    const visited = new Set();
    const path = new Set();
    let head = null;
    const limit = Math.min(upTo, events.length);
    for (let i = 0; i < limit; i++) {
        const e = events[i];
        if (e.t === 'visit') {
            visited.add(e.k);
            head = e.k;
        } else if (e.t === 'path') {
            path.add(e.k);
            head = null;
        }
    }
    return { visited, path, head };
}

// Deterministic wall scatter (never on start/finish), for the controls.
import { mulberry32 } from '../mathlib/random';

export function scatterWalls(seed, density = 0.28) {
    const rand = mulberry32(seed);
    const walls = new Set();
    for (let k = 0; k < ROWS * COLS; k++) {
        if (k === START_KEY || k === FINISH_KEY) continue;
        if (rand() < density) walls.add(k);
    }
    return walls;
}
