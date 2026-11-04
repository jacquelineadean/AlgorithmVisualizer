import { HeatGrid, MiniCurve, PanelTitle, QuantFrame } from '../quantization/QuantParts';
import { COLS } from './model';

// Left: the weight matrix as the step leaves it, and beneath it how far each
// weight has moved from the original. Right: one of four panels — the
// ruler (each row's grid levels as ticks, its weights as dots), H, the
// Cholesky factor U, or the error curve. Every value is read from the
// trace; the sweep step folds its recorded frames up to the stream index.

const H_BOX = 330;
const LABEL_W = 30;
const CELL_W = 50;
const CELL_H = 26;
const GRID_Y = 52;
const DELTA_Y = 196;
const PANEL_X = 470;
const PANEL_W = 280;

const colLabels = Array.from({ length: COLS }, (_, j) => `c${j + 1}`);

// Unmoved weights show a dot; small moves keep a third decimal rather than
// collapsing to a signed "-0.00".
const formatDelta = (value) => {
    const abs = Math.abs(value);
    if (abs < 5e-4) return '·';
    return abs < 0.01 ? value.toFixed(3) : value.toFixed(2);
};

// Which matrix to draw and how far along the sweep it is.
function resolveFrame(step, artifacts, streamIndex) {
    const { W, rtn, obsState, Q, frames } = artifacts;
    switch (step.data?.frame) {
        case 'rtn':
            return { matrix: rtn, done: COLS, current: null, block: null };
        case 'obs':
            return { matrix: obsState, done: 1, current: 0, block: null };
        case 'stream': {
            const k = Math.min(streamIndex, frames.length);
            if (k === 0) return { matrix: W, done: 0, current: null, block: frames[0].block };
            const frame = frames[k - 1];
            return frame.kind === 'column'
                ? { matrix: frame.weights, done: frame.col + 1, current: frame.col, block: frame.block }
                : { matrix: frame.weights, done: frame.block[1], current: null, block: null };
        }
        case 'final':
            return { matrix: Q, done: COLS, current: null, block: null };
        default:
            return { matrix: W, done: 0, current: null, block: null, untouched: true };
    }
}

// quantized · current · updated (inside the block) · waiting (beyond it)
const columnStates = ({ done, current, block, untouched }) =>
    Array.from({ length: COLS }, (_, c) => {
        if (untouched) return '';
        if (c === current) return 'current';
        if (c < done) return 'done';
        if (block && c >= block[1]) return 'faded';
        return 'pending';
    });

const TONE = { done: 'green', current: 'green', pending: 'cobalt', faded: 'cobalt', '': 'cobalt' };

function Ruler({ artifacts, frame, states }) {
    const { W, levels, laneDomains, grids } = artifacts;
    const left = PANEL_X + 26;
    const width = PANEL_W - 30;
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                grid levels (ticks) · weights (dots)
            </PanelTitle>
            {W.map((row, r) => {
                const [lo, hi] = laneDomains[r];
                const sx = (value) => left + ((value - lo) / (hi - lo)) * width;
                const y = 62 + r * 66;
                return (
                    <g key={r}>
                        <text className="qs-head" x={PANEL_X} y={y + 4}>
                            r{r + 1}
                        </text>
                        <line className="qs-lane" x1={left} x2={left + width} y1={y} y2={y} />
                        {levels[r].map((level, i) => (
                            <line key={i} className="qs-level" x1={sx(level)} x2={sx(level)} y1={y - 9} y2={y + 9} />
                        ))}
                        {row.map((original, c) => {
                            const value = frame.matrix[r][c];
                            const state = states[c];
                            const moved = Math.abs(value - original) > 1e-9;
                            return (
                                <g key={c}>
                                    {moved && (
                                        <>
                                            <circle className="qs-weight original" cx={sx(original)} cy={y} r="4" />
                                            <line className="qs-drift" x1={sx(original)} x2={sx(value)} y1={y} y2={y} />
                                        </>
                                    )}
                                    <circle
                                        className={`qs-weight qsf-${TONE[state]}${state === 'current' ? ' current' : ''}`}
                                        cx={sx(value)}
                                        cy={y}
                                        r={state === 'current' ? 6 : 4.5}
                                        opacity={state === 'faded' ? 0.45 : 0.9}
                                    />
                                </g>
                            );
                        })}
                        <text className="qs-note" x={left + width} y={y + 24} textAnchor="end">
                            step {grids[r].scale.toFixed(3)}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

function MatrixPanel({ values, caption, format, tone }) {
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                {caption}
            </PanelTitle>
            <HeatGrid
                x={PANEL_X}
                y={42}
                values={values}
                cellW={31}
                cellH={27}
                labelW={26}
                rowLabels={colLabels}
                colLabels={colLabels}
                tone={tone}
                format={format}
                small
            />
        </g>
    );
}

function Curve({ artifacts }) {
    const { curve, rtnError, gptqError } = artifacts;
    const top = Math.max(...curve.flatMap((point) => [point.rtn, point.gptq])) * 1.2;
    const step = top > 0.4 ? 0.1 : top > 0.2 ? 0.05 : top > 0.08 ? 0.02 : 0.01;
    const yTicks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                output error after c columns are quantized
            </PanelTitle>
            <MiniCurve
                x={PANEL_X + 40}
                y={44}
                width={PANEL_W - 52}
                height={214}
                domain={[0, COLS]}
                range={[0, top]}
                xTicks={Array.from({ length: COLS + 1 }, (_, i) => i)}
                yTicks={yTicks}
                xLabel="columns quantized"
                series={[
                    { points: curve.map((p) => ({ x: p.columns, y: p.rtn })), tone: 'vermilion', dashed: true, dots: true },
                    { points: curve.map((p) => ({ x: p.columns, y: p.gptq })), tone: 'cobalt', dots: true },
                ]}
                markers={[
                    { x: COLS, y: rtnError, tone: 'vermilion', label: `RTN ${(rtnError * 100).toFixed(1)}%`, anchor: 'end' },
                    { x: COLS, y: gptqError, tone: 'cobalt', label: `GPTQ ${(gptqError * 100).toFixed(1)}%`, anchor: 'end' },
                ]}
                formatY={(value) => `${Math.round(value * 100)}%`}
            />
        </g>
    );
}

export default function GptqStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'ruler';
    const frame = resolveFrame(step, artifacts, streamIndex);
    const states = columnStates(frame);
    const { W, bits, blockSize, deltaMax, weightMax, H, U } = artifacts;
    const colTone = states.map((state) => TONE[state]);
    const delta = frame.matrix.map((row, r) => row.map((value, j) => value - W[r][j]));
    const rowLabels = W.map((_, r) => `r${r + 1}`);
    const blocks = Array.from({ length: Math.ceil(COLS / blockSize) }, (_, k) => [
        k * blockSize,
        Math.min(COLS, (k + 1) * blockSize),
    ]);
    const showBlocks = blockSize < COLS && (step.data?.frame === 'stream' || step.id === 'lazy');
    const where =
        frame.current != null
            ? `quantizing column ${frame.current + 1}`
            : frame.untouched
            ? 'original weights'
            : step.data?.frame === 'rtn'
            ? 'rounded to nearest'
            : frame.done === COLS
            ? 'every column quantized'
            : `${frame.done} of ${COLS} columns quantized`;

    return (
        <QuantFrame
            height={H_BOX}
            ariaLabel={`GPTQ on a ${W.length} by ${COLS} layer at ${bits} bits: ${where}.`}
            left={
                <>
                    <text className="qs-caption" x={LABEL_W} y={12}>
                        Ŵ — {where}
                    </text>
                    {showBlocks &&
                        blocks.map(([a, b], k) => {
                            const x1 = LABEL_W + a * CELL_W;
                            const x2 = LABEL_W + b * CELL_W - 3;
                            const lit = frame.block && frame.block[0] === a;
                            return (
                                <path
                                    key={k}
                                    className={`qs-bracket${lit ? ' lit' : ''}`}
                                    d={`M${x1} 30 V24 H${x2} V30`}
                                />
                            );
                        })}
                    <HeatGrid
                        y={GRID_Y}
                        values={frame.matrix}
                        max={weightMax}
                        cellW={CELL_W}
                        cellH={CELL_H}
                        labelW={LABEL_W}
                        rowLabels={rowLabels}
                        colLabels={colLabels}
                        colTone={colTone}
                        colState={states}
                    />
                    <text className="qs-caption" x={LABEL_W} y={DELTA_Y - 12}>
                        Ŵ − W — how far each weight has moved
                    </text>
                    <HeatGrid
                        y={DELTA_Y}
                        values={delta}
                        max={deltaMax}
                        cellW={CELL_W}
                        cellH={CELL_H}
                        labelW={LABEL_W}
                        rowLabels={rowLabels}
                        tone="vermilion"
                        colState={states.map((state) => (state === 'current' ? 'current' : state === 'faded' ? 'faded' : ''))}
                        format={formatDelta}
                    />
                    <g className="qs-legend" transform={`translate(${LABEL_W} ${H_BOX - 10})`}>
                        <rect className="qsf-green" width="10" height="10" y="-9" rx="2" opacity="0.8" />
                        <text className="qs-note" x="14">quantized</text>
                        <rect className="qsf-cobalt" x="86" width="10" height="10" y="-9" rx="2" opacity="0.8" />
                        <text className="qs-note" x="100">not yet — compensating</text>
                        <rect className="qsf-cobalt" x="252" width="10" height="10" y="-9" rx="2" opacity="0.3" />
                        <text className="qs-note" x="266">waiting for block update</text>
                    </g>
                </>
            }
            right={
                <>
                    {view === 'ruler' && <Ruler artifacts={artifacts} frame={frame} states={states} />}
                    {view === 'hessian' && (
                        <MatrixPanel
                            values={H}
                            caption={`H = 2XXᵀ — one matrix for all ${W.length} rows`}
                            format={(value) => value.toFixed(1)}
                            tone="gold"
                        />
                    )}
                    {view === 'cholesky' && (
                        <MatrixPanel
                            values={U}
                            caption="U — the Cholesky factor of H⁻¹"
                            format={(value) => (value === 0 ? '' : value.toFixed(2))}
                            tone="gold"
                        />
                    )}
                    {view === 'curve' && <Curve artifacts={artifacts} />}
                </>
            }
        />
    );
}
