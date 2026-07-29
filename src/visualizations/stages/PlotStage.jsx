import './Stages.css';

// Declarative cartesian plot shared by the Phase 4 statistics and ML
// entries: Monte Carlo darts, k-means clusters, the perceptron's decision
// line, least-squares residuals, and the CLT's sampling histogram all draw
// through this one primitive. Callers pass data-space marks; the stage owns
// the axes, the scales, and nothing else. It never computes — marks are
// derived from trace artifacts by the caller.
//
// Marks (all coordinates in data space):
//   { type: 'points',  points: [{x, y, tone?, r?}], tone?, r?, opacity? }
//   { type: 'line',    points: [{x, y}], tone?, dashed?, width? }
//   { type: 'bars',    bars: [{x0, x1, y, tone?, opacity?}] }
//   { type: 'segment', x1, y1, x2, y2, tone?, dashed?, width? }
//   { type: 'circle',  cx, cy, r, tone?, dashed?, fill? }
//   { type: 'rect',    x0, y0, x1, y1, tone?, dashed?, fill? }
//   { type: 'marker',  x, y, label?, tone?, r? }   — a ringed centroid/knot
//   { type: 'label',   x, y, text, tone?, anchor?, dy? }

const W = 760;
const H = 320;
const PAD = { top: 18, right: 20, bottom: 34, left: 52 };

const tick = (value) => {
    const abs = Math.abs(value);
    if (abs >= 1000) return value.toFixed(0);
    if (abs >= 10) return value.toFixed(abs % 1 === 0 ? 0 : 1);
    if (abs === 0) return '0';
    return value.toFixed(2).replace(/0$/, '');
};

const ticksFor = (min, max, count) =>
    Array.from({ length: count + 1 }, (_, i) => min + ((max - min) * i) / count);

export default function PlotStage({
    domain = [0, 1],
    range = [0, 1],
    marks = [],
    xLabel,
    yLabel,
    xTicks = 4,
    yTicks = 4,
    notes = [],
    ariaLabel,
    square = false,
}) {
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    // Square mode keeps unit circles round (Monte Carlo π needs it).
    const boxW = square ? Math.min(plotW, plotH) : plotW;
    const left = PAD.left + (plotW - boxW) / 2;

    const sx = (x) => left + ((x - domain[0]) / (domain[1] - domain[0])) * boxW;
    const sy = (y) => PAD.top + plotH - ((y - range[0]) / (range[1] - range[0])) * plotH;
    const cls = (tone, prefix = 'pl') => `${prefix}-${tone ?? 'ink'}`;

    const renderMark = (mark, key) => {
        switch (mark.type) {
            case 'points':
                return (
                    <g key={key} className="pl-points" opacity={mark.opacity ?? 1}>
                        {mark.points.map((p, i) => (
                            <circle
                                key={i}
                                className={cls(p.tone ?? mark.tone, 'plf')}
                                cx={sx(p.x)}
                                cy={sy(p.y)}
                                r={p.r ?? mark.r ?? 3}
                            />
                        ))}
                    </g>
                );
            case 'line':
                return (
                    <polyline
                        key={key}
                        className={`pl-line ${cls(mark.tone)}${mark.dashed ? ' dashed' : ''}`}
                        strokeWidth={mark.width ?? 2}
                        points={mark.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
                    />
                );
            case 'bars':
                return (
                    <g key={key}>
                        {mark.bars.map((bar, i) => {
                            const x = sx(bar.x0);
                            const width = Math.max(1, sx(bar.x1) - x - 1);
                            const y = sy(bar.y);
                            return (
                                <rect
                                    key={i}
                                    className={cls(bar.tone ?? mark.tone, 'plf')}
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={Math.max(0, sy(range[0]) - y)}
                                    opacity={bar.opacity ?? mark.opacity ?? 1}
                                    rx="2"
                                />
                            );
                        })}
                    </g>
                );
            case 'segment':
                return (
                    <line
                        key={key}
                        className={`pl-line ${cls(mark.tone)}${mark.dashed ? ' dashed' : ''}`}
                        strokeWidth={mark.width ?? 1.5}
                        x1={sx(mark.x1)}
                        y1={sy(mark.y1)}
                        x2={sx(mark.x2)}
                        y2={sy(mark.y2)}
                    />
                );
            case 'circle':
                return (
                    <circle
                        key={key}
                        className={`pl-shape ${cls(mark.tone)}${mark.dashed ? ' dashed' : ''}${
                            mark.fill ? ' filled' : ''
                        }`}
                        cx={sx(mark.cx)}
                        cy={sy(mark.cy)}
                        r={Math.abs(sx(mark.cx + mark.r) - sx(mark.cx))}
                    />
                );
            case 'rect':
                return (
                    <rect
                        key={key}
                        className={`pl-shape ${cls(mark.tone)}${mark.dashed ? ' dashed' : ''}${
                            mark.fill ? ' filled' : ''
                        }`}
                        x={sx(Math.min(mark.x0, mark.x1))}
                        y={sy(Math.max(mark.y0, mark.y1))}
                        width={Math.abs(sx(mark.x1) - sx(mark.x0))}
                        height={Math.abs(sy(mark.y1) - sy(mark.y0))}
                        rx="3"
                    />
                );
            case 'marker':
                return (
                    <g key={key} className={`pl-marker ${cls(mark.tone)}`}>
                        <circle cx={sx(mark.x)} cy={sy(mark.y)} r={mark.r ?? 8} />
                        <circle className="pl-marker-core" cx={sx(mark.x)} cy={sy(mark.y)} r="2.5" />
                        {mark.label && (
                            <text x={sx(mark.x)} y={sy(mark.y) - (mark.r ?? 8) - 6} textAnchor="middle">
                                {mark.label}
                            </text>
                        )}
                    </g>
                );
            case 'label':
                return (
                    <text
                        key={key}
                        className={`pl-text ${cls(mark.tone)}`}
                        x={sx(mark.x)}
                        y={sy(mark.y) + (mark.dy ?? 0)}
                        textAnchor={mark.anchor ?? 'start'}
                    >
                        {mark.text}
                    </text>
                );
            default:
                return null;
        }
    };

    return (
        <svg className="plot-stage" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
            {/* Gridlines + ticks */}
            {ticksFor(range[0], range[1], yTicks).map((value) => (
                <g key={`y${value}`}>
                    <line className="pl-grid" x1={left} x2={left + boxW} y1={sy(value)} y2={sy(value)} />
                    <text className="pl-tick" x={left - 8} y={sy(value) + 4} textAnchor="end">
                        {tick(value)}
                    </text>
                </g>
            ))}
            {ticksFor(domain[0], domain[1], xTicks).map((value) => (
                <text
                    key={`x${value}`}
                    className="pl-tick"
                    x={sx(value)}
                    y={H - PAD.bottom + 18}
                    textAnchor="middle"
                >
                    {tick(value)}
                </text>
            ))}
            <line
                className="pl-axis"
                x1={left}
                x2={left + boxW}
                y1={sy(Math.max(range[0], Math.min(range[1], 0)))}
                y2={sy(Math.max(range[0], Math.min(range[1], 0)))}
            />
            <line className="pl-axis" x1={left} x2={left} y1={PAD.top} y2={PAD.top + plotH} />

            {marks.map(renderMark)}

            {xLabel && (
                <text className="pl-axis-label" x={left + boxW} y={H - 4} textAnchor="end">
                    {xLabel}
                </text>
            )}
            {yLabel && (
                <text className="pl-axis-label" x={left - 44} y={PAD.top - 6}>
                    {yLabel}
                </text>
            )}
            {notes.map((note, i) => (
                <text key={i} className="pl-note" x={left + boxW} y={PAD.top + 12 + i * 16} textAnchor="end">
                    {note}
                </text>
            ))}
        </svg>
    );
}
