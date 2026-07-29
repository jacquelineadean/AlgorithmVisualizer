import GraphStage from '../stages/GraphStage';
import { layout } from './model';

// The tree as it assembles: leaves are the symbols, internal nodes carry the
// summed weight, and edges are labelled with the bit they contribute. Only
// the nodes that exist after `merge` merges are drawn, so the stream shows
// the forest becoming a tree.

const show = (symbol) => (symbol === ' ' ? '␣' : symbol);

export default function HuffmanStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { root, merges, nodes, codes } = artifacts;
    const base = step.data?.merge ?? 0;
    const upTo = step.stream
        ? Math.min(base + Math.min(streamIndex, merges.length), merges.length)
        : Math.min(base, merges.length);

    // Which nodes exist yet: all leaves, plus the parents created so far.
    const created = new Set(merges.slice(0, upTo).map((merge) => merge.parent));
    const visible = nodes.filter((node) => node.symbol != null || created.has(node.id));
    const positions = layout(root);
    const lastMerge = upTo > 0 ? merges[upTo - 1] : null;

    const graphNodes = visible.map((node) => {
        const position = positions.get(node.id) ?? { x: 0.5, y: 0.5 };
        const isLeaf = node.symbol != null;
        const fresh = lastMerge && node.id === lastMerge.parent;
        return {
            id: node.id,
            x: position.x,
            y: position.y,
            label: isLeaf ? show(node.symbol) : String(node.weight),
            sub: isLeaf ? String(node.weight) : null,
            caption: isLeaf && upTo >= merges.length ? codes.get(node.symbol) : null,
            tone: fresh ? 'vermilion' : isLeaf ? 'cobalt' : 'ink',
            ring: Boolean(fresh),
            r: isLeaf ? 18 : 15,
        };
    });

    const edges = [];
    for (const merge of merges.slice(0, upTo)) {
        edges.push(
            { from: merge.parent, to: merge.left, label: '0', tone: 'faint', width: 1.3 },
            { from: merge.parent, to: merge.right, label: '1', tone: 'faint', width: 1.3 }
        );
    }

    return (
        <GraphStage
            nodes={graphNodes}
            edges={edges}
            directed={false}
            notes={[
                `${upTo} of ${merges.length} merges`,
                upTo >= merges.length ? 'codes are the root-to-leaf paths' : 'a forest, not yet a tree',
            ]}
            ariaLabel={`Huffman tree after ${upTo} of ${merges.length} merges.`}
        />
    );
}
