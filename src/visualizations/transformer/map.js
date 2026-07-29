// Builds the transformer architecture map: a tree of cited components the
// reader zooms through, from the whole stack down to a single attention
// head's arithmetic. Metrics are computed from the chosen configuration —
// nothing on this page is a quoted number.

import {
    attentionParams,
    bytes,
    getConfig,
    headDim,
    human,
    kvBytesPerToken,
    mlpParams,
    parameterBreakdown,
} from './model';

export function buildTransformerMap({ configId }) {
    const config = getConfig(configId);
    const params = parameterBreakdown(config);
    const dHead = headDim(config);
    const perLayer = attentionParams(config) + mlpParams(config);

    const root = {
        id: 'model',
        title: `Decoder-only transformer — ${config.label}`,
        summary:
            'Tokens in, a probability distribution over the next token out. Everything ' +
            'between is the same block, repeated.',
        detail:
            `${config.note} The stack has ${config.layers} identical blocks of width ` +
            `${config.dModel}, ${config.heads} heads of dimension ${dHead}, and ` +
            `${human(params.total)} parameters in total — ${(
                (params.blocks / params.total) *
                100
            ).toFixed(0)}% of them inside the blocks. Zoom into any component; every node ` +
            'carries its own citation.',
        provenance: 'paper',
        sourceRefs: [{ key: 'VASWANI2017' }, { key: 'RADFORD2019' }],
        layout: 'flow',
        metrics: [
            { label: 'parameters', value: human(params.total) },
            { label: 'layers', value: config.layers },
            { label: 'd_model', value: config.dModel },
            { label: 'heads', value: `${config.heads} × ${dHead}` },
            { label: 'context', value: config.context.toLocaleString() },
        ],
        stage: { kind: 'params', data: { config, params } },
        children: [
            {
                id: 'input',
                title: 'Input: tokens → vectors',
                summary: 'Text becomes integers, integers become vectors, and position is added.',
                provenance: 'paper',
                sourceRefs: [{ key: 'VASWANI2017', detail: '§3.4–3.5' }],
                detail:
                    `The embedding table alone is ${human(params.embedding)} parameters — ` +
                    `${((params.embedding / params.total) * 100).toFixed(0)}% of this model, ` +
                    'and the single largest tensor in most small ones.',
                metrics: [
                    { label: 'vocabulary', value: config.vocab.toLocaleString() },
                    { label: 'embedding params', value: human(params.embedding) },
                ],
                children: [
                    {
                        id: 'tokenize',
                        title: 'Byte-pair tokenization',
                        summary:
                            'Frequent character sequences merge into single symbols, so common words are one token and rare ones decompose.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'SENNRICH2016' }, { key: 'RADFORD2019', detail: '§2.2' }],
                        detail:
                            'BPE was introduced for machine translation to handle rare words ' +
                            'without an unbounded vocabulary. GPT-2 applies it at the byte ' +
                            'level, which makes the tokenizer total: any byte sequence encodes, ' +
                            'no unknown-token escape hatch required.',
                        metrics: [{ label: 'vocabulary', value: config.vocab.toLocaleString() }],
                    },
                    {
                        id: 'embed',
                        title: 'Token embedding',
                        summary: `A lookup table of ${config.vocab.toLocaleString()} rows, each a vector of ${config.dModel} numbers.`,
                        provenance: 'paper',
                        sourceRefs: [{ key: 'VASWANI2017', detail: '§3.4' }],
                        detail: config.tied
                            ? 'This model ties the input embedding to the output projection — ' +
                              'one matrix used in both directions, which saves ' +
                              `${human(config.vocab * config.dModel)} parameters.`
                            : 'Input and output embeddings are separate matrices here, costing ' +
                              `${human(config.vocab * config.dModel)} parameters each.`,
                        metrics: [
                            { label: 'shape', value: `${config.vocab.toLocaleString()} × ${config.dModel}` },
                            { label: 'tied to output', value: config.tied ? 'yes' : 'no' },
                        ],
                    },
                    {
                        id: 'positions',
                        title: config.gated ? 'Rotary position embedding' : 'Learned positions',
                        summary: config.gated
                            ? 'Position enters by rotating query and key vectors — no table, and relative distance falls out of the dot product.'
                            : `A second learned table of ${config.context.toLocaleString()} rows, added to the token embedding.`,
                        provenance: 'paper',
                        sourceRefs: config.gated
                            ? [{ key: 'SU2021' }, { key: 'VASWANI2017', detail: '§3.5' }]
                            : [{ key: 'VASWANI2017', detail: '§3.5' }, { key: 'RADFORD2019' }],
                        detail:
                            'Attention is permutation-invariant: without position information ' +
                            '“dog bites man” and “man bites dog” are the same input. The 2017 ' +
                            'paper used fixed sinusoids; GPT-2 learned a table; rotary ' +
                            'embeddings rotate Q and K by an angle proportional to position, so ' +
                            'the score depends only on the offset between two tokens.',
                        metrics: [
                            {
                                label: 'cost',
                                value: config.gated
                                    ? '0 parameters'
                                    : human(config.context * config.dModel),
                            },
                        ],
                        caveat: {
                            provenance: 'modern',
                            text: 'Learned absolute tables cannot extrapolate past their length; rotary and ALiBi-style schemes are what let context windows grow to hundreds of thousands of tokens after training.',
                            sourceRefs: [{ key: 'SU2021' }],
                        },
                    },
                ],
            },
            {
                id: 'block',
                title: `Transformer block × ${config.layers}`,
                summary:
                    'Normalize, attend, add. Normalize, MLP, add. Identical layers, stacked.',
                provenance: 'paper',
                sourceRefs: [{ key: 'VASWANI2017', detail: '§3.1' }, { key: 'XIONG2020' }],
                detail:
                    `Each block holds ${human(perLayer)} parameters: ` +
                    `${human(attentionParams(config))} in attention and ` +
                    `${human(mlpParams(config))} in the MLP — a ratio of about 1 : ` +
                    `${(mlpParams(config) / attentionParams(config)).toFixed(1)}. Most of a ` +
                    'transformer’s weights live in the MLPs, not in attention.',
                layout: 'flow',
                metrics: [
                    { label: 'params / block', value: human(perLayer) },
                    { label: 'attention', value: human(attentionParams(config)) },
                    { label: 'MLP', value: human(mlpParams(config)) },
                ],
                children: [
                    {
                        id: 'norm',
                        title: config.gated ? 'RMSNorm (pre-norm)' : 'LayerNorm (pre-norm)',
                        summary:
                            'Rescale each token’s vector before the sublayer, so activations stay in a trainable range at depth.',
                        provenance: 'paper',
                        sourceRefs: config.gated
                            ? [{ key: 'ZHANG2019' }, { key: 'XIONG2020' }]
                            : [{ key: 'BA2016' }, { key: 'XIONG2020' }],
                        detail:
                            'The 2017 paper normalized *after* each sublayer; every large model ' +
                            'since normalizes before it. Xiong et al. showed why: pre-norm keeps ' +
                            'gradient magnitudes stable at initialization, which removes the ' +
                            'learning-rate warmup that post-norm training needs to avoid ' +
                            'diverging. RMSNorm drops the mean-centring and keeps only the scale.',
                        metrics: [
                            { label: 'params', value: `${config.dModel} per norm` },
                            { label: 'placement', value: 'before each sublayer' },
                        ],
                    },
                    {
                        id: 'attention',
                        title: 'Multi-head self-attention',
                        summary:
                            'Every token builds a query, reads every other token’s key, and mixes their values.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2' }],
                        detail:
                            `${config.heads} heads, each working in ${dHead} dimensions, run in ` +
                            'parallel and concatenate. This is the only place in the whole ' +
                            'architecture where information moves *between* token positions — ' +
                            'everything else acts on each position independently.',
                        layout: 'flow',
                        metrics: [
                            { label: 'heads', value: config.heads },
                            { label: 'd_head', value: dHead },
                            { label: 'params', value: human(attentionParams(config)) },
                        ],
                        children: [
                            {
                                id: 'qkv',
                                title: 'Q, K, V projections',
                                summary:
                                    'Three matrices turn each token vector into a question, an advertisement, and a contribution.',
                                provenance: 'paper',
                                sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.1' }],
                                detail:
                                    `Each projection is ${config.dModel} × ${config.dModel}, ` +
                                    `split across ${config.heads} heads of ${dHead} dimensions. ` +
                                    'Together with the output projection, that is four square ' +
                                    `matrices — ${human(attentionParams(config))} parameters.`,
                                metrics: [
                                    { label: 'each', value: `${config.dModel} × ${config.dModel}` },
                                    { label: 'count', value: '4 (Q, K, V, O)' },
                                ],
                            },
                            {
                                id: 'head',
                                title: 'Inside one head',
                                summary:
                                    'Scores, scaling, softmax, and a weighted sum — computed live on a four-token sentence.',
                                provenance: 'paper',
                                sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.1' }],
                                detail:
                                    'The matrix below is a real attention head running on a toy ' +
                                    'sentence with hand-set embeddings: row i is where token i ' +
                                    'looks. The dedicated attention page walks the same ' +
                                    'computation step by step.',
                                stage: { kind: 'attention', data: {} },
                                caveat: {
                                    provenance: 'pedagogical',
                                    text: 'Four tokens and three dimensions so the grid is readable. A real head of this model works in ' + dHead + ' dimensions over the whole context.',
                                    sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.2' }],
                                },
                            },
                            {
                                id: 'mask',
                                title: 'Causal mask',
                                summary:
                                    'Positions to the right are set to −∞ before the softmax, so no token can read its own future.',
                                provenance: 'paper',
                                sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.3' }],
                                detail:
                                    'This one mask is what makes a decoder-only model trainable ' +
                                    'in parallel: a single forward pass supervises the ' +
                                    'next-token prediction at every position at once, instead ' +
                                    'of one position per pass.',
                            },
                            {
                                id: 'cost',
                                title: 'Why attention is the expensive part',
                                summary:
                                    'Parameters are constant in sequence length; the score matrix is quadratic in it.',
                                provenance: 'theorem',
                                sourceRefs: [{ key: 'VASWANI2017', detail: '§4' }, { key: 'KAPLAN2020', detail: '§2.1' }],
                                detail:
                                    `At the full ${config.context.toLocaleString()}-token ` +
                                    'context the scores are an n × n matrix per head per layer. ' +
                                    'The weights do not grow, but the compute and the memory ' +
                                    'traffic do — which is the entire motivation for FlashAttention ' +
                                    'kernels and for every sub-quadratic attention variant.',
                                metrics: [
                                    { label: 'params', value: 'O(d²) — constant in n' },
                                    { label: 'scores', value: 'O(n²·d) — quadratic in n' },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'mlp',
                        title: config.gated ? 'Gated MLP (SwiGLU)' : 'MLP (GELU)',
                        summary: `Widen to ${config.dFF.toLocaleString()}, apply a non-linearity, project back — position by position.`,
                        provenance: 'paper',
                        sourceRefs: config.gated
                            ? [{ key: 'SHAZEER2020' }, { key: 'VASWANI2017', detail: '§3.3' }]
                            : [{ key: 'VASWANI2017', detail: '§3.3' }, { key: 'HENDRYCKS2016' }],
                        detail:
                            `Two thirds of every block’s parameters (${human(mlpParams(config))}) ` +
                            'sit here, in a network applied independently to each token. ' +
                            (config.gated
                                ? 'The gated form splits the up-projection in two and multiplies ' +
                                  'the halves, costing a third more parameters for a consistent ' +
                                  'quality gain — Shazeer’s paper is famously candid that the ' +
                                  'reason is not understood.'
                                : 'GELU replaced ReLU because its smooth, probabilistic gating ' +
                                  'trains slightly better at the same cost.'),
                        metrics: [
                            { label: 'd_ff', value: config.dFF.toLocaleString() },
                            { label: 'ratio', value: `${(config.dFF / config.dModel).toFixed(2)}× d_model` },
                            { label: 'projections', value: config.gated ? 3 : 2 },
                        ],
                    },
                    {
                        id: 'residual',
                        title: 'Residual connection',
                        summary:
                            'Every sublayer adds to a running stream rather than replacing it.',
                        provenance: 'paper',
                        sourceRefs: [{ key: 'HE2015' }, { key: 'ELHAGE2021' }],
                        detail:
                            'He et al. introduced skip connections so that very deep vision ' +
                            'networks would train at all; in a transformer they do something ' +
                            'more. Because every block reads from and writes to the same vector, ' +
                            'the residual stream acts as a shared bus that layers communicate ' +
                            'through — the frame interpretability work uses to trace circuits ' +
                            'across layers.',
                        metrics: [
                            { label: 'width', value: config.dModel },
                            { label: 'writers', value: `${config.layers * 2} sublayers` },
                        ],
                    },
                ],
            },
            {
                id: 'output',
                title: 'Output: vectors → next-token odds',
                summary:
                    'A final norm, a projection back to vocabulary size, and a softmax.',
                provenance: 'paper',
                sourceRefs: [{ key: 'VASWANI2017', detail: '§3.4' }, { key: 'RADFORD2019' }],
                detail:
                    `The unembedding produces ${config.vocab.toLocaleString()} logits per ` +
                    'position. What happens next — greedy, temperature, top-p — is sampling, ' +
                    'not architecture; the LLM inference map picks it up there.',
                metrics: [
                    { label: 'logits', value: config.vocab.toLocaleString() },
                    {
                        label: 'unembedding',
                        value: config.tied ? 'tied to the input table' : human(params.unembedding),
                    },
                ],
            },
            {
                id: 'budget',
                title: 'Where the parameters and the memory go',
                summary:
                    'The whole accounting in one place: weights by component, and what one cached token costs.',
                provenance: 'theorem',
                sourceRefs: [{ key: 'KAPLAN2020', detail: '§2.1' }, { key: 'VASWANI2017' }],
                detail:
                    `Total ${human(params.total)} parameters. A forward pass costs roughly two ` +
                    `multiply-adds per parameter per token (${human(2 * params.total)} FLOPs), ` +
                    'and every token kept in the KV cache costs ' +
                    `${bytes(kvBytesPerToken(config))} at two bytes per number — the number ` +
                    'that decides how many conversations fit on one GPU.',
                stage: { kind: 'params', data: { config, params } },
                metrics: [
                    { label: 'total', value: human(params.total) },
                    { label: 'FLOPs / token (fwd)', value: human(2 * params.total) },
                    { label: 'KV / token', value: bytes(kvBytesPerToken(config)) },
                ],
                caveat: {
                    provenance: 'pedagogical',
                    text: 'Counts here cover weight matrices only — biases, norm scales, and optimizer state are excluded, which is why the totals land a fraction under the headline figures. The 2N-FLOPs rule likewise ignores attention’s quadratic term, which is negligible until the context is long.',
                    sourceRefs: [{ key: 'KAPLAN2020', detail: 'Table 1' }],
                },
            },
        ],
    };

    return { root, config, params };
}
