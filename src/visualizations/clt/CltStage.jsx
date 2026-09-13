import PlotStage from '../stages/PlotStage';
import { histogram, normalCurve } from './model';

// The CLT stage has two pictures and the whole lesson lives in the contrast:
// the population (whatever shape you chose) and the distribution of sample
// means (a bell, every time). Both are folds over trace artifacts — the
// stage recomputes nothing the trace did not already record.

const BINS = 26;

export default function CltStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'population';
    const { population, means, n, count, se, meanRange, popHistogram, firstSample } = artifacts;

    if (view === 'population' || view === 'one-sample') {
        const peak = Math.max(...popHistogram.map((bin) => bin.density));
        const marks = [
            {
                type: 'bars',
                bars: popHistogram.map((bin) => ({
                    x0: bin.x0,
                    x1: bin.x1,
                    y: bin.density,
                    tone: 'faint',
                })),
                opacity: 0.55,
            },
            {
                type: 'segment',
                x1: population.mean,
                y1: 0,
                x2: population.mean,
                y2: peak * 1.08,
                tone: 'ink',
                dashed: true,
            },
            {
                type: 'label',
                x: population.mean,
                y: peak * 1.12,
                text: `μ = ${population.mean.toFixed(2)}`,
                tone: 'ink',
                anchor: 'middle',
            },
        ];

        if (view === 'one-sample') {
            const sampleMean = firstSample.reduce((a, b) => a + b, 0) / n;
            marks.push(
                {
                    type: 'points',
                    points: firstSample.map((value, i) => ({
                        x: value,
                        y: peak * (0.08 + 0.02 * (i % 5)),
                    })),
                    tone: 'cobalt',
                    r: 3.5,
                    opacity: 0.8,
                },
                {
                    type: 'marker',
                    x: sampleMean,
                    y: peak * 0.28,
                    tone: 'vermilion',
                    label: `x̄ = ${sampleMean.toFixed(2)}`,
                }
            );
        }

        return (
            <PlotStage
                domain={population.domain}
                range={[0, peak * 1.25]}
                marks={marks}
                xLabel="value"
                yLabel="density"
                notes={[
                    view === 'one-sample'
                        ? `one sample of n = ${n} drawn from the population`
                        : `the population: ${population.label}`,
                ]}
                ariaLabel={`Histogram of the ${population.label} population, mean ${population.mean.toFixed(
                    2
                )}.`}
            />
        );
    }

    // Sampling distribution: fold in only the means the stream has delivered.
    const drawn =
        step.data?.eventBase >= count
            ? means
            : means.slice(0, Math.min(streamIndex, means.length));
    const bins = histogram(drawn, BINS, meanRange);
    const curve = normalCurve(population.mean, se, meanRange);
    const showCurve = step.data?.eventBase >= count;
    const peak = Math.max(
        1e-9,
        ...bins.map((bin) => bin.density),
        showCurve ? Math.max(...curve.map((point) => point.y)) : 0
    );

    const marks = [
        {
            type: 'bars',
            bars: bins.map((bin) => ({ x0: bin.x0, x1: bin.x1, y: bin.density, tone: 'cobalt' })),
            opacity: 0.55,
        },
        {
            type: 'segment',
            x1: population.mean,
            y1: 0,
            x2: population.mean,
            y2: peak * 1.1,
            tone: 'ink',
            dashed: true,
        },
    ];

    if (showCurve) {
        marks.push(
            { type: 'line', points: curve, tone: 'vermilion', width: 2 },
            {
                type: 'segment',
                x1: population.mean - se,
                y1: peak * 0.04,
                x2: population.mean + se,
                y2: peak * 0.04,
                tone: 'green',
                width: 3,
            },
            {
                type: 'label',
                x: population.mean + se,
                y: peak * 0.04,
                dy: -8,
                text: `± σ/√n = ${se.toFixed(3)}`,
                tone: 'green',
            }
        );
    }

    return (
        <PlotStage
            domain={meanRange}
            range={[0, peak * 1.25]}
            marks={marks}
            xLabel="sample mean"
            yLabel="density"
            notes={[
                `${drawn.length.toLocaleString()} / ${count.toLocaleString()} sample means`,
                `each the average of n = ${n}`,
            ]}
            ariaLabel={`Histogram of ${drawn.length} sample means with the normal curve predicted by the central limit theorem.`}
        />
    );
}
