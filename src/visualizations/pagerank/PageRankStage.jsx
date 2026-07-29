import GraphStage from '../stages/GraphStage';
import { ranking } from './model';

// The link graph, with each page's circle sized by its current rank. The
// iteration index comes from the trace; the stage runs no passes of its own.

const R_MIN = 16;
const R_MAX = 42;

const layout = (count, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    return { x: 0.5 + 0.33 * Math.cos(angle), y: 0.5 + 0.37 * Math.sin(angle) };
};

export default function PageRankStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { graph, run } = artifacts;
    const base = step.data?.iteration ?? 0;
    const iteration = step.stream
        ? Math.min(base + Math.min(streamIndex, step.stream.events.length), run.history.length - 1)
        : Math.min(base, run.history.length - 1);
    const ranks = run.history[iteration];
    const peak = Math.max(...ranks.values());
    const leader = ranking(ranks)[0][0];

    const nodes = graph.pages.map((page, i) => ({
        id: page,
        ...layout(graph.pages.length, i),
        label: page,
        sub: `${(ranks.get(page) * 100).toFixed(1)}%`,
        tone: page === leader ? 'cobalt' : 'ink',
        ring: page === leader,
        r: R_MIN + (R_MAX - R_MIN) * Math.sqrt(ranks.get(page) / peak),
    }));

    const edges = graph.links.map(([from, to]) => ({
        from,
        to,
        tone: 'faint',
        width: 1.4,
        curve: graph.links.some(([f, t]) => f === to && t === from) ? 0.45 : 0,
    }));

    return (
        <GraphStage
            nodes={nodes}
            edges={edges}
            notes={[
                `iteration ${iteration} of ${run.iterations}`,
                `leader ${leader} at ${(ranks.get(leader) * 100).toFixed(2)}%`,
            ]}
            ariaLabel={`Link graph at iteration ${iteration}; ranks ${graph.pages
                .map((page) => `${page} ${(ranks.get(page) * 100).toFixed(1)}%`)
                .join(', ')}.`}
        />
    );
}
