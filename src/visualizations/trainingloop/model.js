// Pure model behind the training-loop map: the FLOP, memory, and schedule
// arithmetic of one optimizer step, scaled up to a whole run. Everything the
// map states as a number comes from here.

export const RUNS = [
    {
        id: 'gpt2-xl',
        label: 'GPT-2 XL (1.5B)',
        params: 1.5e9,
        tokens: 4e10,
        batchTokens: 5e5,
        note: 'A 2019-scale run: undertrained by today’s compute-optimal standards.',
    },
    {
        id: 'llama-7b',
        label: '7B on 1.4T tokens',
        params: 6.74e9,
        tokens: 1.4e12,
        batchTokens: 4e6,
        note: 'Trained far past compute-optimal on purpose — inference cost is paid forever.',
    },
    {
        id: 'chinchilla-70b',
        label: '70B, compute-optimal',
        params: 7e10,
        tokens: 1.4e12,
        batchTokens: 6e6,
        note: 'The Chinchilla point: about 20 tokens per parameter.',
    },
];

export const CLUSTERS = [
    { id: '8xa100', label: '8 × A100', devices: 8, tflops: 312, memory: 80 * 1024 ** 3 },
    { id: '256xa100', label: '256 × A100', devices: 256, tflops: 312, memory: 80 * 1024 ** 3 },
    { id: '1024xh100', label: '1,024 × H100', devices: 1024, tflops: 989, memory: 80 * 1024 ** 3 },
];

export const getRun = (id) => RUNS.find((run) => run.id === id) ?? RUNS[0];
export const getCluster = (id) => CLUSTERS.find((cluster) => cluster.id === id) ?? CLUSTERS[0];

// Kaplan et al.'s accounting: a forward pass is ~2 FLOPs per parameter per
// token, and the backward pass is about twice the forward — 6ND in total.
export const trainingFlops = (params, tokens) => 6 * params * tokens;
export const stepFlops = (params, batchTokens) => 6 * params * batchTokens;

// Hoffmann et al.: for a fixed compute budget, parameters and tokens should
// scale together — roughly 20 tokens per parameter.
export const TOKENS_PER_PARAM = 20;
export const chinchillaTokens = (params) => TOKENS_PER_PARAM * params;
export const chinchillaParams = (tokens) => tokens / TOKENS_PER_PARAM;

// Mixed-precision AdamW state, per parameter:
//   bf16 weights (2) + bf16 gradients (2) + fp32 master (4)
//   + fp32 first moment (4) + fp32 second moment (4) = 16 bytes.
export const OPTIMIZER_BYTES = {
    weights: 2,
    gradients: 2,
    master: 4,
    momentum: 4,
    variance: 4,
};

export const stateBytes = (params) =>
    params * Object.values(OPTIMIZER_BYTES).reduce((a, b) => a + b, 0);

export const stateBreakdown = (params) =>
    Object.entries(OPTIMIZER_BYTES).map(([label, perParam]) => ({
        label,
        bytes: params * perParam,
    }));

// ZeRO shards the optimizer state (stage 1), gradients (stage 2), and
// parameters (stage 3) across data-parallel ranks.
export function zeroBytes(params, shards, stage) {
    const { weights, gradients, master, momentum, variance } = OPTIMIZER_BYTES;
    const optimizer = (master + momentum + variance) * params;
    const grads = gradients * params;
    const weightBytes = weights * params;
    if (stage >= 3) return (optimizer + grads + weightBytes) / shards;
    if (stage === 2) return weightBytes + (optimizer + grads) / shards;
    if (stage === 1) return weightBytes + grads + optimizer / shards;
    return weightBytes + grads + optimizer;
}

// Model FLOPs utilization: the fraction of peak a real run sustains. 40–55%
// is typical for well-tuned large-scale training.
export function runTime(run, cluster, mfu = 0.45) {
    const flops = trainingFlops(run.params, run.tokens);
    const seconds = flops / (cluster.devices * cluster.tflops * 1e12 * mfu);
    return { flops, seconds, days: seconds / 86400, gpuHours: (seconds * cluster.devices) / 3600 };
}

export const stepsInRun = (run) => Math.round(run.tokens / run.batchTokens);

// Linear warmup then cosine decay — the schedule almost every large run uses.
export function learningRate(step, { total, warmup, peak = 3e-4, floor = 0.1 }) {
    if (step < warmup) return (peak * step) / warmup;
    const progress = Math.min(1, (step - warmup) / Math.max(1, total - warmup));
    return peak * (floor + (1 - floor) * 0.5 * (1 + Math.cos(Math.PI * progress)));
}

export const bytesLabel = (value) => {
    if (value >= 1024 ** 4) return `${(value / 1024 ** 4).toFixed(2)} TiB`;
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`;
    if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
    return `${(value / 1024).toFixed(1)} KiB`;
};

export const human = (value) => {
    if (value >= 1e21) return `${(value / 1e21).toFixed(2)} × 10²¹`;
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)} T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M`;
    return value.toLocaleString();
};
