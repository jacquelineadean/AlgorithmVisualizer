import MatrixStage from '../stages/MatrixStage';

// Whichever matrix the current step is discussing, drawn as a heat grid with
// the token labels attached. Every value comes from the trace's computed
// head — the stage does no linear algebra.

const DIMS = ['d₁', 'd₂', 'd₃', 'd₄'];

export default function AttentionStage({ steps, stepIndex, artifacts }) {
    const step = steps[stepIndex];
    const which = step.data?.matrix ?? 'weights';
    const { tokens, head, sentence } = artifacts;
    const highlight = step.data?.highlightRow != null ? { row: step.data.highlightRow } : {};

    const configs = {
        embeddings: {
            values: sentence.embeddings,
            colLabels: DIMS.slice(0, sentence.embeddings[0].length),
            caption: 'X — token embeddings',
            tone: 'gold',
            footer: 'hand-set dimensions: animacy · motion · determiner · reference',
        },
        Q: {
            values: head.Q.map((row, i) => [...row, ...head.K[i]]),
            colLabels: ['q₁', 'q₂', 'q₃', 'k₁', 'k₂', 'k₃'],
            caption: 'Q = XW^Q  (left)   and   K = XW^K  (right)',
            tone: 'cobalt',
            footer: 'V = XW^V follows the same shape',
        },
        raw: {
            values: head.raw,
            colLabels: tokens,
            caption: 'QKᵀ — raw pairwise scores, before scaling',
            tone: 'vermilion',
            footer: 'row i, column j: how well token i’s query matches token j’s key',
        },
        scores: {
            values: head.scores,
            colLabels: tokens,
            caption: 'QKᵀ / √dₖ — scaled scores',
            tone: 'vermilion',
            footer: 'same pattern, compressed range — softmax stays out of its flat region',
        },
        weights: {
            values: head.weights,
            colLabels: tokens,
            caption: 'softmax(QKᵀ/√dₖ) — attention weights, each row sums to 1',
            tone: 'cobalt',
            footer: 'row = the token doing the looking; column = the token looked at',
        },
        output: {
            values: head.output,
            colLabels: ['o₁', 'o₂', 'o₃'],
            caption: 'weights × V — the head’s output, one vector per token',
            tone: 'green',
            footer: 'each row is a weighted blend of every value vector',
        },
    };

    const config = configs[which] ?? configs.weights;

    return (
        <MatrixStage
            values={config.values}
            rowLabels={tokens}
            colLabels={config.colLabels}
            highlight={highlight}
            tone={config.tone}
            caption={config.caption}
            footer={config.footer}
            format={(value) =>
                which === 'weights' ? `${(value * 100).toFixed(0)}%` : value.toFixed(2)
            }
            ariaLabel={`${config.caption} for the sentence "${tokens.join(' ')}".`}
        />
    );
}
