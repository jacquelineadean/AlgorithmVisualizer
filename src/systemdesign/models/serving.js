// Serving arithmetic for the Fundamentals labs: KV cache per token from a
// model's config, how many streams fit next to the weights, how long one
// decode step takes, and Little's law from users to GPUs. Pure functions;
// the labs only format what these return.
//
// Simplified model, stated on every lab that uses it: 16-bit weights and KV
// cache, 90% of GPU memory usable, 80% of peak memory bandwidth and 50% of
// dense peak FLOPs achieved, tensor parallelism sized so weights take at
// most half a GPU's usable memory, no prefix sharing.

export const GiB = 2 ** 30;
export const MiB = 2 ** 20;

// Shapes from each model's config.json (hidden layers, KV heads, head dim).
export const SERVING_MODELS = {
    l8: { id: 'l8', name: 'Llama 3 8B', params: 8.03e9, layers: 32, kvHeads: 8, headDim: 128 },
    l13: { id: 'l13', name: 'Llama 2 13B', params: 13.0e9, layers: 40, kvHeads: 40, headDim: 128 },
    l70: { id: 'l70', name: 'Llama 3 70B', params: 70.6e9, layers: 80, kvHeads: 8, headDim: 128 },
};

export const SERVING_GPUS = {
    h100: { id: 'h100', name: 'H100 SXM 80 GB', mem: 80 * GiB, bw: 3.35e12, flops: 989e12 },
    a100: { id: 'a100', name: 'A100 SXM 80 GB', mem: 80 * GiB, bw: 2.039e12, flops: 312e12 },
};

export const EFFICIENCY = { mem: 0.9, bw: 0.8, flops: 0.5 };

// Keys and values, per layer, per KV head, at 2 bytes each.
export const kvBytesPerToken = (m, bytes = 2) => 2 * m.layers * m.kvHeads * m.headDim * bytes;
export const weightBytes = (m, bytes = 2) => m.params * bytes;

export function serving(model, gpu, ctxTokens) {
    const w = weightBytes(model);
    let tp = 1;
    while (w / tp > 0.5 * EFFICIENCY.mem * gpu.mem && tp < 8) tp *= 2;
    const kvCap = tp * EFFICIENCY.mem * gpu.mem - w;
    const perSeq = ctxTokens * kvBytesPerToken(model);
    const maxByMemory = Math.max(0, Math.floor(kvCap / perSeq));
    const memTime = (B) => (w + B * perSeq) / (tp * gpu.bw * EFFICIENCY.bw);
    const computeTime = (B) => (2 * model.params * B) / (tp * gpu.flops * EFFICIENCY.flops);
    const stepTime = (B) => Math.max(memTime(B), computeTime(B));
    return { tp, weights: w, kvCap, perSeq, maxByMemory, memTime, computeTime, stepTime };
}

// From the requirements checklist to a fleet: Little's law turns a peak
// arrival rate into streams in flight; KV memory and the speed target turn
// streams into replicas.
export function estimateFleet({ model, gpu, users, requestsPerUser, peakFactor, promptTokens, outputTokens, tokensPerSecond }) {
    const avgRate = (users * requestsPerUser) / 86400;
    const peakRate = avgRate * peakFactor;
    const ctx = promptTokens + outputTokens / 2;
    const s = serving(model, gpu, ctx);
    const prefill = (2 * model.params * promptTokens) / (s.tp * gpu.flops * EFFICIENCY.flops);
    const timeInSystem = prefill + outputTokens / tokensPerSecond;
    const concurrency = peakRate * timeInSystem;
    const byBandwidth = Math.floor(((s.tp * gpu.bw * EFFICIENCY.bw) / tokensPerSecond - s.weights) / s.perSeq);
    const byCompute = Math.floor((s.tp * gpu.flops * EFFICIENCY.flops) / tokensPerSecond / (2 * model.params));
    const bySpeed = Math.min(byBandwidth, byCompute);
    const perReplica = Math.min(s.maxByMemory, bySpeed);
    const ok = perReplica >= 1;
    let limiter = null;
    if (ok) {
        if (perReplica === s.maxByMemory) limiter = 'KV cache memory';
        else if (byBandwidth <= byCompute) limiter = 'memory bandwidth at this speed';
        else limiter = 'compute at this speed';
    }
    const replicas = ok ? Math.ceil(concurrency / perReplica) : 0;
    const gpus = replicas * s.tp;
    return {
        ...s,
        ctx,
        peakRate,
        prefill,
        timeInSystem,
        concurrency,
        bySpeed: Math.max(0, bySpeed),
        perReplica,
        ok,
        limiter,
        replicas,
        gpus,
        servers: Math.ceil(gpus / 8),
        step: ok ? s.stepTime(perReplica) : 0,
    };
}

// One point on the batching curve: total and per-stream tokens/s.
export function batchPoint(model, gpu, ctxTokens, batch) {
    const s = serving(model, gpu, ctxTokens);
    const step = s.stepTime(batch);
    return {
        step,
        total: batch / step,
        perStream: 1 / step,
        bound: s.memTime(batch) >= s.computeTime(batch) ? 'memory bandwidth' : 'compute',
        fits: batch <= s.maxByMemory,
        maxByMemory: s.maxByMemory,
        tp: s.tp,
        bytesRead: s.weights + batch * s.perSeq,
    };
}

export function formatBytes(b) {
    if (b >= GiB) return `${(b / GiB).toFixed(b >= 100 * GiB ? 0 : 1)} GiB`;
    if (b >= MiB) return `${(b / MiB).toFixed(b >= 100 * MiB ? 0 : 1)} MiB`;
    return `${Math.round(b / 1024)} KiB`;
}

export const fmtInt = (n, digits = 0) =>
    Number(n).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
