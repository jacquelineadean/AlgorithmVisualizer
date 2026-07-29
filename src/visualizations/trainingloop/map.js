// Builds the training-loop map: five stages that repeat until the tokens
// run out, plus the parallelism overlay and the compute budget that decide
// whether the run is possible at all.

import {
    bytesLabel,
    chinchillaTokens,
    getCluster,
    getRun,
    human,
    runTime,
    stateBytes,
    stepFlops,
    stepsInRun,
    trainingFlops,
    zeroBytes,
} from './model';

export function buildTrainingMap({ runId, clusterId, mfu = 0.45 }) {
    const run = getRun(runId);
    const cluster = getCluster(clusterId);
    if (!(mfu > 0 && mfu <= 1)) {
        throw new Error('Model FLOPs utilization must be between 0 and 1.');
    }

    const timing = runTime(run, cluster, mfu);
    const steps = stepsInRun(run);
    const optimizerState = stateBytes(run.params);
    const optimal = chinchillaTokens(run.params);
    const ratio = run.tokens / optimal;
    const shards = cluster.devices;

    const root = {
        id: 'loop',
        title: `Training run — ${run.label} on ${cluster.label}`,
        summary:
            'Five stages, repeated until the data runs out. Everything else is bookkeeping ' +
            'about memory, precision, and which device holds which slice.',
        detail:
            `${run.note} The run is ${human(steps)} optimizer steps of ` +
            `${human(run.batchTokens)} tokens each: ${human(trainingFlops(run.params, run.tokens))} ` +
            `FLOPs in total, which this cluster sustains in about ${timing.days.toFixed(1)} days ` +
            `(${human(timing.gpuHours)} GPU-hours) at ${(mfu * 100).toFixed(0)}% of peak. ` +
            `Optimizer state alone is ${bytesLabel(optimizerState)} — ` +
            `${(optimizerState / cluster.memory).toFixed(1)}× a single device's memory.`,
        provenance: 'paper',
        sourceRefs: [{ key: 'RHW1986' }, { key: 'KAPLAN2020', detail: '§2.1' }],
        layout: 'flow',
        stage: { kind: 'memory', data: { run } },
        metrics: [
            { label: 'parameters', value: human(run.params) },
            { label: 'tokens', value: human(run.tokens) },
            { label: 'steps', value: human(steps) },
            { label: 'FLOPs', value: human(timing.flops) },
            { label: 'wall clock', value: `${timing.days.toFixed(1)} days` },
        ],
        children: [
            {
                id: 'data',
                title: 'Data pipeline',
                summary:
                    'Shuffle, tokenize, pack into fixed-length sequences, and feed the accelerators without stalling them.',
                provenance: 'modern',
                sourceRefs: [{ key: 'PASZKE2019' }, { key: 'KAPLAN2020' }],
                detail:
                    `Each step consumes ${human(run.batchTokens)} tokens, so the pipeline must ` +
                    `deliver roughly ${human(run.batchTokens / (timing.seconds / steps))} tokens ` +
                    'per second, forever, from sharded storage. Documents are concatenated and ' +
                    'chopped to the context length — packing wastes nothing, at the cost of ' +
                    'sequences that straddle document boundaries.',
                metrics: [
                    { label: 'tokens / step', value: human(run.batchTokens) },
                    { label: 'passes over the data', value: (run.tokens / run.tokens).toFixed(0) + '×' },
                ],
                caveat: {
                    provenance: 'modern',
                    text: 'Large runs are typically single-epoch: the corpus is bigger than the token budget, so each example is seen once and the usual overfitting story does not apply in its textbook form.',
                    sourceRefs: [{ key: 'HOFFMANN2022' }],
                },
            },
            {
                id: 'forward',
                title: 'Forward pass',
                summary:
                    'Run the batch through every layer, keeping the activations the backward pass will need.',
                provenance: 'paper',
                sourceRefs: [{ key: 'RHW1986' }, { key: 'CHEN2016' }],
                detail:
                    `About ${human(2 * run.params * run.batchTokens)} FLOPs — a third of the ` +
                    'step. The expensive part is not the arithmetic but the activations: ' +
                    'storing every intermediate for the backward pass can exceed the weights ' +
                    'themselves, which is why checkpointing recomputes them instead of ' +
                    'keeping them, trading ~30% more compute for a large memory saving.',
                metrics: [
                    { label: 'FLOPs', value: human(2 * run.params * run.batchTokens) },
                    { label: 'share of step', value: '≈ 1/3' },
                ],
            },
            {
                id: 'loss',
                title: 'Loss',
                summary:
                    'Cross-entropy between the predicted distribution and the token that actually came next.',
                provenance: 'paper',
                sourceRefs: [{ key: 'KAPLAN2020', detail: '§1' }],
                detail:
                    'One number per position, averaged over the batch. It is measured in nats ' +
                    'per token, and its exponential is perplexity. Scaling laws are ' +
                    'statements about how this single number falls as parameters, data, and ' +
                    'compute grow — smoothly enough to be extrapolated across orders of ' +
                    'magnitude, which is what makes large runs plannable.',
            },
            {
                id: 'backward',
                title: 'Backward pass',
                summary:
                    'Reverse-mode differentiation: one pass back through the graph produces every gradient.',
                provenance: 'paper',
                sourceRefs: [{ key: 'RHW1986' }, { key: 'PASZKE2019' }],
                detail:
                    'Roughly twice the cost of the forward pass, and the reason the 6ND rule ' +
                    'has a 6 in it. The framework records the operations as they run and ' +
                    'walks the tape backward — the backpropagation page works the same ' +
                    'computation through by hand on a nine-parameter network.',
                metrics: [
                    { label: 'FLOPs', value: human(4 * run.params * run.batchTokens) },
                    { label: 'gradients', value: `${human(run.params)} numbers` },
                ],
            },
            {
                id: 'optimizer',
                title: 'Optimizer step',
                summary:
                    'AdamW turns raw gradients into an update, with clipping, a schedule, and a precision policy.',
                provenance: 'paper',
                sourceRefs: [{ key: 'KINGMA2015' }, { key: 'LOSHCHILOV2019' }],
                detail:
                    `Two running moments per parameter, in fp32, plus an fp32 master copy: ` +
                    `${bytesLabel(optimizerState)} of state for ${human(run.params)} ` +
                    'parameters — six times the size of the bf16 weights. That ratio, not the ' +
                    'weights, is what forces sharding.',
                layout: 'flow',
                stage: { kind: 'schedule', data: { run } },
                metrics: [
                    { label: 'state', value: bytesLabel(optimizerState) },
                    { label: 'bytes / param', value: 16 },
                ],
                children: [
                    {
                        id: 'adamw',
                        title: 'AdamW',
                        summary:
                            'Per-parameter step sizes from the first two gradient moments, with weight decay applied separately.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'KINGMA2015' }, { key: 'LOSHCHILOV2019' }],
                        detail:
                            'Adam divides each gradient by a running estimate of its own ' +
                            'magnitude, so parameters with small, consistent gradients move as ' +
                            'fast as loud ones. Loshchilov and Hutter’s correction was to stop ' +
                            'routing weight decay through that normalization — in Adam, L2 ' +
                            'regularization and weight decay are not the same thing, and the ' +
                            'decoupled version generalizes measurably better.',
                    },
                    {
                        id: 'schedule',
                        title: 'Warmup and decay',
                        summary:
                            'Ramp the learning rate up over the first steps, then cosine it down to a floor.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'GOYAL2017' }, { key: 'KAPLAN2020', detail: '§B' }],
                        detail:
                            'Large batches need warmup: at step zero the moment estimates are ' +
                            'meaningless and a full-size step diverges. Goyal et al. established ' +
                            'the pattern — linear warmup, then decay — while scaling ImageNet ' +
                            'to a batch of 8,192, and language models inherited it wholesale.',
                        stage: { kind: 'schedule', data: { run } },
                    },
                    {
                        id: 'precision',
                        title: 'Mixed precision',
                        summary:
                            'Compute in bf16, accumulate and update in fp32, and keep a master copy of the weights.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'MICIKEVICIUS2018' }],
                        detail:
                            'Half precision doubles arithmetic throughput and halves memory ' +
                            'traffic, but a small gradient added to a large weight vanishes ' +
                            'entirely in 16 bits. The fix is an fp32 master copy plus loss ' +
                            'scaling — accuracy identical to full precision, at roughly half ' +
                            'the cost.',
                        metrics: [
                            { label: 'weights', value: 'bf16 (2 B)' },
                            { label: 'master + moments', value: 'fp32 (12 B)' },
                        ],
                    },
                ],
            },
            {
                id: 'parallel',
                title: 'Parallelism overlay',
                summary:
                    'The same loop, split three ways across devices — by batch, by tensor, and by layer.',
                provenance: 'paper',
                sourceRefs: [{ key: 'SHOEYBI2019' }, { key: 'RAJBHANDARI2020' }, { key: 'HUANG2019' }],
                detail:
                    `Nothing about the mathematics changes; the question is only which device ` +
                    `holds which slice and what has to be communicated between them. Across ` +
                    `${cluster.devices} devices, ZeRO stage 3 brings per-device state from ` +
                    `${bytesLabel(zeroBytes(run.params, 1, 0))} down to ` +
                    `${bytesLabel(zeroBytes(run.params, shards, 3))}.`,
                layout: 'grid',
                children: [
                    {
                        id: 'data-parallel',
                        title: 'Data parallel',
                        summary:
                            'Every device holds the whole model and a slice of the batch; gradients are all-reduced.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'GOYAL2017' }, { key: 'PASZKE2019' }],
                        detail:
                            'The simplest split and the first to run out of room: it needs the ' +
                            'entire model, its gradients, and its optimizer state on every ' +
                            `device — ${bytesLabel(zeroBytes(run.params, 1, 0))} here, against ` +
                            `${bytesLabel(cluster.memory)} of device memory.`,
                        metrics: [
                            { label: 'per device', value: bytesLabel(zeroBytes(run.params, 1, 0)) },
                            { label: 'communication', value: 'all-reduce of gradients' },
                        ],
                    },
                    {
                        id: 'zero',
                        title: 'ZeRO sharding',
                        summary:
                            'Keep data parallelism but stop replicating: shard optimizer state, then gradients, then parameters.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'RAJBHANDARI2020' }],
                        detail:
                            `Stage 1 shards the optimizer state (` +
                            `${bytesLabel(zeroBytes(run.params, shards, 1))} per device), stage 2 ` +
                            `adds gradients (${bytesLabel(zeroBytes(run.params, shards, 2))}), ` +
                            `stage 3 adds the parameters themselves ` +
                            `(${bytesLabel(zeroBytes(run.params, shards, 3))}). Each stage trades ` +
                            'more communication for less memory, without changing the update at ' +
                            'all.',
                        metrics: [
                            { label: 'stage 1', value: bytesLabel(zeroBytes(run.params, shards, 1)) },
                            { label: 'stage 2', value: bytesLabel(zeroBytes(run.params, shards, 2)) },
                            { label: 'stage 3', value: bytesLabel(zeroBytes(run.params, shards, 3)) },
                        ],
                    },
                    {
                        id: 'tensor-parallel',
                        title: 'Tensor parallel',
                        summary:
                            'Split individual matrices across devices; each holds a slice of every layer.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'SHOEYBI2019' }],
                        detail:
                            'Megatron splits the attention heads and the MLP’s hidden dimension ' +
                            'column-wise and row-wise so that only two all-reduces per block are ' +
                            'needed. It is bandwidth-hungry, so it stays inside a single node ' +
                            'where the interconnect is fast.',
                        metrics: [{ label: 'scope', value: 'within a node' }],
                    },
                    {
                        id: 'pipeline-parallel',
                        title: 'Pipeline parallel',
                        summary:
                            'Give each device a contiguous group of layers and stream micro-batches through them.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'HUANG2019' }],
                        detail:
                            'The natural split for depth, with one cost: the bubble. While the ' +
                            'first stage works on micro-batch 1, the last stage has nothing to ' +
                            'do. GPipe’s answer is many small micro-batches, which shrinks the ' +
                            'idle fraction to roughly (stages − 1) / micro-batches.',
                        metrics: [{ label: 'cost', value: 'pipeline bubble' }],
                    },
                    {
                        id: 'checkpointing',
                        title: 'Activation checkpointing',
                        summary:
                            'Throw activations away in the forward pass and recompute them in the backward one.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'CHEN2016' }],
                        detail:
                            'Memory drops from linear in depth to roughly the square root of ' +
                            'it, for about one extra forward pass — 30% more compute. On any ' +
                            'run where memory is the binding constraint, that is a trade worth ' +
                            'making every time.',
                        metrics: [{ label: 'memory', value: 'O(√L) instead of O(L)' }],
                    },
                ],
            },
            {
                id: 'budget',
                title: 'Was this the right run?',
                summary:
                    'Compute-optimal scaling says parameters and tokens should grow together.',
                provenance: 'paper',
                sourceRefs: [{ key: 'HOFFMANN2022' }, { key: 'KAPLAN2020' }],
                detail:
                    `Hoffmann et al. found the optimum at roughly 20 tokens per parameter. ` +
                    `This run uses ${(run.tokens / run.params).toFixed(1)} — ` +
                    `${ratio >= 1.15 ? `${ratio.toFixed(1)}× past` : ratio <= 0.85 ? `${(1 / ratio).toFixed(1)}× short of` : 'right at'} ` +
                    `the compute-optimal point of ${human(optimal)} tokens. Training past it ` +
                    'is deliberate for models that will be served heavily: the extra training ' +
                    'compute is paid once, and a smaller model is cheaper on every request ' +
                    'thereafter.',
                metrics: [
                    { label: 'tokens / param', value: (run.tokens / run.params).toFixed(1) },
                    { label: 'optimal', value: `${human(optimal)} tokens` },
                    { label: 'GPU-hours', value: human(timing.gpuHours) },
                ],
                caveat: {
                    provenance: 'pedagogical',
                    text: 'The 6ND rule counts matrix multiplies only and assumes a fixed utilization; real runs lose time to communication, restarts, evaluation, and data stalls. Treat the wall-clock figure as a floor, not a schedule.',
                    sourceRefs: [{ key: 'KAPLAN2020', detail: '§2.1' }, { key: 'SHOEYBI2019' }],
                },
            },
        ],
    };

    return { root, run, cluster, timing, steps };
}
