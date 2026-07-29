import MatrixStage from '../stages/MatrixStage';
import PlotStage from '../stages/PlotStage';
import { attentionHead, getSentence } from '../attention/model';
import { human } from './model';

// The focused stages the transformer map opens inside its leaf nodes.
// Both compute: the parameter chart from the chosen configuration, the
// attention grid by running the same head the attention page walks through
// (imported rather than duplicated — one computation, two consumers).

export function ParamsStage({ data }) {
    const { params } = data;
    const rows = [
        { label: 'embedding', value: params.embedding, tone: 'gold' },
        { label: 'positions', value: params.positional, tone: 'faint' },
        { label: 'attention', value: params.attention, tone: 'cobalt' },
        { label: 'MLP', value: params.mlp, tone: 'green' },
        { label: 'unembedding', value: params.unembedding, tone: 'vermilion' },
    ].filter((row) => row.value > 0);

    return (
        <PlotStage
            domain={[0, params.total]}
            range={[-0.5, rows.length - 0.5]}
            xTicks={4}
            yTicks={rows.length - 1}
            marks={[
                ...rows.map((row, i) => ({
                    type: 'segment',
                    x1: 0,
                    y1: i,
                    x2: row.value,
                    y2: i,
                    tone: row.tone,
                    width: 16,
                })),
                ...rows.map((row, i) => ({
                    type: 'label',
                    x: row.value,
                    y: i,
                    dy: 4,
                    text: `  ${row.label} · ${human(row.value)} (${(
                        (row.value / params.total) *
                        100
                    ).toFixed(0)}%)`,
                    tone: 'ink',
                })),
            ]}
            xLabel="parameters"
            notes={[`total ${human(params.total)}`]}
            ariaLabel={`Parameter breakdown: ${rows
                .map((row) => `${row.label} ${human(row.value)}`)
                .join(', ')}.`}
        />
    );
}

export function AttentionMiniStage() {
    const sentence = getSentence('animal');
    const head = attentionHead({ embeddings: sentence.embeddings });
    return (
        <MatrixStage
            values={head.weights}
            rowLabels={sentence.tokens}
            colLabels={sentence.tokens}
            max={1}
            format={(value) => `${(value * 100).toFixed(0)}%`}
            caption="softmax(QKᵀ/√dₖ) — one live head on “The animal crossed it”"
            footer="row = the token looking; column = the token looked at"
            ariaLabel="Attention weight matrix for a four-token sentence."
        />
    );
}

export const STAGE_KINDS = {
    params: ParamsStage,
    attention: AttentionMiniStage,
};
