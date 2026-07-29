// Builds the attention trace: four tokens, three projections, one matrix
// multiply, one softmax, one weighted sum. Every matrix on the page is the
// one the step is talking about.

import { D_K, argmaxRow, attentionHead, getSentence, spread } from './model';

const fixed = (value, digits = 2) => Number(value).toFixed(digits);

export function buildAttentionTrace({ sentenceId, causal, scale = true, focusRow = 3 }) {
    const sentence = getSentence(sentenceId);
    const tokens = sentence.tokens;
    if (!Number.isInteger(focusRow) || focusRow < 0 || focusRow >= tokens.length) {
        throw new Error(`Pick a query token between 1 and ${tokens.length}.`);
    }

    const head = attentionHead({ embeddings: sentence.embeddings, causal, scale });
    const unscaled = attentionHead({ embeddings: sentence.embeddings, causal, scale: false });
    const focusToken = tokens[focusRow];
    const attendedTo = tokens[argmaxRow(head.weights[focusRow])];
    const focusWeight = Math.max(...head.weights[focusRow]);

    const steps = [
        {
            id: 'tokens',
            title: 'Four tokens, four vectors',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'VASWANI2017', detail: '§3.1' }],
            explanation:
                `“${tokens.join(' ')}”. ${sentence.note} Each token arrives as an embedding — ` +
                'here four hand-set dimensions standing in for animacy, motion, ' +
                'determiner-ness, and reference, so the arithmetic below stays readable. In a ' +
                'real model these are thousands of learned dimensions with no such labels.',
            kind: 'values',
            data: {
                matrix: 'embeddings',
                values: tokens.map((token, i) => ({
                    label: token,
                    value: sentence.embeddings[i].map((v) => fixed(v, 1)).join(', '),
                })),
            },
        },
        {
            id: 'qkv',
            title: 'Project into queries, keys, and values',
            provenance: 'paper',
            sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.1' }],
            explanation:
                'Three learned matrices turn each embedding into three different vectors. The ' +
                'query says what this token is looking for; the key advertises what it has to ' +
                'offer; the value is what it would contribute if chosen. One token, three ' +
                'roles — that separation is what distinguishes attention from a plain ' +
                'similarity lookup.',
            kind: 'formula',
            data: {
                matrix: 'Q',
                lines: [
                    { tex: 'Q = XW^Q, \\qquad K = XW^K, \\qquad V = XW^V' },
                    `dₖ = ${D_K} (head dimension)`,
                ],
            },
        },
        {
            id: 'scores',
            title: 'Every query meets every key',
            provenance: 'paper',
            sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.1' }, { key: 'LUONG2015' }],
            explanation:
                'QKᵀ is one matrix multiply that scores all pairs at once — row i, column j is ' +
                'how well token i’s query matches token j’s key. Luong’s 2015 paper argued ' +
                'this multiplicative form over the additive scoring Bahdanau used, on the ' +
                'grounds that it is a single fast matmul. That is exactly why it scales.',
            kind: 'values',
            data: {
                matrix: 'raw',
                values: [
                    { label: 'shape', value: `${tokens.length} × ${tokens.length}` },
                    { label: 'largest raw score', value: fixed(Math.max(...head.raw.flat())) },
                ],
            },
        },
        {
            id: 'scale',
            title: `Divide by √dₖ = ${fixed(Math.sqrt(D_K))}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.1, footnote 4' }],
            explanation:
                'A dot product of dₖ terms grows like √dₖ, so at realistic head sizes the raw ' +
                'scores would be large enough to push softmax into its flat region, where the ' +
                'gradient nearly vanishes. Dividing by √dₖ keeps the logits in a sane range. ' +
                `Spread before: ${fixed(spread(unscaled.scores), 3)}; after: ` +
                `${fixed(spread(head.scores), 3)}. It is one line in the paper and it is the ` +
                'difference between a model that trains and one that does not.',
            kind: 'formula',
            data: {
                matrix: 'scores',
                lines: [
                    { tex: '\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V' },
                    `√dₖ = ${fixed(Math.sqrt(D_K))}`,
                ],
            },
        },
        {
            id: 'softmax',
            title: 'Softmax turns scores into a distribution',
            provenance: 'paper',
            sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.1' }, { key: 'BAHDANAU2015' }],
            explanation:
                `Exponentiate, normalize: each row now sums to 1 and reads as “where this ` +
                `token looks”. “${focusToken}” puts ${fixed(focusWeight * 100, 1)}% of its ` +
                `attention on “${attendedTo}”. Bahdanau, Cho and Bengio introduced exactly ` +
                'this soft alignment in 2015 so a translator could look back at the source ' +
                'sentence instead of squeezing it through one fixed vector.',
            kind: 'values',
            data: {
                matrix: 'weights',
                highlightRow: focusRow,
                values: tokens.map((token, j) => ({
                    label: `${focusToken} → ${token}`,
                    value: `${fixed(head.weights[focusRow][j] * 100, 1)}%`,
                })),
            },
        },
        {
            id: 'mix',
            title: 'Mix the values',
            provenance: 'paper',
            sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.1' }],
            explanation:
                'The output for each token is the weighted average of every value vector, ' +
                'using that token’s attention row as the weights. Nothing is selected and ' +
                'nothing is discarded — the result is a blend, which is what makes the whole ' +
                'operation differentiable and therefore learnable.',
            kind: 'values',
            data: {
                matrix: 'output',
                highlightRow: focusRow,
                values: tokens.map((token, i) => ({
                    label: token,
                    value: head.output[i].map((v) => fixed(v)).join(', '),
                })),
            },
        },
        {
            id: 'causal',
            title: causal ? 'Masked: no looking ahead' : 'Unmasked: the whole sentence is visible',
            provenance: 'paper',
            sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.3' }],
            explanation: causal
                ? 'A decoder must not read the future, so positions to the right of the ' +
                  'diagonal are set to −∞ before the softmax and come out as exactly zero. ' +
                  'That single mask is what lets one parallel forward pass train on every ' +
                  'next-token prediction in a sequence at once.'
                : 'Encoder attention sees the entire sequence, which is why every cell above ' +
                  'the diagonal carries weight here. Toggle the mask to watch the upper ' +
                  'triangle go to zero — that is the difference between a BERT-style encoder ' +
                  'and a GPT-style decoder, in one matrix.',
            kind: 'values',
            data: {
                matrix: 'weights',
                values: [
                    { label: 'mask', value: causal ? 'causal (lower triangular)' : 'none' },
                    {
                        label: 'first token sees',
                        value: causal ? '1 token' : `${tokens.length} tokens`,
                    },
                ],
            },
        },
        {
            id: 'heads',
            title: 'Then do it several times over',
            provenance: 'paper',
            sourceRefs: [
                { key: 'VASWANI2017', detail: '§3.2.2' },
                { key: 'ELHAGE2021' },
            ],
            explanation:
                'One head can only average one way. Multi-head attention runs h of these in ' +
                'parallel on lower-dimensional projections and concatenates the results, so ' +
                'different heads can specialize — one tracking syntax, another coreference, ' +
                'another position. Interpretability work reads individual heads as circuits ' +
                'composing across layers, which is only possible because each head is exactly ' +
                'the small computation on this page.',
            caveat: {
                provenance: 'pedagogical',
                text: 'Four tokens, dₖ = 3, and projection matrices chosen by hand so the picture is legible. A production head is learned, dₖ is 64–128, sequences run to hundreds of thousands of tokens, and the O(n²) score matrix is never materialized — FlashAttention-style kernels stream it in tiles.',
                sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2.2' }, { key: 'ELHAGE2021' }],
            },
            kind: 'formula',
            data: {
                matrix: 'weights',
                lines: [
                    { tex: '\\mathrm{MultiHead}(Q,K,V) = \\mathrm{Concat}(\\mathrm{head}_1, \\dots, \\mathrm{head}_h)W^O' },
                    'each head: its own WQ, WK, WV on a slice of the model dimension',
                ],
            },
        },
    ];

    return { steps, artifacts: { sentence, tokens, head, unscaled, focusRow, causal } };
}
