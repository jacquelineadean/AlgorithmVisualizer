import { ChannelBars, HeatGrid, Ledger, MiniCurve, PanelTitle, QuantFrame } from '../quantization/QuantParts';
import { COLS } from './model';

// Left: how loud each input channel is (bars), the per-channel scales once
// there are any, and the weight matrix the layer actually uses — each cell
// tinted by its share of the output error, |ŵ − w| × mean|x|. Right: the
// ledger of methods tried so far, the single-channel s trials, or the α
// search curve. The search step folds its recorded points up to the stream
// index; every value, tints included, is read from trace artifacts.

const H_BOX = 312;
const LABEL_W = 30;
const CELL_W = 50;
const CELL_H = 26;
const BARS_Y = 30;
const BARS_H = 58;
const GRID_Y = 150;
const PANEL_X = 470;
const PANEL_W = 280;

const colLabels = Array.from({ length: COLS }, (_, j) => `c${j + 1}`);
const pct = (value) => `${(value * 100).toFixed(1)}%`;

function searchPoint(step, artifacts, streamIndex) {
    const history = artifacts.search.history;
    if (step.data?.frame !== 'search') return null;
    return history[Math.max(0, Math.min(streamIndex, history.length) - 1)];
}

function resolveFrame(step, artifacts, streamIndex) {
    const { W, rtn, keptByActivation, trial2, awq, byActivation, shares, search } = artifacts;
    const ones = W[0].map(() => 1);
    switch (step.data?.frame) {
        case 'rtn':
            return { matrix: rtn, share: shares.rtn, scales: ones, ring: [] };
        case 'keep':
            return { matrix: keptByActivation, share: shares.keep, scales: ones, ring: [byActivation], label: 'FP16' };
        case 'scale2':
            return {
                matrix: trial2.Weff,
                share: shares.scale2,
                scales: ones.map((_, j) => (j === byActivation ? 2 : 1)),
                ring: [byActivation],
            };
        case 'search': {
            const point = searchPoint(step, artifacts, streamIndex);
            const k = search.history.indexOf(point);
            return { matrix: point.Weff, share: shares.search[k], scales: point.s, ring: [] };
        }
        case 'awq':
            return { matrix: awq, share: shares.awq, scales: search.best.s, ring: [] };
        default:
            return { matrix: W, share: shares.original, scales: ones, ring: [], untouched: true };
    }
}

function LedgerPanel({ artifacts, shown }) {
    const { errors, byActivation, byWeight, search } = artifacts;
    const rows = [
        { label: 'round to nearest', value: errors.rtn, tone: 'vermilion' },
        { label: `FP16 c${byWeight + 1} (largest weights)`, value: errors.keepWeight, tone: 'faint' },
        { label: `FP16 c${byActivation + 1} (loudest inputs)`, value: errors.keepActivation, tone: 'gold' },
        { label: `AWQ, α* = ${search.best.alpha.toFixed(2)}, all INT`, value: errors.awq, tone: 'green', lit: true },
    ];
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                output error, method by method
            </PanelTitle>
            <Ledger
                x={PANEL_X}
                y={40}
                width={PANEL_W}
                rowH={58}
                rows={rows.map((row, i) => ({ ...row, shown: i < shown }))}
                max={Math.max(...rows.map((row) => row.value))}
                format={pct}
            />
        </g>
    );
}

function TrialsPanel({ artifacts }) {
    const { trials, errors } = artifacts;
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                scale one channel by s: error · Δ′/Δ
            </PanelTitle>
            <Ledger
                x={PANEL_X}
                y={34}
                width={PANEL_W}
                rowH={48}
                rows={trials.map((trial) => ({
                    label: `s = ${trial.s}  ·  Δ′/Δ ${trial.meanRatio.toFixed(2)}`,
                    value: trial.error,
                    tone: trial.s === 1 ? 'vermilion' : trial.error < errors.rtn ? 'green' : 'gold',
                    lit: trial.s === 2,
                }))}
                max={Math.max(...trials.map((trial) => trial.error))}
                format={pct}
            />
        </g>
    );
}

function AlphaPanel({ artifacts, point, done }) {
    const { history, best } = artifacts.search;
    const shown = history.slice(0, history.indexOf(point) + 1);
    const top = Math.max(...history.map((p) => p.error)) * 1.15;
    const step = top > 0.2 ? 0.05 : top > 0.08 ? 0.02 : 0.01;
    const yTicks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                output error for each α tried
            </PanelTitle>
            <MiniCurve
                x={PANEL_X + 40}
                y={44}
                width={PANEL_W - 52}
                height={214}
                domain={[0, 1]}
                range={[0, top]}
                xTicks={[0, 0.25, 0.5, 0.75, 1]}
                yTicks={yTicks}
                xLabel="α"
                formatY={(value) => `${Math.round(value * 100)}%`}
                series={[
                    {
                        points: [
                            { x: 0, y: history[0].error },
                            { x: 1, y: history[0].error },
                        ],
                        tone: 'vermilion',
                        dashed: true,
                    },
                    { points: shown.map((p) => ({ x: p.alpha, y: p.error })), tone: 'cobalt', dots: true },
                ]}
                markers={
                    done
                        ? [{ x: best.alpha, y: best.error, tone: 'green', label: `α* = ${best.alpha.toFixed(2)}` }]
                        : [{ x: point.alpha, y: point.error, tone: 'cobalt' }]
                }
            />
            <text className="qs-note qst-vermilion" x={PANEL_X + PANEL_W - 10} y={40} textAnchor="end">
                - - round to nearest (α = 0)
            </text>
        </g>
    );
}

export default function AwqStage({ steps, stepIndex, artifacts, streamIndex, streamDone }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'ledger';
    const bars = step.data?.bars ?? 'act';
    const frame = resolveFrame(step, artifacts, streamIndex);
    const { W, sX, weightNorm, byActivation, byWeight, groupSize, bits, shareMax } = artifacts;
    const dividers = Array.from({ length: COLS / groupSize - 1 }, (_, k) => (k + 1) * groupSize);
    const showScales = bars === 'scale' || step.data?.frame === 'scale2';

    const series =
        bars === 'both'
            ? [
                  { values: sX, tone: 'gold', caption: 'mean |x|' },
                  { values: weightNorm, tone: 'cobalt', caption: '‖w‖ per channel' },
              ]
            : [{ values: sX, tone: 'gold', caption: 'mean |x|' }];
    const highlight = bars === 'both' ? [byActivation, byWeight] : [byActivation];
    const point = searchPoint(step, artifacts, streamIndex);
    const colState = colLabels.map((_, j) => (frame.ring.includes(j) ? 'current' : ''));

    return (
        <QuantFrame
            height={H_BOX}
            ariaLabel={`AWQ on a ${W.length} by ${COLS} layer at ${bits} bits, groups of ${groupSize}; channel c${
                byActivation + 1
            } has the loudest inputs.`}
            left={
                <>
                    <ChannelBars
                        y={BARS_Y}
                        height={BARS_H}
                        cellW={CELL_W}
                        labelW={LABEL_W}
                        series={series}
                        highlight={highlight}
                        label="how loud each input channel is"
                    />
                    <text className="qs-head" x={LABEL_W - 8} y={BARS_Y + BARS_H + 22} textAnchor="end">
                        s
                    </text>
                    {colLabels.map((_, j) => (
                        <text
                            key={j}
                            className="qs-value"
                            x={LABEL_W + j * CELL_W + (CELL_W - 3) / 2}
                            y={BARS_Y + BARS_H + 22}
                            textAnchor="middle"
                            opacity={showScales ? 1 : 0.35}
                        >
                            ×{frame.scales[j].toFixed(2)}
                        </text>
                    ))}
                    <HeatGrid
                        y={GRID_Y}
                        values={frame.matrix}
                        tint={frame.share}
                        max={shareMax}
                        cellW={CELL_W}
                        cellH={CELL_H}
                        labelW={LABEL_W}
                        rowLabels={W.map((_, r) => `r${r + 1}`)}
                        colLabels={colLabels}
                        colState={colState}
                        tone="vermilion"
                        dividers={dividers}
                    />
                    <text className="qs-caption" x={LABEL_W} y={GRID_Y + W.length * CELL_H + 18}>
                        {frame.untouched
                            ? 'W — the original weights'
                            : frame.label
                            ? `Ŵ — c${byActivation + 1} kept in FP16, the rest INT${bits}`
                            : point
                            ? `Q(W·diag(s))·diag(s)⁻¹ at α = ${point.alpha.toFixed(2)}`
                            : `Ŵ — the weights the layer effectively uses, INT${bits}`}
                    </text>
                    <text className="qs-note" x={LABEL_W} y={H_BOX - 8}>
                        tint: |ŵ − w| × mean|x| · dashed lines: groups of {groupSize} share a grid
                    </text>
                </>
            }
            right={
                <>
                    {view === 'ledger' && <LedgerPanel artifacts={artifacts} shown={step.data?.ledger ?? 0} />}
                    {view === 'trials' && <TrialsPanel artifacts={artifacts} />}
                    {view === 'alpha' && <AlphaPanel artifacts={artifacts} point={point} done={streamDone} />}
                </>
            }
        />
    );
}
