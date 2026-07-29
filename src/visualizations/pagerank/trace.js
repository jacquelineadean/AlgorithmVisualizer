// Builds the PageRank trace: a vote that is weighted by the voter's own
// importance, made well-defined by damping, and computed by iterating until
// it stops moving.

import {
    danglingPages,
    getGraph,
    inLinks,
    l1,
    outLinks,
    pagerank,
    ranking,
    teleportFloor,
    total,
    uniformRanks,
} from './model';

const pct = (value) => `${(value * 100).toFixed(2)}%`;

export function buildPageRankTrace({ graphId, damping = 0.85 }) {
    if (!(damping > 0 && damping < 1)) {
        throw new Error('Damping must be strictly between 0 and 1.');
    }
    const graph = getGraph(graphId);
    const run = pagerank(graph, { damping });
    const order = ranking(run.ranks);
    const dangling = danglingPages(graph);
    const floor = teleportFloor(graph, damping);
    const start = uniformRanks(graph);
    const first = run.history[1];

    const steps = [
        {
            id: 'graph',
            title: `${graph.pages.length} pages, ${graph.links.length} links`,
            provenance: 'paper',
            sourceRefs: [{ key: 'PAGE1998', detail: '§2' }],
            explanation:
                `${graph.label}. ${graph.note} Page and Brin’s premise: a link is a vote, but ` +
                'votes are not equal — a link from a page everyone reads should count for more ' +
                'than one from a page nobody does. That definition is circular, and making it ' +
                'well-defined is the whole algorithm.',
            kind: 'values',
            data: {
                iteration: 0,
                values: graph.pages.map((page) => ({
                    label: page,
                    value: `${inLinks(graph, page).length} in / ${outLinks(graph, page).length} out`,
                })),
            },
        },
        {
            id: 'equal-start',
            title: 'Start by assuming nothing',
            provenance: 'paper',
            sourceRefs: [{ key: 'PAGE1998', detail: '§2.4' }],
            explanation:
                `Every page begins with rank 1/${graph.pages.length} = ${pct(
                    1 / graph.pages.length
                )}. The starting vector does not matter — the iteration forgets it — but it ` +
                'has to sum to 1, because rank is a probability: the share of time a random ' +
                'surfer spends on each page.',
            kind: 'values',
            data: {
                iteration: 0,
                values: [
                    { label: 'each page', value: pct(1 / graph.pages.length) },
                    { label: 'total', value: pct(total(start)) },
                ],
            },
        },
        {
            id: 'one-pass',
            title: 'Every page splits its rank among its links',
            provenance: 'paper',
            sourceRefs: [{ key: 'PAGE1998', detail: '§2.4' }],
            explanation:
                'A page passes its rank on, divided equally among its outgoing links — so ' +
                'linking to everything is worth less per link than linking to one thing. ' +
                'After one pass the ranks already differ: ' +
                ranking(first)
                    .slice(0, 3)
                    .map(([page, value]) => `${page} ${pct(value)}`)
                    .join(', ') +
                `. The vector moved ${l1(first, start).toFixed(4)} in L1 from the start.`,
            kind: 'formula',
            data: {
                iteration: 1,
                lines: [
                    { tex: 'PR(p) = \\frac{1-d}{N} + d \\sum_{q \\to p} \\frac{PR(q)}{L(q)}' },
                    `d = ${damping},  N = ${graph.pages.length}`,
                ],
            },
        },
        {
            id: 'damping',
            title: `Damping: ${(damping * 100).toFixed(0)}% follow a link, the rest jump`,
            provenance: 'paper',
            sourceRefs: [{ key: 'PAGE1998', detail: '§2.5' }, { key: 'BRIN1998' }],
            explanation:
                'A surfer who only follows links gets stuck: a cycle with no way out absorbs ' +
                'all the rank, and a page with no outgoing links drains it entirely. So with ' +
                `probability ${(1 - damping).toFixed(2)} the surfer jumps to a page at random ` +
                `instead. That guarantees every page at least ${pct(floor)}, makes the chain ` +
                'irreducible and aperiodic, and turns the circular definition into a matrix ' +
                'with exactly one answer.' +
                (dangling.length
                    ? ` This graph has a dangling page (${dangling.join(', ')}); its rank is ` +
                      'redistributed uniformly, or the total would leak away.'
                    : ''),
            kind: 'values',
            data: {
                iteration: 2,
                values: [
                    { label: 'damping d', value: damping.toFixed(2) },
                    { label: 'floor per page', value: pct(floor) },
                    { label: 'dangling pages', value: dangling.length ? dangling.join(', ') : 'none' },
                ],
            },
        },
        {
            id: 'iterate',
            title: `Iterate to a fixed point (${run.iterations} passes)`,
            provenance: 'theorem',
            sourceRefs: [
                { key: 'PERRON1907' },
                { key: 'LANGVILLE2006', detail: 'Ch. 4' },
            ],
            explanation:
                'Repeating the pass is power iteration on a stochastic matrix, and it ' +
                'converges to that matrix’s dominant eigenvector — the one Perron and ' +
                `Frobenius guarantee exists and is unique for a positive matrix. It took ` +
                `${run.iterations} passes to settle here; on the real web, with billions of ` +
                'pages, it took a few dozen. The rate is governed by the damping factor: ' +
                'd = 0.85 was chosen partly because it converges fast.',
            kind: 'values',
            data: {
                iteration: 2,
                eventBase: 0,
                values: [
                    { label: 'iterations', value: run.iterations },
                    { label: 'converged', value: run.converged ? 'yes' : 'hit the cap' },
                    { label: 'total rank', value: pct(total(run.ranks)) },
                ],
            },
            stream: {
                events: run.history.slice(3).map((_, i) => ({ t: 'iter', i: i + 3 })),
                tick: 260,
            },
        },
        {
            id: 'ranking',
            title: `${order[0][0]} wins`,
            provenance: 'paper',
            sourceRefs: [{ key: 'BRIN1998' }, { key: 'PAGE1998' }],
            explanation:
                'Final ranking: ' +
                order.map(([page, value]) => `${page} ${pct(value)}`).join(', ') +
                '. Note what it is not — a count of inbound links. A page with few links from ' +
                'important pages outranks one with many links from unimportant ones, which is ' +
                'exactly the property that made the web searchable and, immediately, the ' +
                'property everyone started attacking.',
            caveat: {
                provenance: 'modern',
                text: 'PageRank is one signal among hundreds in any modern search engine, and has been since soon after launch — link spam, paid links, and farms made a purely link-based ranking untenable. The mathematics is unchanged; what changed is how much of the answer it is allowed to be.',
                sourceRefs: [{ key: 'LANGVILLE2006', detail: 'Ch. 5' }, { key: 'BRIN1998' }],
            },
            kind: 'values',
            data: {
                iteration: run.history.length - 1,
                values: order.map(([page, value]) => ({ label: page, value: pct(value) })),
            },
        },
    ];

    return { steps, artifacts: { graph, run, order, damping, floor, dangling } };
}
