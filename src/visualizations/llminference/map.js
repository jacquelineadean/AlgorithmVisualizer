// Builds the LLM inference map: what actually happens between a request
// arriving and the last token leaving, with the numbers computed for the
// selected model and accelerator.

import {
    arithmeticIntensity,
    balancedBatch,
    bytesLabel,
    capacity,
    decode,
    deviceIntensity,
    getAccelerator,
    getModel,
    kvBytes,
    kvBytesPerToken,
    ms,
    prefill,
    speculativeGain,
    weightBytes,
} from './model';

export function buildInferenceMap({ modelId, deviceId, promptTokens = 1024, batch = 16 }) {
    const model = getModel(modelId);
    const device = getAccelerator(deviceId);
    if (!Number.isInteger(promptTokens) || promptTokens < 1 || promptTokens > model.context) {
        throw new Error(`The prompt must be between 1 and ${model.context} tokens.`);
    }

    const pre = prefill(model, device, promptTokens);
    const single = decode(model, device, { batch: 1, contextTokens: promptTokens });
    const batched = decode(model, device, { batch, contextTokens: promptTokens });
    const balanced = balancedBatch(device);
    const seats = capacity(model, device, model.context);
    const specGain = speculativeGain(4, 0.7);

    const root = {
        id: 'request',
        title: `Serving one request — ${model.label} on ${device.label}`,
        summary:
            'Tokenize, read the prompt in one parallel pass, then emit tokens one at a time. ' +
            'The two halves are limited by completely different resources.',
        detail:
            `Weights occupy ${bytesLabel(weightBytes(model))} of the device's ` +
            `${bytesLabel(device.memory)}, leaving room for about ${seats.toLocaleString()} ` +
            `full-length ${model.context.toLocaleString()}-token conversations in the KV cache. ` +
            `Reading a ${promptTokens.toLocaleString()}-token prompt takes ${ms(pre.seconds)}; ` +
            `each token after that takes ${ms(single.secondsPerStep)} on its own, or ` +
            `${ms(batched.secondsPerStep)} for a batch of ${batch} — almost the same, which is ` +
            'the single most important fact about serving.',
        provenance: 'paper',
        sourceRefs: [{ key: 'POPE2022' }, { key: 'VASWANI2017' }],
        layout: 'flow',
        stage: { kind: 'roofline', data: { model, device } },
        metrics: [
            { label: 'weights', value: bytesLabel(weightBytes(model)) },
            { label: 'prefill', value: ms(pre.seconds) },
            { label: 'per token (b=1)', value: ms(single.secondsPerStep) },
            { label: 'throughput (b=1)', value: `${single.tokensPerSecond.toFixed(1)} tok/s` },
            { label: `throughput (b=${batch})`, value: `${batched.tokensPerSecond.toFixed(0)} tok/s` },
        ],
        children: [
            {
                id: 'tokenize',
                title: 'Tokenize',
                summary: 'Bytes in, integers out — the model never sees characters.',
                provenance: 'paper',
                sourceRefs: [{ key: 'SENNRICH2016' }],
                detail:
                    'Byte-pair encoding merges frequent byte sequences into single symbols. ' +
                    'It is deterministic, cheap, and completely outside the neural network — ' +
                    'but it fixes what the model can count, spell, and tokenize efficiently in ' +
                    'other languages.',
                metrics: [{ label: 'prompt', value: `${promptTokens.toLocaleString()} tokens` }],
            },
            {
                id: 'prefill',
                title: 'Prefill — read the prompt',
                summary:
                    'Every prompt token goes through every layer at once, and the KV cache is built on the way.',
                provenance: 'paper',
                sourceRefs: [{ key: 'POPE2022', detail: '§3' }, { key: 'VASWANI2017', detail: '§3.2' }],
                detail:
                    `This is a dense matrix multiply over ${promptTokens.toLocaleString()} ` +
                    `positions: about ${(pre.flops / 1e12).toFixed(1)} TFLOPs, which the ` +
                    `${device.label} chews through in ${ms(pre.seconds)} at half of peak. ` +
                    'Prefill is compute-bound — the tensor cores are the bottleneck, and the ' +
                    'user experiences it as time-to-first-token.',
                layout: 'flow',
                metrics: [
                    { label: 'FLOPs', value: `${(pre.flops / 1e12).toFixed(1)} T` },
                    { label: 'time', value: ms(pre.seconds) },
                    { label: 'bound by', value: 'arithmetic' },
                ],
                children: [
                    {
                        id: 'parallel',
                        title: 'All positions at once',
                        summary:
                            'Unlike generation, prefill has every token already — so the whole prompt is one big matmul per layer.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.3' }],
                        detail:
                            'The causal mask still applies, so each position only attends ' +
                            'leftward; but nothing has to wait, because no position depends on ' +
                            'a token that has not been generated yet.',
                    },
                    {
                        id: 'kv-build',
                        title: 'Build the KV cache',
                        summary:
                            'Each layer’s keys and values are kept, so decoding never recomputes them.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'POPE2022', detail: '§4' }, { key: 'AINSLIE2023' }],
                        detail:
                            `One token costs ${bytesLabel(kvBytesPerToken(model))} across all ` +
                            `${model.layers} layers, so this prompt’s cache is ` +
                            `${bytesLabel(kvBytes(model, promptTokens))}. ${model.note} Without ` +
                            'the cache, generating token n would mean re-reading the whole ' +
                            'prefix through every layer — quadratic work for a linear output.',
                        stage: { kind: 'kv', data: { model, promptTokens } },
                        metrics: [
                            { label: 'per token', value: bytesLabel(kvBytesPerToken(model)) },
                            { label: 'this prompt', value: bytesLabel(kvBytes(model, promptTokens)) },
                            { label: 'KV heads', value: `${model.kvHeads} / ${model.heads}` },
                        ],
                    },
                    {
                        id: 'flash',
                        title: 'Never materialize the score matrix',
                        summary:
                            'FlashAttention tiles the computation so the n × n scores stay in on-chip SRAM.',
                        provenance: 'modern',
                        sourceRefs: [{ key: 'DAO2022' }],
                        detail:
                            'The mathematics is unchanged — it computes exact attention — but ' +
                            'by fusing the softmax into the matmul and streaming tiles, it ' +
                            'never writes the quadratic intermediate to HBM. That turns ' +
                            'attention from a memory-bound kernel into a compute-bound one and ' +
                            'is why long contexts became affordable.',
                    },
                ],
            },
            {
                id: 'decode',
                title: 'Decode — one token at a time',
                summary:
                    'Each step reads every weight to produce a single token. The matrix units are mostly idle.',
                provenance: 'paper',
                sourceRefs: [{ key: 'POPE2022', detail: '§3–4' }, { key: 'WILLIAMS2009' }],
                detail:
                    `A single decode step moves ${bytesLabel(single.perStepBytes)} out of HBM ` +
                    `and performs about ${(2 * model.params / 1e9).toFixed(1)} GFLOPs — an ` +
                    `arithmetic intensity of ${arithmeticIntensity(1)} FLOPs per byte against ` +
                    `a device that wants ${deviceIntensity(device).toFixed(0)}. Decoding is ` +
                    'memory-bound by roughly two orders of magnitude, and that single ratio ' +
                    'explains almost every trick in modern serving.',
                layout: 'flow',
                stage: { kind: 'roofline', data: { model, device } },
                metrics: [
                    { label: 'bytes / step', value: bytesLabel(single.perStepBytes) },
                    { label: 'intensity', value: `${arithmeticIntensity(1)} FLOP/byte` },
                    { label: 'device wants', value: `${deviceIntensity(device).toFixed(0)} FLOP/byte` },
                ],
                children: [
                    {
                        id: 'autoregressive',
                        title: 'Strictly sequential',
                        summary:
                            'Token n + 1 cannot start until token n exists. No amount of hardware removes the dependency.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.3' }],
                        detail:
                            `Latency per user is therefore fixed by one step time — ` +
                            `${ms(single.secondsPerStep)} here, about ` +
                            `${single.perUserTokensPerSecond.toFixed(0)} tokens per second, no ` +
                            'matter how idle the device is.',
                    },
                    {
                        id: 'cache-read',
                        title: 'Attend against the cache',
                        summary:
                            'The new token’s query reads every cached key and value — the only part that grows with context.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'POPE2022', detail: '§4' }, { key: 'AINSLIE2023' }],
                        detail:
                            `At ${promptTokens.toLocaleString()} tokens the cache adds ` +
                            `${bytesLabel(kvBytes(model, promptTokens))} per sequence to every ` +
                            'step’s memory traffic. Grouped-query attention exists precisely to ' +
                            'shrink this term: sharing KV across query heads cuts the cache by ' +
                            'the sharing factor with little quality loss.',
                        stage: { kind: 'kv', data: { model, promptTokens } },
                    },
                    {
                        id: 'batching-gain',
                        title: 'Why batching is nearly free',
                        summary:
                            'The weights are read once for the whole batch, so more users cost almost no extra time.',
                        provenance: 'theorem',
                        sourceRefs: [{ key: 'POPE2022', detail: '§3' }, { key: 'WILLIAMS2009' }],
                        detail:
                            `One sequence: ${ms(single.secondsPerStep)} per step, ` +
                            `${single.tokensPerSecond.toFixed(1)} tok/s. ${batch} sequences: ` +
                            `${ms(batched.secondsPerStep)} per step and ` +
                            `${batched.tokensPerSecond.toFixed(0)} tok/s — roughly ` +
                            `${(batched.tokensPerSecond / single.tokensPerSecond).toFixed(1)}× ` +
                            `the throughput for ${(
                                batched.secondsPerStep / single.secondsPerStep
                            ).toFixed(2)}× the latency. Only past a batch of about ` +
                            `${balanced} does this device become compute-bound again.`,
                        metrics: [
                            { label: 'b = 1', value: `${single.tokensPerSecond.toFixed(1)} tok/s` },
                            { label: `b = ${batch}`, value: `${batched.tokensPerSecond.toFixed(0)} tok/s` },
                            { label: 'balanced at', value: `b ≈ ${balanced}` },
                        ],
                    },
                ],
            },
            {
                id: 'sampling',
                title: 'Sampling — logits to a token',
                summary:
                    'The model outputs a distribution; a sampler chooses. Temperature and top-p reshape it first.',
                provenance: 'paper',
                sourceRefs: [{ key: 'HOLTZMAN2020' }],
                detail:
                    'Holtzman et al. showed that maximizing likelihood produces degenerate, ' +
                    'repetitive text: the most probable continuation is rarely the most ' +
                    'human one. Nucleus sampling keeps the smallest set of tokens whose ' +
                    'probability sums past p and renormalizes, so the cutoff adapts to how ' +
                    'confident the model is at that position.',
                stage: { kind: 'sampling', data: {} },
                metrics: [
                    { label: 'temperature', value: 'flattens or sharpens' },
                    { label: 'top-p', value: 'adaptive truncation' },
                ],
                caveat: {
                    provenance: 'pedagogical',
                    text: 'The distribution in the panel is a hand-set toy over eight candidate tokens so the effect of each knob is visible. A real vocabulary is tens of thousands wide and overwhelmingly concentrated in its first few entries.',
                    sourceRefs: [{ key: 'HOLTZMAN2020' }],
                },
            },
            {
                id: 'serving',
                title: 'Serving many requests at once',
                summary:
                    'Three systems papers, each removing a different form of waste from the decode loop.',
                provenance: 'modern',
                sourceRefs: [{ key: 'YU2022' }, { key: 'KWON2023' }, { key: 'LEVIATHAN2023' }],
                detail:
                    'Once decode is memory-bound, throughput is a scheduling problem: keep the ' +
                    'batch full, stop wasting memory on padding, and get more than one token ' +
                    'per weight-read where possible.',
                layout: 'grid',
                children: [
                    {
                        id: 'continuous-batching',
                        title: 'Continuous batching',
                        summary:
                            'Finished sequences leave the batch mid-flight and new ones join at the next step.',
                        provenance: 'modern',
                        sourceRefs: [{ key: 'YU2022' }],
                        detail:
                            'Static batching makes every request wait for the longest one in ' +
                            'its group, so a batch of mixed-length generations spends most of ' +
                            'its time mostly empty. Orca schedules at the granularity of a ' +
                            'single iteration instead of a whole request, which keeps the ' +
                            'batch — and therefore the memory bandwidth — saturated.',
                        metrics: [{ label: 'granularity', value: 'per iteration, not per request' }],
                    },
                    {
                        id: 'paged-kv',
                        title: 'Paged KV cache',
                        summary:
                            'Virtual memory for the cache: fixed-size blocks, no contiguous reservation, no padding waste.',
                        provenance: 'modern',
                        sourceRefs: [{ key: 'KWON2023' }],
                        detail:
                            'Reserving the maximum context per sequence wastes most of it, ' +
                            'because most generations are short. PagedAttention allocates the ' +
                            'cache in blocks with a page table, so fragmentation nearly ' +
                            'disappears and sequences that share a prompt prefix can share its ' +
                            'blocks outright.',
                        metrics: [{ label: 'wins', value: 'fragmentation + prefix sharing' }],
                    },
                    {
                        id: 'speculative',
                        title: 'Speculative decoding',
                        summary:
                            'A small draft model guesses several tokens; the big model checks them all in one pass.',
                        provenance: 'modern',
                        sourceRefs: [{ key: 'LEVIATHAN2023' }],
                        detail:
                            'Since decode is memory-bound, verifying k proposed tokens costs ' +
                            'barely more than generating one. With a draft accepted 70% of the ' +
                            `time and k = 4, the expected yield is ${specGain.toFixed(2)} ` +
                            'tokens per verification — and the rejection rule is designed so ' +
                            'the output distribution is exactly the target model’s, not an ' +
                            'approximation of it.',
                        metrics: [
                            { label: 'k = 4, α = 0.7', value: `${specGain.toFixed(2)} tokens / pass` },
                            { label: 'output', value: 'distributionally identical' },
                        ],
                    },
                ],
            },
            {
                id: 'detokenize',
                title: 'Detokenize and stream',
                summary: 'Token ids become bytes again, flushed as they arrive.',
                provenance: 'paper',
                sourceRefs: [{ key: 'SENNRICH2016' }],
                detail:
                    'Because tokens are byte fragments, a multi-byte character can straddle two ' +
                    'of them — a streaming detokenizer has to buffer partial sequences rather ' +
                    'than decode each token independently.',
            },
        ],
    };

    return { root, model, device, pre, single, batched };
}
