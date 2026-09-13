import GraphStage from '../stages/GraphStage';
import MatrixStage from '../stages/MatrixStage';

// The chain as a graph whose circles carry the current probability mass,
// with the transition matrix underneath on the steps that discuss it. Node
// radii are read from the trace's recorded distribution path — the stage
// runs no iterations of its own.

const R_MIN = 15;
const R_MAX = 38;

// States sit on a circle so every transition is visible; two-state chains
// get a horizontal pair instead of a degenerate circle.
const layout = (count, index) => {
    if (count === 2) return { x: index === 0 ? 0.3 : 0.7, y: 0.5 };
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    return { x: 0.5 + 0.34 * Math.cos(angle), y: 0.5 + 0.38 * Math.sin(angle) };
};

export default function MarkovStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { states, matrix, path, limit } = artifacts;
    const base = step.data?.iteration ?? 0;
    const iteration = step.stream
        ? Math.min(base + Math.min(streamIndex, step.stream.events.length), path.length - 1)
        : Math.min(base, path.length - 1);
    const distribution = path[iteration];
    const peak = Math.max(...distribution, 1e-9);

    const nodes = states.map((label, i) => ({
        id: label,
        ...layout(states.length, i),
        label,
        sub: `${(distribution[i] * 100).toFixed(1)}%`,
        tone: distribution[i] >= peak - 1e-12 ? 'cobalt' : 'ink',
        ring: distribution[i] >= peak - 1e-12,
        r: R_MIN + (R_MAX - R_MIN) * Math.sqrt(distribution[i]),
    }));

    const edges = [];
    matrix.forEach((row, i) =>
        row.forEach((probability, j) => {
            if (probability <= 1e-9) return;
            edges.push({
                from: states[i],
                to: states[j],
                label: probability.toFixed(2),
                tone: probability >= 0.5 ? 'ink' : 'faint',
                width: 0.8 + probability * 2.6,
                curve: i === j ? 0 : 0.55,
                self: i === j,
            });
        })
    );

    const graph = (
        <GraphStage
            nodes={nodes}
            edges={edges}
            notes={[
                `iteration ${iteration}`,
                limit.converged ? `limit exists (πP = π)` : 'no limit — see step 6',
            ]}
            ariaLabel={`Markov chain over ${states.join(', ')}; distribution at iteration ${iteration}: ${distribution
                .map((value, i) => `${states[i]} ${(value * 100).toFixed(1)}%`)
                .join(', ')}.`}
        />
    );

    if (step.data?.view !== 'matrix') return graph;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {graph}
            <MatrixStage
                values={matrix}
                rowLabels={states.map((label) => `from ${label}`)}
                colLabels={states}
                max={1}
                caption="P — row i is the forecast from state i (each row sums to 1)"
                footer={`π = [ ${limit.distribution.map((value) => value.toFixed(3)).join(', ')} ]`}
                ariaLabel="Transition matrix of the chain."
            />
        </div>
    );
}
