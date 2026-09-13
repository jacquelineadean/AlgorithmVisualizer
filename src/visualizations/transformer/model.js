// Pure model behind the transformer architecture map: the shapes and
// parameter counts of a decoder-only stack, computed from a configuration
// rather than quoted. The map's node metrics all come from here, so the
// numbers on the page are arithmetic anyone can check — and the unit tests
// check them against the published totals for GPT-2.

export const CONFIGS = [
    {
        id: 'gpt2-small',
        label: 'GPT-2 small (124M)',
        dModel: 768,
        layers: 12,
        heads: 12,
        dFF: 3072,
        vocab: 50257,
        context: 1024,
        gated: false,
        tied: true,
        note: 'The 2019 release’s smallest model: learned positions, GELU MLP, tied embeddings.',
    },
    {
        id: 'gpt2-xl',
        label: 'GPT-2 XL (1.5B)',
        dModel: 1600,
        layers: 48,
        heads: 25,
        dFF: 6400,
        vocab: 50257,
        context: 1024,
        gated: false,
        tied: true,
        note: 'Same architecture, four times deeper and twice as wide.',
    },
    {
        id: 'llama-7b',
        label: 'Llama-style 7B',
        dModel: 4096,
        layers: 32,
        heads: 32,
        dFF: 11008,
        vocab: 32000,
        context: 4096,
        gated: true,
        tied: false,
        note: 'Rotary positions, RMSNorm, a gated (SwiGLU) MLP with three projections.',
    },
];

export const getConfig = (id) => CONFIGS.find((config) => config.id === id) ?? CONFIGS[0];

export const headDim = (config) => config.dModel / config.heads;

// Attention block: four square projections (Q, K, V, and the output).
export const attentionParams = (config) => 4 * config.dModel * config.dModel;

// MLP: two projections, or three when the activation is gated (SwiGLU).
export const mlpParams = (config) =>
    (config.gated ? 3 : 2) * config.dModel * config.dFF;

export const layerParams = (config) => attentionParams(config) + mlpParams(config);

export function parameterBreakdown(config) {
    const embedding = config.vocab * config.dModel;
    // Learned absolute positions cost a table; rotary embeddings cost none.
    const positional = config.gated ? 0 : config.context * config.dModel;
    const blocks = config.layers * layerParams(config);
    const unembedding = config.tied ? 0 : config.vocab * config.dModel;
    return {
        embedding,
        positional,
        blocks,
        unembedding,
        attention: config.layers * attentionParams(config),
        mlp: config.layers * mlpParams(config),
        total: embedding + positional + blocks + unembedding,
    };
}

// Activation memory for one token's KV entry, across the whole stack, at
// two bytes per number (fp16/bf16).
export const kvBytesPerToken = (config, bytes = 2) =>
    2 * config.layers * config.dModel * bytes;

// The standard rule of thumb: a forward pass costs about 2N multiply-adds
// per token for N parameters, and training adds the backward pass for 6N.
export const forwardFlopsPerToken = (config) => 2 * parameterBreakdown(config).total;

export const attentionFlopsPerToken = (config, contextLength) =>
    2 * config.layers * config.heads * headDim(config) * contextLength * 2;

export const human = (value) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
    return String(value);
};

export const bytes = (value) => {
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GiB`;
    if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
    return `${value} B`;
};
