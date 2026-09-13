// Pure helpers for the drill-down contract (Phase 4a). A map is a tree of
// nodes; the UI is a zoom over that tree and the evidence gate walks it.
//
//   node = { id, title, summary, provenance, sourceRefs[], detail?, caveat?,
//            metrics?: [{label, value}], layout?: 'flow'|'stack'|'grid',
//            stage?: { kind, data }, children?: [node] }
//
// A node either drills into `children` or opens a focused `stage` — most
// leaves do the latter, which is where the live diagrams live.

// Depth-first walk yielding [node, ancestorIds] for every node in the tree.
export function walkNodes(root, ancestors = []) {
    const out = [[root, ancestors]];
    for (const child of root.children ?? []) {
        out.push(...walkNodes(child, [...ancestors, root.id]));
    }
    return out;
}

// Resolve a dot path of ids *below* the root ('decode.kv-cache') into the
// chain of nodes [root, …, target]. Unknown segments stop the descent, so a
// stale or hand-edited link lands on the deepest node that still exists
// instead of a blank page.
export function resolvePath(root, path) {
    const chain = [root];
    if (!path) return chain;
    for (const segment of String(path).split('.')) {
        const next = chain.at(-1).children?.find((child) => child.id === segment);
        if (!next) break;
        chain.push(next);
    }
    return chain;
}

// The inverse: the dot path a chain serializes to (the root is implicit).
export const pathOf = (chain) =>
    chain
        .slice(1)
        .map((node) => node.id)
        .join('.');

// Every node id must be unique among its siblings, or paths are ambiguous.
export function findDuplicateChildIds(root) {
    const clashes = [];
    for (const [node] of walkNodes(root)) {
        const seen = new Set();
        for (const child of node.children ?? []) {
            if (seen.has(child.id)) clashes.push(`${node.id}/${child.id}`);
            seen.add(child.id);
        }
    }
    return clashes;
}

export const countNodes = (root) => walkNodes(root).length;

export const leafCount = (root) =>
    walkNodes(root).filter(([node]) => !node.children?.length).length;

// The order the phase player steps through: pre-order — a phase, then each
// of its sub-phases, then the next phase — which is also the order a reader
// would walk the map top to bottom. `path` is the dot path the deep link
// carries ('' for the root); `index` is the transport's position.
export function sequenceOf(root) {
    return walkNodes(root).map(([node, ancestors], index) => ({
        node,
        index,
        depth: ancestors.length,
        path: ancestors.length ? [...ancestors.slice(1), node.id].join('.') : '',
    }));
}

// How many rails the pipeline stage reserves: the deepest node's depth, so
// the graphic's height never changes as the reader moves between phases.
export const maxDepth = (root) =>
    Math.max(0, ...walkNodes(root).map(([, ancestors]) => ancestors.length));
