// Site-level catalog of visualizations, grouped by domain. Entries with
// status 'live' must provide a route; 'planned' entries render as
// coming-soon cards and double as the public roadmap (see ROADMAP.md).

export const DOMAINS = [
    {
        id: 'cryptography',
        name: 'Cryptography',
        blurb: 'Keys, ciphers, and the number theory that guards a message in transit.',
        accent: 'cobalt',
    },
    {
        id: 'graphs',
        name: 'Graphs & Pathfinding',
        blurb: 'Search, shortest paths, and the structures that connect everything.',
        accent: 'green',
    },
    {
        id: 'sorting',
        name: 'Sorting & Order',
        blurb: 'How comparison, partition, and merge impose order on chaos.',
        accent: 'vermilion',
    },
    {
        id: 'statistics',
        name: 'Statistics & Probability',
        blurb: 'Sampling, inference, and the laws that emerge from randomness.',
        accent: 'gold',
    },
    {
        id: 'ml',
        name: 'AI & Machine Learning',
        blurb: 'From the perceptron to attention — how machines fit functions to data.',
        accent: 'cobalt',
    },
    {
        id: 'systems',
        name: 'Distributed Systems',
        blurb: 'Consensus, replication, and architectures that survive failure.',
        accent: 'green',
    },
];

export const CATALOG = [
    {
        id: 'rsa',
        name: 'RSA Encryption',
        domain: 'cryptography',
        year: 1978,
        authors: 'Rivest · Shamir · Adleman',
        summary:
            'Generate a key pair from two primes, encrypt with modular exponentiation, and see why only the private key can undo it.',
        status: 'live',
        route: '/visualizer/rsa',
    },
    {
        id: 'pathfinding',
        name: "Dijkstra's Algorithm",
        domain: 'graphs',
        year: 1959,
        authors: 'Edsger W. Dijkstra',
        summary:
            'Draw walls on a grid and watch the search sweep outward, always expanding the cheapest frontier first.',
        status: 'live',
        route: '/visualizer/pathfinding',
    },
    {
        id: 'diffie-hellman',
        name: 'Diffie–Hellman Key Exchange',
        domain: 'cryptography',
        year: 1976,
        authors: 'Diffie · Hellman',
        summary: 'Two parties agree on a shared secret over a public channel.',
        status: 'planned',
    },
    {
        id: 'sha-256',
        name: 'SHA-256',
        domain: 'cryptography',
        year: 2001,
        authors: 'NSA / NIST FIPS 180',
        summary: 'Message schedule, rounds, and the avalanche effect.',
        status: 'planned',
    },
    {
        id: 'astar',
        name: 'A* Search',
        domain: 'graphs',
        year: 1968,
        authors: 'Hart · Nilsson · Raphael',
        summary: 'Dijkstra plus a heuristic: search that knows where it is going.',
        status: 'planned',
    },
    {
        id: 'quicksort',
        name: 'Quicksort',
        domain: 'sorting',
        year: 1961,
        authors: 'C. A. R. Hoare',
        summary: 'Partition around a pivot, recurse, and race the other sorts.',
        status: 'planned',
    },
    {
        id: 'clt',
        name: 'Central Limit Theorem',
        domain: 'statistics',
        year: 1810,
        authors: 'Laplace',
        summary: 'Any distribution, sampled enough, drifts toward the bell curve.',
        status: 'planned',
    },
    {
        id: 'monte-carlo',
        name: 'Monte Carlo π',
        domain: 'statistics',
        year: 1946,
        authors: 'Ulam · von Neumann',
        summary: 'Estimate π by throwing darts and counting where they land.',
        status: 'planned',
    },
    {
        id: 'kmeans',
        name: 'k-means Clustering',
        domain: 'ml',
        year: 1957,
        authors: 'Lloyd',
        summary: 'Centroids chase their clusters until the assignment settles.',
        status: 'planned',
    },
    {
        id: 'attention',
        name: 'Transformer Attention',
        domain: 'ml',
        year: 2017,
        authors: 'Vaswani et al.',
        summary: 'Queries, keys, and values — attention weights as a living matrix.',
        status: 'planned',
    },
    {
        id: 'raft',
        name: 'Raft Consensus',
        domain: 'systems',
        year: 2014,
        authors: 'Ongaro · Ousterhout',
        summary: 'Leader election and log replication in an understandable consensus protocol.',
        status: 'planned',
    },
    {
        id: 'consistent-hashing',
        name: 'Consistent Hashing',
        domain: 'systems',
        year: 1997,
        authors: 'Karger et al.',
        summary: 'Keys on a ring: add a server, move almost nothing.',
        status: 'planned',
    },
];

export const liveEntries = () => CATALOG.filter((entry) => entry.status === 'live');

export const entriesByDomain = (domainId) =>
    CATALOG.filter((entry) => entry.domain === domainId);
