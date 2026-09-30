import { ChannelBars, HeatGrid, Ledger, MiniCurve, PanelTitle, QuantFrame } from '../quantization/QuantParts';
import { CHANNELS, SHOWN_TOKENS, TOKENS } from './model';

// Left, channels aligned top to bottom: X (the first tokens), each channel's
// maximum in X and in W, the smoothing factors s, and W drawn out × in.
// Right: INT8 levels each channel reaches, contribution lost per channel,
// the granularity ledger, or the α sweep. The α step folds its recorded
// sweep up to the stream index; everything is read from trace artifacts.

const H_BOX = 372;
const LABEL_W = 30;
const CELL_W = 50;
const CELL_H = 21;
const X_Y = 40;
const BARS_Y = 190;
const BARS_H = 46;
const S_Y = 258;
const W_Y = 288;
const PANEL_X = 468;
const RIGHT_CELL = 32;

const colLabels = Array.from({ length: CHANNELS }, (_, j) => `c${j + 1}`);
const pct = (value) => `${(value * 100).toFixed(1)}%`;

function resolveFrame(step, artifacts, streamIndex) {
    const { shown, W, perTensor, perToken, perChannel, smoothed, actMax, weightMax, sweep, xStep, wStep } =
        artifacts;
    const ones = colLabels.map(() => 1);
    const raw = { actMax, weightMax, s: ones, xStep, wStep };
    switch (step.data?.frame) {
        case 'q-tensor':
            return { ...raw, X: shown.tensor, W: perTensor.Wq, note: 'per-tensor INT8', quantized: true };
        case 'q-token':
            return { ...raw, X: shown.token, W: perToken.Wq, note: 'per-token INT8', quantized: true };
        case 'q-channel':
            return { ...raw, X: shown.channel, W: perChannel.Wq, note: 'per-channel INT8 (hypothetical)', quantized: true };
        case 'smoothed':
            return {
                X: shown.smoothed,
                W: smoothed.Ws,
                actMax: artifacts.smoothedActMax,
                weightMax: artifacts.smoothedWeightMax,
                s: smoothed.s,
                xStep: smoothed.xStep,
                wStep: smoothed.wStep,
                note: `smoothed, α = ${artifacts.alpha.toFixed(2)}`,
                hat: true,
            };
        case 'q-smoothed':
            return {
                X: shown.smoothedQ,
                W: smoothed.Wq,
                actMax: artifacts.smoothedActMax,
                weightMax: artifacts.smoothedWeightMax,
                s: smoothed.s,
                xStep: smoothed.xStep,
                wStep: smoothed.wStep,
                note: `α = ${artifacts.alpha.toFixed(2)}, per-tensor INT8`,
                quantized: true,
                hat: true,
            };
        case 'sweep': {
            // While the sweep runs, draw the α being tried; once it ends, return to the reader's α.
            const done = streamIndex >= sweep.length;
            const point = done ? sweep[artifacts.alphaIndex] : sweep[Math.max(0, streamIndex - 1)];
            return {
                X: point.Xq,
                W: point.Wq,
                actMax: point.actMax,
                weightMax: point.weightMax,
                s: point.s,
                xStep: point.xStep,
                wStep: point.wStep,
                note: `α = ${point.alpha.toFixed(2)}${done ? ' (yours)' : ''}, per-tensor INT8`,
                quantized: true,
                hat: true,
                point,
            };
        }
        default:
            return { ...raw, X: shown.X, W, note: 'full precision' };
    }
}

function LevelsPanel({ frame }) {
    const levels = (maxima, step) => maxima.map((value) => Math.round(value / step));
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                INT8 levels each channel reaches (of 127)
            </PanelTitle>
            <ChannelBars
                x={PANEL_X}
                y={52}
                height={96}
                cellW={RIGHT_CELL}
                labelW={20}
                label="activations"
                labels={colLabels}
                series={[
                    { values: levels(frame.actMax, frame.xStep), tone: 'vermilion', max: 127, format: String },
                ]}
            />
            <ChannelBars
                x={PANEL_X}
                y={206}
                height={96}
                cellW={RIGHT_CELL}
                labelW={20}
                label="weights"
                labels={colLabels}
                series={[
                    { values: levels(frame.weightMax, frame.wStep), tone: 'cobalt', max: 127, format: String },
                ]}
            />
        </g>
    );
}

function ChannelsPanel({ artifacts, compare }) {
    const { perTensor, perToken, smoothed } = artifacts;
    const current = { tensor: perTensor, token: perToken, smoothed }[compare] ?? perTensor;
    const scaleMax = perTensor.worst;
    const series =
        compare === 'tensor'
            ? [{ values: perTensor.perChannel, tone: 'vermilion', max: scaleMax, format: pct, caption: 'per-tensor' }]
            : [
                  { values: perTensor.perChannel, tone: 'faint', max: scaleMax, opacity: 0.45, caption: 'per-tensor' },
                  {
                      values: current.perChannel,
                      tone: compare === 'smoothed' ? 'green' : 'gold',
                      max: scaleMax,
                      format: pct,
                      caption: compare === 'smoothed' ? 'smoothed' : 'per-token',
                  },
              ];
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                contribution lost, per channel
            </PanelTitle>
            <ChannelBars
                x={PANEL_X}
                y={62}
                height={230}
                cellW={RIGHT_CELL}
                labelW={20}
                labels={colLabels}
                series={series}
            />
        </g>
    );
}

function LedgerPanel({ artifacts, shown }) {
    const { perTensor, perToken, perChannel, smoothed, alpha } = artifacts;
    const rows = [
        { label: `per-tensor · mean ${pct(perTensor.mean)}`, value: perTensor.worst, tone: 'vermilion' },
        { label: `per-token · mean ${pct(perToken.mean)}`, value: perToken.worst, tone: 'gold' },
        { label: `per-channel (no GEMM) · mean ${pct(perChannel.mean)}`, value: perChannel.worst, tone: 'faint' },
        {
            label: `SmoothQuant α=${alpha.toFixed(2)} · mean ${pct(smoothed.mean)}`,
            value: smoothed.worst,
            tone: 'green',
            lit: true,
        },
    ];
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                worst channel’s loss, by activation scaling
            </PanelTitle>
            <Ledger
                x={PANEL_X}
                y={40}
                width={282}
                rowH={62}
                rows={rows.map((row, i) => ({ ...row, shown: i < shown }))}
                max={perTensor.worst}
                format={pct}
            />
        </g>
    );
}

function AlphaPanel({ artifacts, point, done }) {
    const { sweep, best, alphaIndex } = artifacts;
    const shown = done ? sweep : sweep.slice(0, sweep.indexOf(point) + 1);
    const top = Math.max(...sweep.map((p) => p.worst)) * 1.12;
    const step = top > 0.4 ? 0.1 : top > 0.16 ? 0.05 : 0.02;
    const yTicks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
    const mine = sweep[alphaIndex];
    return (
        <g>
            <PanelTitle x={PANEL_X} y={12}>
                loss vs α: worst (dashed) · mean
            </PanelTitle>
            <MiniCurve
                x={PANEL_X + 40}
                y={44}
                width={236}
                height={250}
                domain={[0, 1]}
                range={[0, top]}
                xTicks={[0, 0.25, 0.5, 0.75, 1]}
                yTicks={yTicks}
                xLabel="α — migration strength"
                formatY={(value) => `${Math.round(value * 100)}%`}
                series={[
                    { points: shown.map((p) => ({ x: p.alpha, y: p.worst })), tone: 'vermilion', dashed: true },
                    { points: shown.map((p) => ({ x: p.alpha, y: p.mean })), tone: 'cobalt', dots: true },
                ]}
                markers={
                    done
                        ? [
                              {
                                  x: best.alpha,
                                  y: best.mean,
                                  tone: 'green',
                                  label: `best ${best.alpha.toFixed(2)}`,
                                  anchor: mine.alpha <= best.alpha ? 'start' : 'end',
                              },
                              ...(Math.abs(mine.alpha - best.alpha) > 1e-9
                                  ? [
                                        {
                                            x: mine.alpha,
                                            y: mine.mean,
                                            tone: 'ink',
                                            label: `yours ${mine.alpha.toFixed(2)}`,
                                            anchor: mine.alpha < best.alpha ? 'end' : 'start',
                                        },
                                    ]
                                  : []),
                          ]
                        : [{ x: point.alpha, y: point.mean, tone: 'cobalt' }]
                }
            />
        </g>
    );
}

export default function SmoothQuantStage({ steps, stepIndex, artifacts, streamIndex, streamDone }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'levels';
    const frame = resolveFrame(step, artifacts, streamIndex);
    const { outliers } = artifacts;
    const colTone = colLabels.map((_, j) => (outliers.includes(j) ? 'vermilion' : 'cobalt'));
    const scaled = frame.s.some((value) => Math.abs(value - 1) > 1e-9);
    const fmtMax = (value) => (value >= 10 ? value.toFixed(1) : value.toFixed(2));

    return (
        <QuantFrame
            height={H_BOX}
            ariaLabel={`SmoothQuant on a layer with ${CHANNELS} input channels, outliers in ${outliers
                .map((j) => `c${j + 1}`)
                .join(' and ')}: ${frame.note}.`}
            left={
                <>
                    <text className="qs-caption" x={LABEL_W} y={12}>
                        {frame.hat ? 'X̂ = X·diag(s)⁻¹' : `X — ${SHOWN_TOKENS} of ${TOKENS} tokens`} · {frame.note}
                    </text>
                    <HeatGrid
                        y={X_Y}
                        values={frame.X}
                        cellW={CELL_W}
                        cellH={CELL_H}
                        labelW={LABEL_W}
                        rowLabels={frame.X.map((_, t) => `t${t + 1}`)}
                        colLabels={colLabels}
                        colTone={colTone}
                    />
                    <ChannelBars
                        y={BARS_Y}
                        height={BARS_H}
                        cellW={CELL_W}
                        labelW={LABEL_W}
                        highlight={outliers}
                        label="per-channel max"
                        series={[
                            {
                                values: frame.actMax,
                                tone: 'vermilion',
                                caption: `|${frame.hat ? 'X̂' : 'X'}| (top ${fmtMax(Math.max(...frame.actMax))})`,
                            },
                            {
                                values: frame.weightMax,
                                tone: 'cobalt',
                                caption: `|${frame.hat ? 'Ŵ' : 'W'}| (top ${fmtMax(Math.max(...frame.weightMax))})`,
                            },
                        ]}
                    />
                    <text className="qs-head" x={LABEL_W - 8} y={S_Y} textAnchor="end">
                        s
                    </text>
                    {frame.s.map((value, j) => (
                        <text
                            key={j}
                            className="qs-value"
                            x={LABEL_W + j * CELL_W + (CELL_W - 3) / 2}
                            y={S_Y}
                            textAnchor="middle"
                            opacity={scaled ? 1 : 0.35}
                        >
                            {value >= 10 ? value.toFixed(1) : value.toFixed(2)}
                        </text>
                    ))}
                    <text className="qs-caption" x={LABEL_W} y={W_Y - 10}>
                        {frame.hat ? 'Ŵ = W · diag(s)' : 'W'} — weights, out × in
                    </text>
                    <HeatGrid
                        y={W_Y}
                        values={frame.W}
                        cellW={CELL_W}
                        cellH={CELL_H}
                        labelW={LABEL_W}
                        rowLabels={frame.W.map((_, o) => `o${o + 1}`)}
                        colTone={colLabels.map(() => 'cobalt')}
                        format={(value) => (Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2))}
                    />
                </>
            }
            right={
                <>
                    {view === 'levels' && <LevelsPanel frame={frame} />}
                    {view === 'channels' && (
                        <ChannelsPanel artifacts={artifacts} compare={step.data?.compare} />
                    )}
                    {view === 'ledger' && <LedgerPanel artifacts={artifacts} shown={step.data?.ledger ?? 4} />}
                    {view === 'alpha' && <AlphaPanel artifacts={artifacts} point={frame.point} done={streamDone} />}
                </>
            }
        />
    );
}
