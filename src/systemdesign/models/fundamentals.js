// Small pure models behind the Fundamentals labs: quorum overlap, the
// latency ladder, the breadth-versus-depth clock and the PagedAttention
// memory layouts. Each is tested in fundamentals.test.js.

import { mulberry32 } from '../../visualizations/mathlib/random';
import { EFFICIENCY, SERVING_GPUS, SERVING_MODELS, kvBytesPerToken, weightBytes } from './serving';

/* --- Quorums: R + W > N ------------------------------------------------------ */

export function quorum(n, w, r) {
    const W = Math.min(w, n);
    const R = Math.min(r, n);
    const overlap = R + W - n;
    return {
        n,
        w: W,
        r: R,
        overlap,
        readsSeeLatestWrite: overlap >= 1,
        writesSurviveDown: n - W,
        readsSurviveDown: n - R,
    };
}

export const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/* --- Latency ladder ---------------------------------------------------------- */

// Approximate costs, after the widely shared table credited to Jeff Dean and
// Peter Norvig (about 2012). Kind colors the bar: memory, disk, network.
export const LATENCY_LADDER = [
    { seconds: 0.5e-9, label: 'L1 cache reference', use: 'CPU cache hit', kind: 'mem' },
    { seconds: 100e-9, label: 'Main memory reference', use: 'in-process cache or hash map', kind: 'mem' },
    { seconds: 150e-6, label: 'Read 4 KB at random from SSD', use: 'key-value read that misses RAM', kind: 'disk' },
    { seconds: 250e-6, label: 'Read 1 MB sequentially from memory', use: 'scan a cached result set', kind: 'mem' },
    { seconds: 500e-6, label: 'Round trip within one datacenter', use: 'network cache hit, same-zone RPC', kind: 'net' },
    { seconds: 1e-3, label: 'Read 1 MB sequentially from SSD', use: 'scan a log segment or SSTable', kind: 'disk' },
    { seconds: 10e-3, label: 'Disk seek', use: 'random read on a spinning disk', kind: 'disk' },
    { seconds: 20e-3, label: 'Read 1 MB sequentially from disk', use: 'sequential log on a spinning disk', kind: 'disk' },
    { seconds: 150e-3, label: 'California to Netherlands and back', use: 'synchronous cross-region replication', kind: 'net' },
];

export const ladderRatio = (a, b) => LATENCY_LADDER.find((x) => x.label === b).seconds / LATENCY_LADDER.find((x) => x.label === a).seconds;

export function formatDuration(s) {
    if (s < 1e-6) return `${+(s * 1e9).toFixed(1)} ns`;
    if (s < 1e-3) return `${+(s * 1e6).toFixed(0)} µs`;
    if (s < 1) return `${+(s * 1e3).toFixed(0)} ms`;
    return `${s.toFixed(0)} s`;
}

// Stretch 1 ns to 1 s and say the result in human units.
export function formatHumanScale(seconds) {
    const units = [
        [3.156e7, 'years'],
        [2.63e6, 'months'],
        [86400, 'days'],
        [3600, 'hours'],
        [60, 'min'],
        [1, 's'],
    ];
    for (const [d, name] of units) {
        if (seconds >= d) {
            const v = seconds / d;
            return `${v < 10 ? v.toFixed(1) : v.toFixed(0)} ${name}`;
        }
    }
    return `${seconds.toFixed(1)} s`;
}

/* --- Breadth against depth --------------------------------------------------- */

// A toy model of a 30-minute design block: each component named costs 1.5
// minutes; each layer of depth past the first costs 3 more; what is left
// goes to two deep dives.
export function breadthClock(components, { minutes = 30, perComponent = 1.5, perLayer = 3 } = {}) {
    const remaining = Math.max(0, minutes - perComponent * components);
    const perDive = remaining / 2;
    const depth = Math.min(5, 1 + Math.floor(perDive / perLayer));
    return { remaining, perDive, depth };
}

/* --- PagedAttention memory layouts ------------------------------------------ */

// One H100 serving Llama 3 8B under the serving model's assumptions. Every
// request carries the same 1,000-token system prompt plus 48 to 1,048
// tokens of its own, so none exceeds 2,048.
export const KV_BLOCK_TOKENS = 16;
export const KV_SYSTEM_PROMPT = 1000;
export const KV_RESERVE_TOKENS = 2048;

export function kvGeometry() {
    const model = SERVING_MODELS.l8;
    const gpu = SERVING_GPUS.h100;
    const tokens = Math.floor((EFFICIENCY.mem * gpu.mem - weightBytes(model)) / kvBytesPerToken(model));
    return { tokens, blocks: Math.floor(tokens / KV_BLOCK_TOKENS) };
}

const FREE = -1;
const WASTE = -2;
const SHARED = -3;
export const KV_CELL = { FREE, WASTE, SHARED };

let layoutCache = null;

export function kvLayouts() {
    if (layoutCache) return layoutCache;
    const { blocks } = kvGeometry();
    const rand = mulberry32(7);
    const own = Array.from({ length: 4000 }, () => 48 + Math.floor(rand() * 1001));
    const order = (() => {
        const r = mulberry32(11);
        const a = Array.from({ length: blocks }, (_, i) => i);
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(r() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    })();
    const sharedFull = Math.floor(KV_SYSTEM_PROMPT / KV_BLOCK_TOKENS);
    const sharedTail = KV_SYSTEM_PROMPT - sharedFull * KV_BLOCK_TOKENS;

    const layout = (mode) => {
        const cell = new Int32Array(blocks).fill(FREE);
        let n = 0;
        let stored = 0;
        let used = 0;
        let waste = 0;
        if (mode === 'reserve') {
            const per = KV_RESERVE_TOKENS / KV_BLOCK_TOKENS;
            for (; (n + 1) * per <= blocks && n < own.length; n++) {
                const total = KV_SYSTEM_PROMPT + own[n];
                const need = Math.ceil(total / KV_BLOCK_TOKENS);
                for (let b = 0; b < per; b++) cell[n * per + b] = b < need ? n : WASTE;
                stored += total;
                used += per;
                waste += per - need;
            }
        } else {
            let p = 0;
            if (mode === 'shared') {
                for (let b = 0; b < sharedFull; b++) cell[order[p++]] = SHARED;
                stored += sharedFull * KV_BLOCK_TOKENS;
                used += sharedFull;
            }
            for (; n < own.length; n++) {
                const mine = mode === 'shared' ? sharedTail + own[n] : KV_SYSTEM_PROMPT + own[n];
                const need = Math.ceil(mine / KV_BLOCK_TOKENS);
                if (p + need > blocks) break;
                for (let b = 0; b < need; b++) cell[order[p++]] = n;
                stored += mine;
                used += need;
            }
        }
        return { mode, cell, requests: n, utilization: stored / (used * KV_BLOCK_TOKENS), wastedBlocks: waste, usedBlocks: used };
    };
    layoutCache = {
        blocks,
        sharedFull,
        sharedTail,
        reserve: layout('reserve'),
        paged: layout('paged'),
        shared: layout('shared'),
    };
    return layoutCache;
}
