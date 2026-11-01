// The numbers behind the AI inference stack, computed from datasheets and
// model shapes so every figure on the page has a formula. Pinned to the
// published values in inference.test.js.

/* --- Hardware ------------------------------------------------------------------ */

export const H100 = {
    name: 'H100 SXM',
    bf16: 989e12, // dense; NVIDIA lists 1,979 with sparsity
    fp8: 1979e12,
    bandwidth: 3.35e12,
    memory: 80e9,
    nvlink: 900e9,
};

// FLOPs a kernel must do per byte read before compute, not memory, limits it.
export const ridgePoint = (gpu = H100, fp8 = false) => (fp8 ? gpu.fp8 : gpu.bf16) / gpu.bandwidth;

export function roofline(intensity, { gpu = H100, fp8 = false } = {}) {
    const peak = fp8 ? gpu.fp8 : gpu.bf16;
    const memoryCeiling = gpu.bandwidth * intensity;
    return { attainable: Math.min(peak, memoryCeiling), memoryBound: memoryCeiling < peak, peak };
}

/* --- One user, one H100 ---------------------------------------------------------- */

// Llama 3 8B at BF16: 8 billion parameters × 2 bytes. Every decode step
// reads every weight, so bandwidth sets a floor on the step time.
export const LLAMA3_8B_WEIGHTS = 8e9 * 2;
export const minDecodeStep = (weightBytes = LLAMA3_8B_WEIGHTS, gpu = H100) => weightBytes / gpu.bandwidth;
export const singleUserTokensPerSecond = (weightBytes = LLAMA3_8B_WEIGHTS, gpu = H100) => 1 / minDecodeStep(weightBytes, gpu);

/* --- KV cache per token ---------------------------------------------------------- */

const gqa = (layers, kvHeads, headDim, bytes = 2) => 2 * layers * kvHeads * headDim * bytes;
// DeepSeek-V3's latent attention caches one compressed vector per layer:
// a 512-dim latent plus a 64-dim decoupled RoPE key, across 61 layers.
const mla = (layers, latent, rope, bytes = 2) => layers * (latent + rope) * bytes;

export const KV_MODELS = [
    { id: 'l8', name: 'Llama 3 8B', bytes: gqa(32, 8, 128), formula: '2 × 32 layers × 8 KV heads × 128 dims × 2 bytes' },
    { id: 'l70', name: 'Llama 3 70B', bytes: gqa(80, 8, 128), formula: '2 × 80 layers × 8 KV heads × 128 dims × 2 bytes' },
    { id: 'l405', name: 'Llama 3.1 405B', bytes: gqa(126, 8, 128), formula: '2 × 126 layers × 8 KV heads × 128 dims × 2 bytes' },
    { id: 'q72', name: 'Qwen-2.5 72B', bytes: gqa(80, 8, 128), formula: '2 × 80 layers × 8 KV heads × 128 dims × 2 bytes' },
    { id: 'dsv3', name: 'DeepSeek-V3 (MLA)', bytes: mla(61, 512, 64), formula: '61 layers × (512 latent + 64 RoPE) dims × 2 bytes' },
];
export const kvModel = (id) => KV_MODELS.find((m) => m.id === id);

export function kvFootprint(modelId, tokensPerRequest, requests, gpu = H100) {
    const per = kvModel(modelId).bytes;
    const one = per * tokensPerRequest;
    const all = one * requests;
    return { perToken: per, perRequest: one, total: all, gpus: all / gpu.memory };
}

/* --- Latency ------------------------------------------------------------------------ */

export const endToEnd = (ttftMs, tpotMs, outputTokens) => ttftMs + (outputTokens - 1) * tpotMs;

/* --- One decode step (L7 batch lab) ------------------------------------------------- */

export const DECODE_SETUPS = [
    { id: '8b', name: '8B on one GPU', params: 8e9, kvPerToken: kvModel('l8').bytes, gpus: 1 },
    { id: '70b', name: '70B on four GPUs', params: 70e9, kvPerToken: kvModel('l70').bytes, gpus: 4 },
];
export const GPU_HOUR_PRICE = 2;

export function decodeStep(setup, { fp8 = false, batch, ctx, gpu = H100, price = GPU_HOUR_PRICE }) {
    const w = setup.params * (fp8 ? 1 : 2);
    const kvTok = setup.kvPerToken * (fp8 ? 0.5 : 1);
    const kv = batch * ctx * kvTok;
    const capacity = gpu.memory * setup.gpus;
    const memTime = (w + kv) / (gpu.bandwidth * setup.gpus);
    const computeTime = (2 * setup.params * batch) / ((fp8 ? gpu.fp8 : gpu.bf16) * setup.gpus);
    const step = Math.max(memTime, computeTime);
    const tps = batch / step;
    return {
        weights: w,
        kv,
        capacity,
        fits: w + kv <= capacity,
        step,
        tps,
        perUser: 1 / step,
        busy: computeTime / step,
        memoryBound: memTime >= computeTime,
        costPerMillion: ((price * setup.gpus) / 3600 / tps) * 1e6,
        maxBatch: Math.floor((capacity - w) / (ctx * kvTok)),
    };
}

// Cost per million tokens on GPUs you rent by the hour.
export const selfHostedCostPerMillion = (pricePerHour, gpus, tokensPerSecond) =>
    ((pricePerHour * gpus) / (tokensPerSecond * 3600)) * 1e6;

/* --- Prompt caching (L1 prompt lab, caching topic) -------------------------------- */

export const CACHE_READ_SHARE = 0.1; // cache reads bill at 10% of the base input price
export const CACHE_WRITE_SURCHARGE = 0.25;
export const CACHE_TTL_MINUTES = 5;
export const BATCH_DISCOUNT = 0.5;
export const LARGE_SMALL_PRICE_RATIO = 12; // Claude 3.5 Sonnet input ÷ Claude 3 Haiku input ($3 ÷ $0.25)

export const PROMPT_BLOCKS = [
    { id: 'time', name: 'Current time', tokens: 20, changes: true },
    { id: 'tools', name: 'Tool definitions', tokens: 1800, changes: false, note: 'same every request' },
    { id: 'system', name: 'System prompt', tokens: 2400, changes: false, note: 'same every request' },
    { id: 'docs', name: 'Product docs', tokens: 6000, changes: false, note: 'same every request' },
    { id: 'history', name: 'Conversation so far', tokens: 3200, changes: false, note: 'only grows at the end' },
    { id: 'user', name: 'New user message', tokens: 120, changes: true },
];
export const PROMPT_START = ['time', 'system', 'tools', 'docs', 'history', 'user'];
export const PROMPT_BEST = ['tools', 'system', 'docs', 'history', 'time', 'user'];

// The cache matches from the first token to the first part that changed.
export function promptCacheMatch(order, blocks = PROMPT_BLOCKS, readShare = CACHE_READ_SHARE) {
    let total = 0;
    let hit = 0;
    let broken = null;
    for (const id of order) {
        const b = blocks.find((x) => x.id === id);
        if (b.changes && !broken) broken = b;
        if (!broken) hit += b.tokens;
        total += b.tokens;
    }
    const share = hit / total;
    return { total, hit, share, cost: 1 - share + share * readShare, broken };
}

// Prefix tree (SGLang's radix cache): tokens matched along a path.
export const PREFIX_TREE = {
    root: { label: 'start', tokens: 0 },
    sys: { label: 'System prompt + tools', tokens: 3000, parent: 'root' },
    aDoc: { label: 'User A: contract', tokens: 20000, parent: 'sys' },
    a2: { label: 'A, turn 2', tokens: 400, parent: 'aDoc' },
    a3: { label: 'A, turn 3', tokens: 400, parent: 'a2' },
    bQ: { label: 'User B: question', tokens: 300, parent: 'sys' },
    fs: { label: 'Few-shot examples', tokens: 2500, parent: 'sys' },
};
export const PREFIX_REQUESTS = [
    { id: 'a4', label: 'User A, turn 4', matches: 'a3', fresh: { label: 'A, turn 4', tokens: 350 } },
    { id: 'b2', label: 'User B, next turn', matches: 'bQ', fresh: { label: 'B, turn 2', tokens: 250 } },
    { id: 'new', label: 'A brand-new user', matches: 'sys', fresh: { label: 'New user’s question', tokens: 300 } },
    { id: 'ts', label: 'Timestamp first', matches: 'root', fresh: { label: '12:03, then everything', tokens: 3320 }, miss: true },
];

export function prefixPath(nodeId, tree = PREFIX_TREE) {
    const path = [];
    for (let id = nodeId; id; id = tree[id].parent) path.unshift(id);
    return path;
}

export function prefixMatch(requestId, readShare = CACHE_READ_SHARE) {
    const req = PREFIX_REQUESTS.find((r) => r.id === requestId);
    const path = prefixPath(req.matches);
    const hit = path.reduce((a, id) => a + PREFIX_TREE[id].tokens, 0);
    const total = hit + req.fresh.tokens;
    return { path, hit, fresh: req.fresh.tokens, cost: (hit * readShare + req.fresh.tokens) / total };
}

/* --- Cost levers (bill calculator) -------------------------------------------------- */

export function billCut({ bill, inputShare, cacheHit, routed, batchable, readShare = CACHE_READ_SHARE, priceRatio = LARGE_SMALL_PRICE_RATIO, batchDiscount = BATCH_DISCOUNT }) {
    const input = bill * inputShare;
    const output = bill - input;
    const inputAfterCache = input * (1 - cacheHit * (1 - readShare));
    const afterCache = inputAfterCache + output;
    const afterRouting = afterCache * (1 - routed * (1 - 1 / priceRatio));
    const afterBatch = afterRouting * (1 - batchable * batchDiscount);
    return { input, inputAfterCache, afterCache, afterRouting, afterBatch, saved: 1 - afterBatch / bill };
}

/* --- DeepSeek, one day of serving ----------------------------------------------------- */

export const DEEPSEEK_DAY = {
    avgNodes: 226.75,
    gpusPerNode: 8,
    hours: 24,
    gpuHourPrice: 2,
    theoreticalRevenue: 562027,
    inputTokens: 608e9,
    cachedInputTokens: 342e9,
    outputTokens: 168e9,
    prefillNodes: 4,
    prefillGpus: 32,
    decodeNodes: 18,
    decodeGpus: 144,
    decodeTokensPerNodeSecond: 14800,
};

export function deepseekDay(d = DEEPSEEK_DAY) {
    const gpuHours = d.avgNodes * d.gpusPerNode * d.hours;
    const cost = gpuHours * d.gpuHourPrice;
    return {
        gpuHours,
        cost,
        margin: (d.theoreticalRevenue - cost) / cost,
        cacheHitShare: d.cachedInputTokens / d.inputTokens,
        inputPerOutput: d.inputTokens / d.outputTokens,
    };
}

// DeepSeek-V3: 8 of 256 routed experts per layer; 37B of 671B parameters per token.
export const DEEPSEEK_V3 = { totalParams: 671e9, activeParams: 37e9, routedExperts: 256, activeExperts: 8 };

/* --- Formatting ------------------------------------------------------------------------- */

export function formatGB(bytes) {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(bytes >= 100e9 ? 0 : 1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    return `${(bytes / 1e3).toFixed(bytes >= 1e4 ? 0 : 1)} KB`;
}

export const formatKB = (bytes) => `${(bytes / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 })} KB`;

export function formatUSD(x) {
    if (x >= 1e6) return `$${(x / 1e6).toFixed(2)}M`;
    if (x >= 1000) return `$${(x / 1000).toFixed(x >= 10000 ? 1 : 2)}K`;
    if (x >= 10) return `$${Math.round(x)}`;
    if (x >= 1) return `$${x.toFixed(2)}`;
    return `$${x.toFixed(3)}`;
}

export function formatRate(x) {
    return x >= 1e4 ? `${(x / 1000).toFixed(1)}K` : Math.round(x).toLocaleString('en-US');
}
