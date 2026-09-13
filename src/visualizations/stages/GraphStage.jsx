import './Stages.css';

// Node-and-edge stage shared by the entries whose object *is* a graph:
// Markov chains, PageRank's link graph, Huffman's code tree, and the tiny
// MLP that backpropagation differentiates. Positions arrive in normalized
// [0,1] coordinates computed by each visualization's model (a layered tree
// layout, a circle, a hand-placed web) — the stage only draws.
//
//   nodes: [{ id, x, y, label, sub?, tone?, r?, dim?, ring? }]
//   edges: [{ from, to, label?, tone?, width?, dashed?, curve?, self? }]

const W = 760;
const H = 320;
const PAD = 44;

const project = (node) => ({
    cx: PAD + node.x * (W - PAD * 2),
    cy: PAD + node.y * (H - PAD * 2),
});

// Quadratic control point offset perpendicular to the edge, so a→b and b→a
// bow to opposite sides instead of overprinting (Markov chains need both).
const curvePath = (a, b, curve) => {
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const len = Math.hypot(dx, dy) || 1;
    const mx = (a.cx + b.cx) / 2 - (dy / len) * curve * 46;
    const my = (a.cy + b.cy) / 2 + (dx / len) * curve * 46;
    return { d: `M ${a.cx} ${a.cy} Q ${mx} ${my} ${b.cx} ${b.cy}`, mx, my };
};

// Shorten an edge so the arrowhead lands on the node rim, not its centre.
const trim = (from, to, radius) => {
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const len = Math.hypot(dx, dy) || 1;
    return { cx: to.cx - (dx / len) * radius, cy: to.cy - (dy / len) * radius };
};

export default function GraphStage({ nodes, edges = [], ariaLabel, notes = [], directed = true }) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const pos = new Map(nodes.map((node) => [node.id, project(node)]));

    return (
        <svg className="graph-stage" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
            {directed && (
                <defs>
                    {['ink', 'cobalt', 'green', 'vermilion', 'gold', 'faint'].map((tone) => (
                        <marker
                            key={tone}
                            id={`arrow-${tone}`}
                            viewBox="0 0 8 8"
                            refX="7"
                            refY="4"
                            markerWidth="7"
                            markerHeight="7"
                            orient="auto-start-reverse"
                        >
                            <path className={`gr-arrow gs-${tone}`} d="M 0 1 L 7 4 L 0 7 z" />
                        </marker>
                    ))}
                </defs>
            )}

            {edges.map((edge, i) => {
                const a = pos.get(edge.from);
                const b = pos.get(edge.to);
                if (!a || !b) return null;
                const tone = edge.tone ?? 'faint';
                const targetR = (byId.get(edge.to)?.r ?? 22) + 7;

                if (edge.self) {
                    const r = (byId.get(edge.from)?.r ?? 22) + 12;
                    return (
                        <g key={i} className={`gr-edge gs-${tone}`}>
                            <path
                                className={edge.dashed ? 'dashed' : undefined}
                                strokeWidth={edge.width ?? 1.5}
                                d={`M ${a.cx - r * 0.6} ${a.cy - r * 0.6} a ${r} ${r} 0 1 1 ${r * 1.2} 0`}
                                markerEnd={directed ? `url(#arrow-${tone})` : undefined}
                            />
                            {edge.label && (
                                <text className="gr-edge-label" x={a.cx} y={a.cy - r - 12} textAnchor="middle">
                                    {edge.label}
                                </text>
                            )}
                        </g>
                    );
                }

                const end = trim(a, b, targetR);
                const { d, mx, my } = curvePath(a, end, edge.curve ?? 0);
                return (
                    <g key={i} className={`gr-edge gs-${tone}`}>
                        <path
                            className={edge.dashed ? 'dashed' : undefined}
                            strokeWidth={edge.width ?? 1.5}
                            d={d}
                            markerEnd={directed ? `url(#arrow-${tone})` : undefined}
                        />
                        {edge.label && (
                            <text
                                className="gr-edge-label"
                                x={edge.curve ? (mx + (a.cx + end.cx) / 2) / 2 : mx}
                                y={(edge.curve ? (my + (a.cy + end.cy) / 2) / 2 : my) - 4}
                                textAnchor="middle"
                            >
                                {edge.label}
                            </text>
                        )}
                    </g>
                );
            })}

            {nodes.map((node) => {
                const { cx, cy } = pos.get(node.id);
                const r = node.r ?? 22;
                return (
                    <g
                        key={node.id}
                        className={`gr-node gs-${node.tone ?? 'ink'}${node.dim ? ' dim' : ''}${
                            node.ring ? ' ringed' : ''
                        }`}
                        transform={`translate(${cx} ${cy})`}
                    >
                        <circle r={r} />
                        <text className="gr-node-label" y={node.sub ? -1 : 4} textAnchor="middle">
                            {node.label}
                        </text>
                        {node.sub && (
                            <text className="gr-node-sub" y="13" textAnchor="middle">
                                {node.sub}
                            </text>
                        )}
                        {node.caption && (
                            <text className="gr-node-caption" y={r + 15} textAnchor="middle">
                                {node.caption}
                            </text>
                        )}
                    </g>
                );
            })}

            {notes.map((note, i) => (
                <text key={i} className="pl-note" x={W - 16} y={20 + i * 16} textAnchor="end">
                    {note}
                </text>
            ))}
        </svg>
    );
}
