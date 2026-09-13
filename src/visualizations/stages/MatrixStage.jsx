import './Stages.css';

// Heat-matrix stage: a labeled grid of numbers whose cell tint encodes
// magnitude. Two consumers earned it a place in the shared kit — the
// attention page (QKᵀ scores, softmax weights) and the Markov page (the
// transition matrix beside its graph).
//
//   values: number[][]           row-major, already computed by the model
//   rowLabels / colLabels: string[]
//   max?: number                 tint normalizer (defaults to the largest |v|)
//   highlight?: { row?, col?, cell?: [r, c] }
//   format?: (v) => string
//   tone?: 'cobalt' | 'green' | 'vermilion' | 'gold'

const CELL = 46;
const ROW_H = 30;
const LABEL_W = 96;
const TOP = 26;

export default function MatrixStage({
    values,
    rowLabels = [],
    colLabels = [],
    max,
    highlight = {},
    format = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)),
    tone = 'cobalt',
    caption,
    footer,
    ariaLabel,
}) {
    const rows = values.length;
    const cols = values[0]?.length ?? 0;
    const peak = max ?? Math.max(1e-9, ...values.flat().map((v) => Math.abs(v)));
    const height = TOP + rows * ROW_H + (footer ? 34 : 12);
    // The caption and footer are single unwrapped lines, so the viewBox has to
    // be wide enough for whichever is longest — a 4 × 4 matrix under a long
    // footer would otherwise clip it. IBM Plex Mono advances 0.6 em, so 11 px
    // type is ~6.6 px per character; the extra 8 px is breathing room.
    const textWidth = Math.ceil(Math.max(caption?.length ?? 0, footer?.length ?? 0) * 6.6) + 8;
    const width = Math.max(LABEL_W + cols * CELL + 16, textWidth, 260);

    return (
        <svg
            className="matrix-stage"
            viewBox={`0 0 ${width} ${height}`}
            // Rendered at natural size and allowed to shrink, never to stretch:
            // a small grid blown up to the full card width reads as a mistake.
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
        >
            {caption && (
                <text className="mx-caption" x="0" y="12">
                    {caption}
                </text>
            )}

            {colLabels.map((label, c) => (
                <text
                    key={`c${c}`}
                    className={`mx-head${highlight.col === c ? ' lit' : ''}`}
                    x={LABEL_W + c * CELL + CELL / 2}
                    y={TOP - 6}
                    textAnchor="middle"
                >
                    {label}
                </text>
            ))}

            {values.map((row, r) => (
                <g key={r} transform={`translate(0 ${TOP + r * ROW_H})`}>
                    <text
                        className={`mx-head${highlight.row === r ? ' lit' : ''}`}
                        x={LABEL_W - 10}
                        y={ROW_H / 2 + 4}
                        textAnchor="end"
                    >
                        {rowLabels[r] ?? ''}
                    </text>
                    {row.map((value, c) => {
                        const lit =
                            highlight.row === r ||
                            highlight.col === c ||
                            (highlight.cell && highlight.cell[0] === r && highlight.cell[1] === c);
                        return (
                            <g key={c} transform={`translate(${LABEL_W + c * CELL} 0)`}>
                                <rect
                                    className={`mx-cell mx-${tone}${lit ? ' lit' : ''}`}
                                    width={CELL - 3}
                                    height={ROW_H - 3}
                                    rx="4"
                                    opacity={0.12 + 0.82 * Math.min(1, Math.abs(value) / peak)}
                                />
                                <text
                                    className={`mx-value${
                                        Math.abs(value) / peak > 0.62 ? ' inverted' : ''
                                    }`}
                                    x={(CELL - 3) / 2}
                                    y={ROW_H / 2 + 3}
                                    textAnchor="middle"
                                >
                                    {format(value)}
                                </text>
                            </g>
                        );
                    })}
                </g>
            ))}

            {footer && (
                <text className="mx-footer" x="0" y={height - 10}>
                    {footer}
                </text>
            )}
        </svg>
    );
}
