// Citation database for the pathfinding visualization. The grid tool
// predates the trace model (it migrates in Phase 2), but its evidence is
// cited the same way as every other visualization.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    DIJKSTRA59: {
        key: 'DIJKSTRA59',
        authors: 'E. W. Dijkstra',
        title: 'A Note on Two Problems in Connexion with Graphs',
        venue: 'Numerische Mathematik 1(1), 269–271',
        year: 1959,
        url: 'https://doi.org/10.1007/BF01386390',
    },
    CLRS22: {
        key: 'CLRS22',
        authors: 'T. H. Cormen, C. E. Leiserson, R. L. Rivest, C. Stein',
        title: 'Introduction to Algorithms (4th ed.), §22.3 — Dijkstra’s algorithm',
        venue: 'MIT Press',
        year: 2022,
        url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
    },
};
