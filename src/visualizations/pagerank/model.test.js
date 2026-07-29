import { describe, expect, it } from 'vitest';
import {
    GRAPHS,
    danglingPages,
    getGraph,
    inLinks,
    iterate,
    l1,
    outLinks,
    pagerank,
    ranking,
    teleportFloor,
    total,
    uniformRanks,
} from './model';
import { buildPageRankTrace } from './trace';

describe('the iteration', () => {
    it('conserves total rank, including on graphs with dangling pages', () => {
        for (const graph of GRAPHS) {
            let ranks = uniformRanks(graph);
            for (let i = 0; i < 30; i++) {
                ranks = iterate(graph, ranks, 0.85);
                expect(total(ranks), graph.id).toBeCloseTo(1, 12);
            }
        }
    });

    it('never drops a page below the teleport floor', () => {
        for (const graph of GRAPHS) {
            const { ranks } = pagerank(graph, { damping: 0.85 });
            for (const value of ranks.values()) {
                expect(value).toBeGreaterThanOrEqual(teleportFloor(graph, 0.85) - 1e-12);
            }
        }
    });

    it('converges to a fixed point of its own update', () => {
        for (const graph of GRAPHS) {
            const { ranks, converged } = pagerank(graph, { damping: 0.85 });
            expect(converged, graph.id).toBe(true);
            expect(l1(iterate(graph, ranks, 0.85), ranks)).toBeLessThan(1e-9);
        }
    });

    it('forgets where it started', () => {
        const graph = getGraph('hub');
        const skewed = new Map(graph.pages.map((page, i) => [page, i === 0 ? 1 : 0]));
        let a = skewed;
        let b = uniformRanks(graph);
        for (let i = 0; i < 200; i++) {
            a = iterate(graph, a, 0.85);
            b = iterate(graph, b, 0.85);
        }
        expect(l1(a, b)).toBeLessThan(1e-9);
    });
});

describe('what the ranking means', () => {
    it('is not just an in-link count — one good link beats two bad ones', () => {
        // B has a single in-link, from the graph's most important page.
        // C has two, from pages nobody points at. B still wins.
        const graph = {
            id: 'quality',
            label: 'quality over quantity',
            pages: ['A', 'B', 'C', 'D', 'E', 'F'],
            links: [
                ['D', 'A'],
                ['E', 'A'],
                ['F', 'A'],
                ['B', 'A'],
                ['C', 'A'],
                ['A', 'B'],
                ['D', 'C'],
                ['E', 'C'],
            ],
        };
        const { ranks } = pagerank(graph, { damping: 0.85 });
        expect(inLinks(graph, 'C')).toHaveLength(2);
        expect(inLinks(graph, 'B')).toHaveLength(1);
        expect(ranks.get('B')).toBeGreaterThan(ranks.get('C'));
        expect(ranking(ranks)[0][0]).toBe('A');
    });

    it('leaves a page nobody links to at exactly the teleport floor', () => {
        const graph = getGraph('chain');
        const { ranks } = pagerank(graph, { damping: 0.85 });
        expect(inLinks(graph, 'D')).toHaveLength(0);
        expect(ranks.get('D')).toBeCloseTo(teleportFloor(graph, 0.85), 12);
        expect(ranking(ranks)[0][0]).toBe('A');
    });

    it('splits a page’s rank evenly across its out-links', () => {
        const graph = getGraph('hub');
        const ranks = new Map(graph.pages.map((page) => [page, page === 'B' ? 1 : 0]));
        const next = iterate(graph, ranks, 1);
        const targets = outLinks(graph, 'B');
        for (const target of targets) {
            expect(next.get(target)).toBeCloseTo(1 / targets.length, 12);
        }
    });

    it('flattens toward uniform as damping goes to zero', () => {
        const graph = getGraph('hub');
        const weak = pagerank(graph, { damping: 0.05 }).ranks;
        const strong = pagerank(graph, { damping: 0.95 }).ranks;
        const spread = (ranks) => Math.max(...ranks.values()) - Math.min(...ranks.values());
        expect(spread(weak)).toBeLessThan(spread(strong));
    });

    it('escapes a link farm thanks to damping alone', () => {
        const graph = getGraph('trap');
        const { ranks } = pagerank(graph, { damping: 0.85 });
        // C, D, E are outside the A↔B trap and still hold real mass.
        for (const page of ['C', 'D', 'E']) {
            expect(ranks.get(page)).toBeGreaterThan(teleportFloor(graph, 0.85));
        }
    });

    it('identifies the dangling page in the sink graph', () => {
        expect(danglingPages(getGraph('sink'))).toEqual(['D']);
        expect(danglingPages(getGraph('hub'))).toEqual([]);
    });
});

describe('buildPageRankTrace', () => {
    it('records the trajectory and validates damping', () => {
        const { steps, artifacts } = buildPageRankTrace({ graphId: 'hub', damping: 0.85 });
        expect(artifacts.run.history.length).toBe(artifacts.run.iterations + 1);
        expect(steps.flatMap((step) => step.stream?.events ?? []).length).toBe(
            artifacts.run.history.length - 3
        );
        expect(() => buildPageRankTrace({ graphId: 'hub', damping: 1 })).toThrow(/Damping/);
        expect(() => buildPageRankTrace({ graphId: 'hub', damping: 0 })).toThrow(/Damping/);
    });
});
