import PlotStage from '../stages/PlotStage';

// Points tinted by cluster, centres as ringed markers, and a spoke from
// every point to the centre that currently owns it — the picture of the
// objective the algorithm is minimizing. The iteration index comes from the
// trace; the stage runs no assign/update of its own.

const TONES = ['cobalt', 'vermilion', 'green', 'gold', 'ink', 'faint'];

export default function KmeansStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { points, run, k } = artifacts;
    const base = step.data?.iteration ?? 0;
    const iteration = step.stream
        ? Math.min(base + Math.min(streamIndex, step.stream.events.length), run.iterations.length - 1)
        : Math.min(base, run.iterations.length - 1);
    const state = run.iterations[iteration];
    const showAssignment = step.data?.showAssignment ?? false;
    const showCentroids = step.data?.showCentroids ?? false;

    const marks = [];

    if (showAssignment) {
        points.forEach((point, i) => {
            const centroid = state.centroids[state.labels[i]];
            marks.push({
                type: 'segment',
                x1: point.x,
                y1: point.y,
                x2: centroid.x,
                y2: centroid.y,
                tone: TONES[state.labels[i] % TONES.length],
                width: 0.6,
            });
        });
    }

    marks.push({
        type: 'points',
        points: points.map((point, i) => ({
            x: point.x,
            y: point.y,
            tone: showAssignment ? TONES[state.labels[i] % TONES.length] : 'ink',
        })),
        r: 3.4,
        opacity: 0.9,
    });

    if (showCentroids) {
        state.centroids.forEach((centroid, index) => {
            marks.push({
                type: 'marker',
                x: centroid.x,
                y: centroid.y,
                tone: TONES[index % TONES.length],
                r: 9,
                label: `μ${index + 1}`,
            });
        });
    }

    return (
        <PlotStage
            square
            domain={[0, 10]}
            range={[0, 10]}
            marks={marks}
            xLabel="x₁"
            yLabel="x₂"
            notes={[
                `iteration ${iteration} of ${run.iterations.length - 1}`,
                `inertia ${state.inertia.toFixed(1)}`,
            ]}
            ariaLabel={`${points.length} points in ${k} clusters at iteration ${iteration}; inertia ${state.inertia.toFixed(
                1
            )}.`}
        />
    );
}
