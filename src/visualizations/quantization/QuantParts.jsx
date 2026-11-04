import './QuantStage.css';

// SVG building blocks shared by the three quantization stages. Each page
// draws one fixed-size SVG (so the instrument never changes height) and
// places these groups inside it; all of them share one column geometry, so
// channel j of a bar chart sits exactly above column j of a weight grid.
// Like the rest of the stage kit they compute nothing — every value arrives
// from trace artifacts.
//
// Why not PlotStage / MatrixStage: those are whole SVGs with their own
// viewBox, and two of them side by side scale their type below legibility.
// These are groups that compose inside one viewBox instead.

const fmt2 = (value) => {
    const abs = Math.abs(value);
    if (abs >= 100) return value.toFixed(0);
    if (abs >= 10) return value.toFixed(1);
    return value.toFixed(2);
};

// A labelled matrix. Cell tint encodes |tint| (defaults to |value|) against
// `max`; `colTone` / `colState` restyle whole columns (quantized, current,
// faded…); `dividers` draws group boundaries before the given columns;
// `small` sets denser type for 8 × 8 panels.
export function HeatGrid({
    x = 0,
    y = 0,
    values,
    tint,
    max,
    cellW = 50,
    cellH = 26,
    labelW = 30,
    rowLabels = [],
    colLabels,
    tone = 'cobalt',
    colTone = [],
    colState = [],
    rowState = [],
    format = fmt2,
    dividers = [],
    showText = true,
    small = false,
}) {
    const shades = tint ?? values;
    const peak = max ?? Math.max(1e-9, ...shades.flat().map(Math.abs));
    return (
        <g transform={`translate(${x} ${y})`} className="qs-grid">
            {colLabels &&
                colLabels.map((label, c) => (
                    <text
                        key={`h${c}`}
                        className={`qs-head${colState[c] === 'current' ? ' lit' : ''}`}
                        x={labelW + c * cellW + (cellW - 3) / 2}
                        y={-6}
                        textAnchor="middle"
                    >
                        {label}
                    </text>
                ))}
            {values.map((row, r) => (
                <g key={r} transform={`translate(0 ${r * cellH})`}>
                    <text
                        className={`qs-head${rowState[r] === 'current' ? ' lit' : ''}`}
                        x={labelW - 8}
                        y={cellH / 2 + 3}
                        textAnchor="end"
                    >
                        {rowLabels[r] ?? ''}
                    </text>
                    {row.map((value, c) => {
                        const level = Math.min(1, Math.abs(shades[r][c]) / peak);
                        const state = colState[c] ?? '';
                        return (
                            <g key={c} transform={`translate(${labelW + c * cellW} 0)`}>
                                <rect
                                    className={`qs-cell qsf-${colTone[c] ?? tone} ${state}`}
                                    width={cellW - 3}
                                    height={cellH - 3}
                                    rx="3"
                                    opacity={state === 'faded' ? 0.05 + 0.3 * level : 0.1 + 0.8 * level}
                                />
                                {state === 'current' && (
                                    <rect className="qs-cell-ring" width={cellW - 3} height={cellH - 3} rx="3" />
                                )}
                                {showText && (
                                    <text
                                        className={`qs-value${small ? ' small' : ''}${
                                            level > 0.62 && state !== 'faded' ? ' inverted' : ''
                                        }`}
                                        x={(cellW - 3) / 2}
                                        y={cellH / 2 + 2.5}
                                        textAnchor="middle"
                                    >
                                        {format(value)}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            ))}
            {dividers.map((c) => (
                <line
                    key={`d${c}`}
                    className="qs-divider"
                    x1={labelW + c * cellW - 1.5}
                    x2={labelW + c * cellW - 1.5}
                    y1={-2}
                    y2={values.length * cellH - 1}
                />
            ))}
        </g>
    );
}

// One or two bar series per channel, aligned to a HeatGrid's columns. By
// default each series is scaled to its own maximum — the shape across
// channels is the point; pass `max` on a series to hold a fixed scale
// (levels out of 127, or losses against a baseline). `labels` names the
// channels under the baseline; a series with `format` prints its values.
export function ChannelBars({
    x = 0,
    y = 0,
    height = 60,
    cellW = 50,
    labelW = 30,
    series,
    label,
    labels,
    highlight = [],
}) {
    const n = series.length;
    const count = series[0].values.length;
    const barW = Math.min(18, (cellW - 12) / n);
    // Printed values sit above their bars, so leave room for them under the caption.
    const headroom = series.some((item) => item.format) ? 18 : 4;
    return (
        <g transform={`translate(${x} ${y})`} className="qs-bars">
            <line className="qs-baseline" x1={labelW} x2={labelW + count * cellW - 3} y1={height} y2={height} />
            {series.map((item, k) => {
                const peak = item.max ?? Math.max(1e-9, ...item.values.map(Math.abs));
                return item.values.map((value, c) => {
                    const h = Math.max(1, Math.min(1, Math.abs(value) / peak) * (height - headroom));
                    const left = labelW + c * cellW + (cellW - 3) / 2 - (n * barW) / 2 + k * barW;
                    return (
                        <g key={`${k}-${c}`}>
                            <rect
                                className={`qs-bar qsf-${item.tone}${highlight.includes(c) ? ' lit' : ''}`}
                                x={left + 1}
                                y={height - h}
                                width={barW - 2}
                                height={h}
                                rx="1.5"
                                style={item.opacity != null ? { opacity: item.opacity } : undefined}
                            />
                            {item.format && (
                                <text
                                    className="qs-bar-value"
                                    x={left + barW / 2}
                                    y={height - h - 4}
                                    textAnchor="middle"
                                >
                                    {item.format(value)}
                                </text>
                            )}
                        </g>
                    );
                });
            })}
            {labels &&
                labels.map((text, c) => (
                    <text
                        key={`x${c}`}
                        className="qs-head"
                        x={labelW + c * cellW + (cellW - 3) / 2}
                        y={height + 13}
                        textAnchor="middle"
                    >
                        {text}
                    </text>
                ))}
            {label && (
                <text className="qs-caption" x={labelW} y={-6}>
                    {label}
                </text>
            )}
            <text className="qs-note" x={labelW + count * cellW - 3} y={-6} textAnchor="end">
                {series.map((item, k) =>
                    item.caption ? (
                        <tspan key={k} className={`qst-${item.tone}`}>
                            {k > 0 ? '  ·  ' : ''}■ {item.caption}
                        </tspan>
                    ) : null
                )}
            </text>
        </g>
    );
}

// A small line chart with its own axes, placed inside a larger SVG.
export function MiniCurve({
    x = 0,
    y = 0,
    width = 280,
    height = 200,
    domain,
    range,
    series,
    markers = [],
    xLabel,
    yLabel,
    xTicks = [],
    yTicks = [],
    formatY = (value) => `${(value * 100).toFixed(0)}%`,
    formatX = (value) => String(value),
}) {
    const sx = (value) => ((value - domain[0]) / (domain[1] - domain[0])) * width;
    const sy = (value) => height - ((value - range[0]) / (range[1] - range[0])) * height;
    return (
        <g transform={`translate(${x} ${y})`} className="qs-curve">
            {yTicks.map((value) => (
                <g key={`y${value}`}>
                    <line className="qs-gridline" x1={0} x2={width} y1={sy(value)} y2={sy(value)} />
                    <text className="qs-tick" x={-6} y={sy(value) + 3} textAnchor="end">
                        {formatY(value)}
                    </text>
                </g>
            ))}
            {xTicks.map((value) => (
                <text key={`x${value}`} className="qs-tick" x={sx(value)} y={height + 14} textAnchor="middle">
                    {formatX(value)}
                </text>
            ))}
            <line className="qs-axis" x1={0} x2={width} y1={height} y2={height} />
            <line className="qs-axis" x1={0} x2={0} y1={0} y2={height} />
            {series.map((item, k) =>
                item.points.length > 0 ? (
                    <g key={k} className={`qst-${item.tone}`}>
                        <polyline
                            className={`qs-line${item.dashed ? ' dashed' : ''}`}
                            points={item.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
                        />
                        {item.dots &&
                            item.points.map((p, i) => (
                                <circle key={i} className="qs-dot" cx={sx(p.x)} cy={sy(p.y)} r="2.5" />
                            ))}
                    </g>
                ) : null
            )}
            {markers.map((marker, k) => (
                <g key={`m${k}`} className={`qs-marker qst-${marker.tone}`}>
                    <circle cx={sx(marker.x)} cy={sy(marker.y)} r="6" />
                    {marker.label && (
                        <text
                            x={sx(marker.x)}
                            y={sy(marker.y) + (marker.below ? 20 : -10)}
                            textAnchor={marker.anchor ?? 'middle'}
                        >
                            {marker.label}
                        </text>
                    )}
                </g>
            ))}
            {xLabel && (
                <text className="qs-axis-label" x={width} y={height + 28} textAnchor="end">
                    {xLabel}
                </text>
            )}
            {yLabel && (
                <text className="qs-axis-label" x={0} y={-8}>
                    {yLabel}
                </text>
            )}
        </g>
    );
}

// Labelled horizontal bars comparing methods on one error scale. Rows keep
// their slot while hidden so the ledger fills in without the layout moving.
export function Ledger({ x = 0, y = 0, width = 280, rowH = 34, rows, max, format }) {
    const peak = max ?? Math.max(1e-9, ...rows.map((row) => row.value));
    const barMax = width - 64;
    return (
        <g transform={`translate(${x} ${y})`} className="qs-ledger">
            {rows.map((row, i) => (
                <g key={row.label} transform={`translate(0 ${i * rowH})`} opacity={row.shown === false ? 0 : 1}>
                    <text className={`qs-ledger-label${row.lit ? ' lit' : ''}`} x={0} y={10}>
                        {row.label}
                    </text>
                    <rect className="qs-ledger-track" x={0} y={15} width={barMax} height={9} rx="2" />
                    <rect
                        className={`qs-bar qsf-${row.tone}`}
                        x={0}
                        y={15}
                        width={Math.max(2, (row.value / peak) * barMax)}
                        height={9}
                        rx="2"
                    />
                    <text className="qs-ledger-value" x={barMax + 6} y={23}>
                        {format(row.value)}
                    </text>
                </g>
            ))}
        </g>
    );
}

// The frame every quantization stage renders into: a left block (grids and
// channel bars, x 0–440) and a right panel (x 460–760), each its own
// fixed-size SVG. Side by side they share one scale; on a phone the panel
// drops below the block instead of shrinking both to half size. Either way
// the height never changes between steps. Callers draw both halves in the
// same 760-wide coordinate system — the right SVG's viewBox is offset.
export const LEFT_W = 440;
export const RIGHT_X = 460;
export const RIGHT_W = 300;

export function QuantFrame({ height, ariaLabel, left, right }) {
    return (
        <div className="quant-stage" role="img" aria-label={ariaLabel}>
            <svg className="quant-half" viewBox={`0 0 ${LEFT_W} ${height}`} aria-hidden="true">
                {left}
            </svg>
            <svg className="quant-half" viewBox={`${RIGHT_X} 0 ${RIGHT_W} ${height}`} aria-hidden="true">
                {right}
            </svg>
        </div>
    );
}

// Panel title for the right-hand half of a stage.
export const PanelTitle = ({ x, y, children }) => (
    <text className="qs-caption" x={x} y={y}>
        {children}
    </text>
);
