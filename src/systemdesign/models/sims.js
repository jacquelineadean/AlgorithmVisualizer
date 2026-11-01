// Seeded, deterministic simulations for the mechanism labs: static against
// continuous batching, prefill against decode on one or two pools, launch
// overhead, attention-score traffic, a token-metered gateway and a prompt
// template deploy. Timings are illustrative (the labs say so); what the
// tests pin is the direction of each effect.

import { mulberry32 } from '../../visualizations/mathlib/random';

/* --- Static against continuous batching (L4) ------------------------------------ */

export const BATCH_SLOTS = 6;
export const BATCH_MAX_LEN = 40;

export function requestLengths(count = 400, seed = 5) {
    const r = mulberry32(seed);
    return Array.from({ length: count }, () => 4 + Math.round(Math.pow(r(), 1.6) * (BATCH_MAX_LEN - 4)));
}

// Advance both schedulers `steps` decode steps over the same queue.
export function batchRace(steps, lengths = requestLengths()) {
    const make = (continuous) => {
        const s = { continuous, next: 0, slots: [], busy: 0, total: 0, done: 0 };
        for (let i = 0; i < BATCH_SLOTS; i++) s.slots.push({ len: lengths[s.next++], progress: 0 });
        return s;
    };
    const step = (s) => {
        for (const slot of s.slots) {
            s.total++;
            if (slot.progress < slot.len) {
                slot.progress++;
                s.busy++;
                if (slot.progress >= slot.len) s.done++;
            }
        }
        if (s.continuous) {
            s.slots = s.slots.map((sl) => (sl.progress >= sl.len ? { len: lengths[s.next++ % lengths.length], progress: 0 } : sl));
        } else if (s.slots.every((sl) => sl.progress >= sl.len)) {
            s.slots = s.slots.map(() => ({ len: lengths[s.next++ % lengths.length], progress: 0 }));
        }
    };
    const sims = [make(false), make(true)];
    for (let t = 0; t < steps; t++) sims.forEach(step);
    return sims.map((s) => ({
        continuous: s.continuous,
        done: s.done,
        utilization: s.total ? s.busy / s.total : 0,
        slots: s.slots.map((sl) => ({ ...sl })),
    }));
}

/* --- Prefill against decode (L3) ------------------------------------------------- */

// Time is counted in decode steps. Long prompts arrive every 18 to 28 steps
// and need 6 to 10 steps of prefill.
export const PD_MODES = ['one-pool', 'chunked', 'split'];

export function prefillDecode(mode, horizon = 200, seed = 11) {
    const r = mulberry32(seed);
    const arrivals = [];
    for (let at = 3; at < horizon; at += 18 + r() * 10) arrivals.push({ at, len: 6 + Math.round(r() * 4) });
    const lanes = mode === 'split' ? [{ name: 'Prefill pool', blocks: [] }, { name: 'Decode pool', blocks: [] }] : [{ name: 'One GPU pool', blocks: [] }];
    const tokens = [];
    let prefills = 0;
    if (mode === 'split') {
        let t = 0;
        for (const a of arrivals) {
            const start = Math.max(t, a.at);
            lanes[0].blocks.push({ start, len: a.len, kind: 'prefill' });
            t = start + a.len;
            prefills++;
        }
        for (let s = 0; s < horizon; s++) {
            lanes[1].blocks.push({ start: s, len: 1, kind: 'decode' });
            tokens.push(s + 1);
        }
    } else {
        const lane = lanes[0];
        const pending = arrivals.map((a) => ({ ...a, remaining: a.len }));
        let t = 0;
        while (t < horizon) {
            const ready = pending.find((p) => p.at <= t && p.remaining > 0);
            if (ready && mode === 'one-pool') {
                lane.blocks.push({ start: t, len: ready.len, kind: 'prefill' });
                ready.remaining = 0;
                t += ready.len;
                prefills++;
            } else if (ready && mode === 'chunked') {
                lane.blocks.push({ start: t, len: 1, kind: 'decode' });
                tokens.push(t + 1);
                const chunk = Math.min(ready.remaining, ready.len / 5);
                lane.blocks.push({ start: t + 1, len: 0.5, kind: 'prefill' });
                ready.remaining -= chunk;
                if (ready.remaining <= 1e-6) {
                    ready.remaining = 0;
                    prefills++;
                }
                t += 1.5;
            } else {
                lane.blocks.push({ start: t, len: 1, kind: 'decode' });
                tokens.push(t + 1);
                t += 1;
            }
        }
    }
    let longestGap = 1;
    for (let i = 1; i < tokens.length; i++) longestGap = Math.max(longestGap, tokens[i] - tokens[i - 1]);
    return { lanes, tokens, longestGap, prefills, pools: lanes.length };
}

/* --- Launch overhead (L5) ---------------------------------------------------------- */

export const LAUNCH_MODES = [
    { id: 'eager', name: 'Eager PyTorch', kernels: 8, kernelTime: 2, launches: 8 },
    { id: 'compiled', name: 'torch.compile', kernels: 3, kernelTime: 5, launches: 3 },
    { id: 'graph', name: 'Compiled + CUDA graph', kernels: 3, kernelTime: 5, launches: 1 },
];
export const LAUNCH_COST = 6;

export function launchTimeline(modeId) {
    const m = LAUNCH_MODES.find((x) => x.id === modeId);
    const blocks = [];
    let cpu = 0;
    let gpu = 0;
    let work = 0;
    if (m.launches === 1) {
        blocks.push({ lane: 'cpu', start: 0, end: LAUNCH_COST, kind: 'launch' });
        gpu = LAUNCH_COST;
        for (let i = 0; i < m.kernels; i++) {
            blocks.push({ lane: 'gpu', start: gpu, end: gpu + m.kernelTime, kind: 'kernel' });
            gpu += m.kernelTime;
            work += m.kernelTime;
        }
    } else {
        for (let j = 0; j < m.kernels; j++) {
            blocks.push({ lane: 'cpu', start: cpu, end: cpu + LAUNCH_COST, kind: 'launch' });
            cpu += LAUNCH_COST;
            const start = Math.max(cpu, gpu);
            if (start > gpu) blocks.push({ lane: 'gpu', start: gpu, end: start, kind: 'idle' });
            blocks.push({ lane: 'gpu', start, end: start + m.kernelTime, kind: 'kernel' });
            gpu = start + m.kernelTime;
            work += m.kernelTime;
        }
    }
    return { mode: m, blocks, end: gpu, busy: work / gpu, launches: m.launches };
}

/* --- Attention score traffic (L6) ---------------------------------------------- */

// With the prompt split into n × n tiles of scores, standard attention
// writes S, reads it for the softmax, writes P and reads it again: four HBM
// trips per tile. FlashAttention keeps every tile on chip.
export const attentionTraffic = (tilesPerSide) => ({ standard: 4 * tilesPerSide * tilesPerSide, flash: 0 });

/* --- Token-metered gateway (L2) --------------------------------------------------- */

// Requests arrive at `rate` per second with sizes between 0.2 and 1.8
// token units. The gateway refills a token budget each second, routes a
// share to the small model and retries once on a fallback provider when
// the large model is down.
export function gatewaySim({ rate, smallShare, largeDown, seconds = 60, ratio = 12, seed = 7, refill = 0.55, costPerUnit = 0.09 }) {
    const r = mulberry32(seed);
    const dt = 0.05;
    let bucket = 1;
    let acc = 0;
    const queue = [];
    let sent = 0;
    let admitted = 0;
    let retries = 0;
    let spend = 0;
    let largeSpend = 0;
    let maxWaiting = 0;
    const series = [];
    for (let t = 0; t < seconds; t += dt) {
        acc += dt * rate;
        while (acc >= 1) {
            acc -= 1;
            queue.push(0.2 + r() * r() * 1.6);
            sent++;
        }
        bucket = Math.min(1, bucket + dt * refill);
        while (queue.length && bucket >= queue[0] * costPerUnit) {
            const tok = queue.shift();
            bucket -= tok * costPerUnit;
            admitted++;
            const small = r() * 100 < smallShare;
            if (small) {
                spend += tok;
            } else if (largeDown) {
                retries++;
                // The failed attempt bills its input; the fallback bills in full.
                spend += tok * ratio * 0.5 + tok * ratio;
                largeSpend += tok * ratio * 0.5;
            } else {
                spend += tok * ratio;
                largeSpend += tok * ratio;
            }
        }
        maxWaiting = Math.max(maxWaiting, queue.length);
        if (Math.abs(t - Math.round(t)) < dt / 2) series.push({ t: Math.round(t), waiting: queue.length, bucket });
    }
    return {
        sent,
        admitted,
        waiting: queue.length,
        maxWaiting,
        retries,
        spendPerMinute: (spend / seconds) * 60,
        largeShare: spend ? largeSpend / spend : 0,
        series,
    };
}

/* --- A prompt template deploy (failures topic) ----------------------------------- */

// Two health signals that never leave green, and two that move: prefix
// cache hit rate and time to first token. Events are [second, 'deploy' |
// 'rollback'].
export function deploySeries(events, seconds = 60, seed = 4) {
    const r = mulberry32(seed);
    let hit = 0.82;
    let ttft = 0.22;
    let bad = false;
    const out = [];
    const dt = 0.5;
    for (let t = 0; t <= seconds; t += dt) {
        for (const [at, kind] of events) if (Math.abs(at - t) < dt / 2) bad = kind === 'deploy';
        const hitTarget = bad ? 0.06 : 0.82;
        const ttftTarget = bad ? 0.78 : 0.22;
        hit += (hitTarget - hit) * dt * 0.9;
        ttft += (ttftTarget - ttft) * dt * 0.7;
        out.push({
            t,
            hit: Math.max(0, Math.min(1, hit + (r() - 0.5) * 0.05)),
            ttft: Math.max(0, Math.min(1, ttft + (r() - 0.5) * 0.05)),
            errors: 0,
            http: 'OK',
        });
    }
    return out;
}
