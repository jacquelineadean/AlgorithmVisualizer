import PlotStage from '../stages/PlotStage';
import { byAmplitude, epicycles, evaluate } from './model';

// Three views: the sampled path, its spectrum as a stem plot, and the
// epicycle chain drawing the reconstruction as the stream advances t around
// the loop. All of it is folded from coefficients the trace computed.

export default function FourierStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'path';
    const { points, coefficients, kept, samples } = artifacts;

    if (view === 'spectrum') {
        const ordered = [...coefficients].sort((a, b) => a.k - b.k);
        const peak = Math.max(...ordered.map((c) => c.amplitude));
        return (
            <PlotStage
                domain={[ordered[0].k, ordered.at(-1).k]}
                range={[0, peak * 1.15]}
                xTicks={6}
                marks={[
                    ...ordered.map((c) => ({
                        type: 'segment',
                        x1: c.k,
                        y1: 0,
                        x2: c.k,
                        y2: c.amplitude,
                        tone: c.amplitude > peak * 0.05 ? 'cobalt' : 'faint',
                        width: 2,
                    })),
                    {
                        type: 'points',
                        points: ordered.map((c) => ({ x: c.k, y: c.amplitude, tone: 'cobalt' })),
                        r: 2.5,
                    },
                ]}
                xLabel="frequency k (negative = clockwise)"
                yLabel="amplitude"
                notes={[`${samples} coefficients`]}
                ariaLabel="Amplitude spectrum of the path."
            />
        );
    }

    const bounds = Math.max(...points.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)])) * 1.25;

    if (view === 'path') {
        return (
            <PlotStage
                square
                domain={[-bounds, bounds]}
                range={[-bounds, bounds]}
                marks={[
                    { type: 'line', points: [...points, points[0]], tone: 'ink', width: 2 },
                    { type: 'points', points, tone: 'cobalt', r: 2.4, opacity: 0.8 },
                ]}
                notes={[`${points.length} samples`]}
                ariaLabel="The sampled closed path."
            />
        );
    }

    // Epicycles: t walks the loop as the stream advances.
    const ticks = step.stream?.events.length ?? samples;
    const progress = step.stream ? Math.min(streamIndex, ticks) / ticks : 1;
    const chain = epicycles(byAmplitude(kept), progress);
    const drawnCount = Math.max(2, Math.round(progress * samples) || samples);
    const drawn = Array.from({ length: drawnCount }, (_, i) =>
        evaluate(kept, (i / samples) * (progress || 1))
    );

    return (
        <PlotStage
            square
            domain={[-bounds, bounds]}
            range={[-bounds, bounds]}
            marks={[
                { type: 'line', points: [...points, points[0]], tone: 'faint', width: 1, dashed: true },
                ...chain.map((arm) => ({
                    type: 'circle',
                    cx: arm.from.x,
                    cy: arm.from.y,
                    r: arm.radius,
                    tone: 'faint',
                })),
                ...chain.map((arm) => ({
                    type: 'segment',
                    x1: arm.from.x,
                    y1: arm.from.y,
                    x2: arm.to.x,
                    y2: arm.to.y,
                    tone: 'cobalt',
                    width: 1.2,
                })),
                { type: 'line', points: drawn, tone: 'vermilion', width: 2.5 },
                {
                    type: 'marker',
                    x: chain.at(-1).to.x,
                    y: chain.at(-1).to.y,
                    tone: 'vermilion',
                    r: 5,
                },
            ]}
            notes={[
                `${kept.length} circles`,
                `t = ${progress.toFixed(2)} of one loop`,
            ]}
            ariaLabel={`${kept.length} rotating circles tracing the path; ${Math.round(
                progress * 100
            )}% complete.`}
        />
    );
}
