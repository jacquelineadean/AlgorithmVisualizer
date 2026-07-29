// Pure model behind the LLM inference map. The point of the page is that
// prefill and decode are limited by different resources — one by
// arithmetic, one by memory bandwidth — so everything here is computed from
// a model configuration and a published accelerator spec rather than
// asserted.

export const MODELS = [
    {
        id: '7b',
        label: '7B (Llama-style)',
        params: 6.74e9,
        layers: 32,
        dModel: 4096,
        heads: 32,
        kvHeads: 32,
        context: 4096,
        note: 'Multi-head attention: every head keeps its own K and V.',
    },
    {
        id: '70b-gqa',
        label: '70B with grouped-query attention',
        params: 6.9e10,
        layers: 80,
        dModel: 8192,
        heads: 64,
        kvHeads: 8,
        context: 8192,
        note: 'Eight KV heads shared across 64 query heads — the cache shrinks eightfold.',
    },
];

export const ACCELERATORS = [
    {
        id: 'a100',
        label: 'A100 80GB SXM',
        tflops: 312, // bf16 dense tensor-core peak
        bandwidth: 2039e9, // bytes/s of HBM2e
        memory: 80 * 1024 ** 3,
    },
    {
        id: 'h100',
        label: 'H100 80GB SXM',
        tflops: 989, // bf16 dense tensor-core peak
        bandwidth: 3350e9, // bytes/s of HBM3
        memory: 80 * 1024 ** 3,
    },
];

export const getModel = (id) => MODELS.find((model) => model.id === id) ?? MODELS[0];
export const getAccelerator = (id) =>
    ACCELERATORS.find((device) => device.id === id) ?? ACCELERATORS[0];

const BYTES = 2; // bf16 weights and cache

export const weightBytes = (model) => model.params * BYTES;

// One token's KV entry across every layer. Grouped-query attention keeps
// kvHeads of the heads' worth of K and V, which is the whole saving.
export const kvBytesPerToken = (model) =>
    2 * model.layers * (model.dModel * (model.kvHeads / model.heads)) * BYTES;

export const kvBytes = (model, tokens, batch = 1) =>
    kvBytesPerToken(model) * tokens * batch;

// Prefill reads the prompt in parallel: compute-bound, ~2N FLOPs per token.
export function prefill(model, device, promptTokens, utilization = 0.5) {
    const flops = 2 * model.params * promptTokens;
    const seconds = flops / (device.tflops * 1e12 * utilization);
    return { flops, seconds, tokensPerSecond: promptTokens / seconds };
}

// Decode emits one token at a time. For a batch of b sequences the weights
// are read once and amortized, so the step time is bounded by how fast the
// weights and cache can be streamed out of HBM.
export function decode(model, device, { batch = 1, contextTokens = 1024, efficiency = 0.7 }) {
    const perStepBytes = weightBytes(model) + kvBytes(model, contextTokens, batch);
    const secondsPerStep = perStepBytes / (device.bandwidth * efficiency);
    return {
        perStepBytes,
        secondsPerStep,
        tokensPerSecond: batch / secondsPerStep,
        perUserTokensPerSecond: 1 / secondsPerStep,
    };
}

// Arithmetic intensity of the decode step: FLOPs per byte moved. Compare it
// against the device's own ratio to see which side of the roofline you are
// on — below it, the matrix units idle while memory works.
export const arithmeticIntensity = (batch) => 2 * batch;
export const deviceIntensity = (device) => (device.tflops * 1e12) / device.bandwidth;

// How large a batch has to get before decode stops being memory-bound.
export const balancedBatch = (device) => Math.ceil(deviceIntensity(device) / 2);

// How many sequences of a given length fit beside the weights.
export function capacity(model, device, contextTokens) {
    const free = device.memory - weightBytes(model);
    return Math.max(0, Math.floor(free / kvBytes(model, contextTokens, 1)));
}

// Speculative decoding: a draft model proposes k tokens, the target model
// verifies them in one pass. With acceptance rate α the expected number of
// accepted tokens per verification is the Leviathan et al. formula.
export const speculativeGain = (k, alpha) =>
    alpha === 1 ? k + 1 : (1 - alpha ** (k + 1)) / (1 - alpha);

export const bytesLabel = (value) => {
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GiB`;
    if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
    return `${value.toFixed(0)} B`;
};

export const ms = (seconds) =>
    seconds < 1 ? `${(seconds * 1000).toFixed(1)} ms` : `${seconds.toFixed(2)} s`;
