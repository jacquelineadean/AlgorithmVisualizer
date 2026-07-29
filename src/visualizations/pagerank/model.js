// Pure model for PageRank: a link graph, the random-surfer matrix with
// damping, and the power iteration that converges to its dominant
// eigenvector. Dangling nodes are handled explicitly, because handling them
// wrong is the classic way to get a vector that does not sum to 1.

export const GRAPHS = [
    {
        id: 'hub',
        label: 'A hub and its spokes',
        pages: ['A', 'B', 'C', 'D', 'E'],
        links: [
            ['B', 'A'],
            ['C', 'A'],
            ['D', 'A'],
            ['E', 'A'],
            ['A', 'B'],
            ['B', 'C'],
        ],
        note: 'Four pages point at A. Rank flows toward whatever the graph agrees on.',
    },
    {
        id: 'chain',
        label: 'A cycle with a spur',
        pages: ['A', 'B', 'C', 'D'],
        links: [
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'A'],
            ['D', 'A'],
        ],
        note: 'D votes but is never voted for — it keeps only the damping floor.',
    },
    {
        id: 'sink',
        label: 'A dangling page',
        pages: ['A', 'B', 'C', 'D'],
        links: [
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
        ],
        note: 'D links nowhere. Without a fix, rank leaks out of the graph entirely.',
    },
    {
        id: 'trap',
        label: 'A link farm',
        pages: ['A', 'B', 'C', 'D', 'E'],
        links: [
            ['A', 'B'],
            ['B', 'A'],
            ['C', 'D'],
            ['D', 'E'],
            ['E', 'C'],
            ['C', 'A'],
        ],
        note: 'A and B point only at each other — a trap that damping is what escapes.',
    },
];

export const getGraph = (id) => GRAPHS.find((graph) => graph.id === id) ?? GRAPHS[0];

export const outLinks = (graph, page) =>
    graph.links.filter(([from]) => from === page).map(([, to]) => to);

export const inLinks = (graph, page) =>
    graph.links.filter(([, to]) => to === page).map(([from]) => from);

export const danglingPages = (graph) =>
    graph.pages.filter((page) => outLinks(graph, page).length === 0);

// One iteration of the damped random surfer. A dangling page's rank is
// redistributed uniformly — the standard fix, and the reason the vector
// keeps summing to 1.
export function iterate(graph, ranks, damping) {
    const n = graph.pages.length;
    const next = new Map(graph.pages.map((page) => [page, (1 - damping) / n]));
    let danglingMass = 0;

    for (const page of graph.pages) {
        const outgoing = outLinks(graph, page);
        if (outgoing.length === 0) {
            danglingMass += ranks.get(page);
            continue;
        }
        const share = (damping * ranks.get(page)) / outgoing.length;
        for (const target of outgoing) next.set(target, next.get(target) + share);
    }

    if (danglingMass > 0) {
        const share = (damping * danglingMass) / n;
        for (const page of graph.pages) next.set(page, next.get(page) + share);
    }
    return next;
}

export const uniformRanks = (graph) =>
    new Map(graph.pages.map((page) => [page, 1 / graph.pages.length]));

export const l1 = (a, b) =>
    [...a.keys()].reduce((sum, key) => sum + Math.abs(a.get(key) - b.get(key)), 0);

// Power iteration, recording every intermediate vector so the stage can
// replay the convergence.
export function pagerank(graph, { damping = 0.85, tolerance = 1e-10, maxIterations = 200 } = {}) {
    const history = [uniformRanks(graph)];
    let converged = false;
    for (let step = 0; step < maxIterations; step++) {
        const next = iterate(graph, history.at(-1), damping);
        const delta = l1(next, history.at(-1));
        history.push(next);
        if (delta < tolerance) {
            converged = true;
            break;
        }
    }
    return { history, ranks: history.at(-1), iterations: history.length - 1, converged };
}

export const ranking = (ranks) =>
    [...ranks.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

export const total = (ranks) => [...ranks.values()].reduce((a, b) => a + b, 0);

// The floor every page gets regardless of links: the surfer's random jump.
export const teleportFloor = (graph, damping) => (1 - damping) / graph.pages.length;
