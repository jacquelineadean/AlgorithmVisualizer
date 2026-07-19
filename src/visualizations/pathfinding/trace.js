// Builds the pathfinding trace for a chosen algorithm over the current
// walls. Macro-steps carry the citations; the search and the walk-back
// stream into the grid stage (Phase 2b).

import { ROWS, COLS, searchEvents } from './model';

const PER_ALGORITHM = {
    dijkstra: {
        rule: {
            title: 'The rule: settle the cheapest',
            sourceRefs: [{ key: 'DIJKSTRA59' }],
            lines: [
                'repeat: settle the unvisited node with the smallest known distance',
                'then relax its neighbors: dist(n) ← min(dist(n), dist(settled) + 1)',
            ],
            explanation:
                'Dijkstra’s 1959 note solves “problem 2” — shortest path between two ' +
                'nodes — by always expanding the cheapest frontier node. Every settled ' +
                'distance is final: nothing cheaper can ever reach it later.',
        },
        searchNote:
            'With every move costing 1, the cheapest frontier is a widening diamond — ' +
            'the search knows nothing about where the target is.',
        guarantee: {
            explanation:
                'When the finish is settled, its distance is provably minimal — the ' +
                'settled set only ever grows through cheapest-first choices.',
            sourceRefs: [{ key: 'DIJKSTRA59' }],
        },
    },
    astar: {
        rule: {
            title: 'The rule: f = g + h',
            sourceRefs: [{ key: 'HNR68' }],
            lines: [
                'settle the frontier node minimizing f(n) = g(n) + h(n)',
                'g(n): cost so far;  h(n): Manhattan distance to the finish',
                'h admissible (never overestimates) ⇒ the found path is optimal',
            ],
            explanation:
                'A* is Dijkstra with a compass: the priority adds a heuristic estimate ' +
                'of the remaining distance. Hart, Nilsson, and Raphael proved that any ' +
                'admissible h keeps the result optimal while skipping hopeless nodes.',
        },
        searchNote:
            'The Manhattan heuristic pulls the frontier toward the finish — compare ' +
            'the settled area with Dijkstra’s diamond on the same walls.',
        guarantee: {
            explanation:
                'Manhattan distance never overestimates on a unit grid (it ignores ' +
                'walls), so A* is admissible here: same optimal path, fewer visits.',
            sourceRefs: [{ key: 'HNR68' }],
        },
    },
    bfs: {
        rule: {
            title: 'The rule: explore in layers',
            sourceRefs: [{ key: 'CLRS22', detail: '§20.2' }],
            lines: [
                'take the oldest frontier node (a plain queue)',
                'every neighbor not yet seen joins the frontier',
                'layer k holds exactly the nodes k steps from the start',
            ],
            explanation:
                'Breadth-first search sweeps outward one layer at a time — Moore ' +
                'described it for maze routing in 1959. On a unit-cost grid it is ' +
                'Dijkstra with the priority queue collapsed to a plain queue.',
        },
        searchNote:
            'Layers expand like a ripple: by the time the finish is reached, every ' +
            'closer square has already been seen.',
        guarantee: {
            explanation:
                'The first time BFS reaches a node it has used the fewest possible ' +
                'edges — on unit costs, fewest edges is cheapest cost.',
            sourceRefs: [{ key: 'CLRS22', detail: '§20.2' }],
        },
    },
};

export function buildPathfindingTrace({ algorithm, walls }) {
    const spec = PER_ALGORITHM[algorithm];
    if (!spec) throw new Error(`Unknown algorithm "${algorithm}".`);
    const wallSet = walls instanceof Set ? walls : new Set(walls);

    const { events, visitedCount, pathLength, found, searchEnd } = searchEvents({
        algorithm,
        walls: wallSet,
    });

    const steps = [
        {
            id: 'the-grid',
            title: 'A city of unit blocks',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'CLRS22', detail: '§20–22' }],
            explanation:
                `${ROWS}×${COLS} squares, every move costing exactly 1, walls forbidden. ` +
                'Draw on the grid to reshape the maze — the trace rebuilds instantly. ' +
                'Real graphs have weights and arbitrary edges; the unit grid keeps every ' +
                'decision visible.',
            kind: 'values',
            data: {
                eventBase: 0,
                values: [
                    { label: 'grid', value: `${ROWS} × ${COLS}` },
                    { label: 'walls', value: wallSet.size },
                ],
            },
        },
        {
            id: 'the-rule',
            title: spec.rule.title,
            provenance: 'paper',
            sourceRefs: spec.rule.sourceRefs,
            explanation: spec.rule.explanation,
            kind: 'formula',
            data: { eventBase: 0, lines: spec.rule.lines },
        },
        {
            id: 'the-search',
            title: 'Watch the frontier move',
            provenance: 'paper',
            sourceRefs: spec.rule.sourceRefs,
            explanation:
                `${spec.searchNote} This run settles ${visitedCount} of ` +
                `${ROWS * COLS - wallSet.size} reachable squares.`,
            kind: 'values',
            data: {
                eventBase: 0,
                values: [{ label: 'nodes settled', value: visitedCount }],
            },
            stream: { events: events.slice(0, searchEnd), tick: 12, batch: 4 },
        },
        {
            id: 'the-path',
            title: found ? 'Walk the path back' : 'No way through',
            provenance: 'paper',
            sourceRefs: spec.rule.sourceRefs,
            explanation: found
                ? `Every settled square remembers which neighbor reached it first. ` +
                  `Following those pointers from the finish back to the start traces a ` +
                  `shortest path — ${pathLength} squares long (${pathLength - 1} moves).`
                : 'The frontier exhausted every reachable square without touching the ' +
                  'finish — the walls disconnect it. Erase a brick or two and rerun.',
            kind: 'values',
            data: {
                eventBase: searchEnd,
                values: found
                    ? [{ label: 'path length', value: `${pathLength} squares` }]
                    : [{ label: 'result', value: 'unreachable' }],
            },
            stream: found
                ? { events: events.slice(searchEnd), tick: 30 }
                : undefined,
        },
        {
            id: 'the-guarantee',
            title: 'Why this path is shortest',
            provenance: 'theorem',
            sourceRefs: spec.guarantee.sourceRefs,
            explanation: spec.guarantee.explanation,
            caveat: {
                provenance: 'pedagogical',
                text: 'Uniform costs and the animation pacing are teaching devices; weighted terrain (mud, hills) is where Dijkstra and A* pull decisively ahead of BFS — it arrives with a later phase.',
                sourceRefs: [{ key: 'CLRS22', detail: '§22.3' }],
            },
            kind: 'values',
            data: {
                eventBase: events.length,
                values: [
                    { label: 'settled', value: visitedCount },
                    { label: 'path', value: found ? `${pathLength - 1} moves` : '—' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: {
            algorithm,
            walls: wallSet,
            events,
            visitedCount,
            pathLength,
            found,
            searchEnd,
        },
    };
}
