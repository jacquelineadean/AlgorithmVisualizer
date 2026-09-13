import PlotStage from '../stages/PlotStage';
import { errorBand, estimateAfter } from './model';

// Two views over the same run: the dartboard while darts are landing, and
// the convergence plot once they have. Both fold artifacts the trace already
// recorded — the stage never throws a dart of its own.

export default function MonteCarloStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'darts';
    const { darts, count, curve, band } = artifacts;

    if (view === 'darts') {
        const shown =
            step.data?.eventBase >= count
                ? darts
                : darts.slice(0, Math.min(streamIndex, darts.length));
        const hits = shown.length ? shown.at(-1).hits : 0;
        const estimate = estimateAfter(hits, shown.length);
        return (
            <PlotStage
                square
                domain={[-1, 1]}
                range={[-1, 1]}
                xTicks={4}
                yTicks={4}
                marks={[
                    { type: 'rect', x0: -1, y0: -1, x1: 1, y1: 1, tone: 'faint' },
                    { type: 'circle', cx: 0, cy: 0, r: 1, tone: 'cobalt' },
                    {
                        type: 'points',
                        points: shown.map((dart) => ({
                            x: dart.x,
                            y: dart.y,
                            tone: dart.inside ? 'green' : 'vermilion',
                        })),
                        r: count > 4000 ? 1.4 : 2.4,
                        opacity: 0.72,
                    },
                ]}
                notes={[
                    `${hits.toLocaleString()} inside / ${shown.length.toLocaleString()} thrown`,
                    shown.length ? `π̂ = ${estimate.toFixed(4)}` : 'π̂ = —',
                ]}
                ariaLabel={`Dartboard with ${shown.length} darts; ${hits} inside the circle; estimate ${estimate.toFixed(
                    4
                )}.`}
            />
        );
    }

    // Convergence: the running estimate against a ±σ/√n envelope around π.
    const start = curve[0]?.n ?? 1;
    const envelope = curve.map((point) => ({ n: point.n, e: errorBand(point.n) }));
    const widest = envelope[0]?.e ?? 1;
    const span = Math.max(widest * 1.3, 0.08);

    return (
        <PlotStage
            domain={[start, count]}
            range={[Math.PI - span, Math.PI + span]}
            xTicks={5}
            yTicks={4}
            marks={[
                {
                    type: 'line',
                    points: envelope.map((point) => ({ x: point.n, y: Math.PI + point.e })),
                    tone: 'faint',
                    dashed: true,
                },
                {
                    type: 'line',
                    points: envelope.map((point) => ({ x: point.n, y: Math.PI - point.e })),
                    tone: 'faint',
                    dashed: true,
                },
                {
                    type: 'segment',
                    x1: start,
                    y1: Math.PI,
                    x2: count,
                    y2: Math.PI,
                    tone: 'ink',
                    dashed: true,
                },
                {
                    type: 'line',
                    points: curve.map((point) => ({ x: point.n, y: point.pi })),
                    tone: 'cobalt',
                    width: 2,
                },
                {
                    type: 'label',
                    x: count,
                    y: Math.PI + span * 0.82,
                    text: `±σ/√n = ${band.toFixed(4)} at n = ${count.toLocaleString()}`,
                    tone: 'faint',
                    anchor: 'end',
                },
            ]}
            xLabel="darts thrown"
            yLabel="estimate of π"
            notes={[`π = 3.14159…`]}
            ariaLabel="Running estimate of pi against the number of darts, inside a one-over-root-n error band."
        />
    );
}
