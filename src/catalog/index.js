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
        blurb: 'From the perceptron to the transformer stack — how modern AI fits, and serves, its functions.',
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
        intro:
            'Type a message, pick two primes, and step through the whole protocol — key generation, encryption, decryption, and the theorem that makes it work. Every step cites its source; simplifications are labeled.',
        status: 'live',
        route: '/visualizer/rsa',
    },
    {
        id: 'pathfinding',
        name: 'Shortest Paths: Dijkstra · A* · BFS',
        domain: 'graphs',
        year: 1959,
        authors: 'Dijkstra · Hart, Nilsson & Raphael · Moore',
        summary:
            'Draw a maze, pick a search, and watch the frontier move — Dijkstra’s diamond, A*’s guided wedge, BFS’s ripple.',
        intro:
            'Draw walls directly on the grid, then compare three classic searches over the same maze: Dijkstra settles the cheapest square, A* adds a compass, BFS sweeps in layers. The frontier streams live; the walk-back traces a provably shortest path. Every step cites its source.',
        status: 'live',
        route: '/visualizer/pathfinding',
    },
    {
        id: 'bayes',
        name: "Bayes' Rule",
        domain: 'statistics',
        year: 1763,
        authors: 'T. Bayes · P.-S. Laplace',
        summary:
            'Send 1,000 people through a screening test and see what a positive result really means — the base rate does the heavy lifting.',
        intro:
            'A population of 1,000 people, a screening test, and one question: when the test says positive, what are the odds it’s right? Drag the sliders, step through the update, and watch the base rate do the heavy lifting. Every step cites its source.',
        status: 'live',
        route: '/visualizer/bayes',
    },
    {
        id: 'dh',
        name: 'Diffie–Hellman Key Exchange',
        domain: 'cryptography',
        year: 1976,
        authors: 'Diffie · Hellman',
        summary:
            'Two parties agree on a shared secret over a channel an eavesdropper reads in full — the paper that invented public-key cryptography.',
        intro:
            'Pick a safe prime and a generator, give Alice and Bob their secret exponents, and watch two public values cross an open channel — then land on the same shared secret. Eve sees everything and still cannot follow. Every step cites its source.',
        status: 'live',
        route: '/visualizer/dh',
    },
    {
        id: 'vigenere',
        name: 'Vigenère Cipher',
        domain: 'cryptography',
        year: 1586,
        authors: 'B. de Vigenère',
        summary:
            'The keyword repeats, the alphabets rotate, and for three centuries nobody could read it — then Kasiski counted.',
        intro:
            'Type a message and a keyword, watch the key cycle beneath the plaintext, and encipher letter by letter with c = (p + k) mod 26. Then see why the repetition that powers the cipher is exactly what broke it. Every step cites its source.',
        status: 'live',
        route: '/visualizer/vigenere',
    },
    {
        id: 'sieve',
        name: 'Sieve of Eratosthenes',
        domain: 'cryptography',
        year: 'c. 240 BC',
        authors: 'Eratosthenes · Horsley’s 1772 account',
        summary:
            'Keep the first survivor, cross out its multiples, repeat — the ancient machine that mints the primes RSA runs on.',
        intro:
            'Every prime you keep crosses out its multiples, starting at p² — and what survives is prime by construction. Slide the board size, stream the crossings, and see why the sieve stops at √N. Every step cites its source.',
        status: 'live',
        route: '/visualizer/sieve',
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
        id: 'quicksort',
        name: 'Quicksort',
        domain: 'sorting',
        year: 1961,
        authors: 'C. A. R. Hoare',
        summary:
            'Partition around a pivot and recurse — watch Hoare’s pointers converge, streamed comparison by comparison.',
        intro:
            'Pick a starting order and watch Hoare’s partition walk its two pointers inward, swap the misfits, and recurse until every bar settles. The gold line is the pivot; the counters keep score. Every step cites its source.',
        status: 'live',
        route: '/visualizer/quicksort',
    },
    {
        id: 'mergesort',
        name: 'Merge Sort',
        domain: 'sorting',
        year: 1945,
        authors: 'J. von Neumann (per Knuth §5.2.4)',
        summary:
            'Runs double until one remains — the sort with a guaranteed n log n, as old as stored-program computing.',
        intro:
            'Merge sort never looks at the whole array — it only merges sorted runs, starting from single bars. Watch passes of doubling width assemble the staircase, and see why the n log n bound cannot be broken. Every step cites its source.',
        status: 'live',
        route: '/visualizer/mergesort',
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
        id: 'transformer-arch',
        name: 'Transformer Architecture Map',
        domain: 'ml',
        year: 2017,
        authors: 'Vaswani et al.',
        summary:
            'The whole stack as a clickable map — embeddings, attention blocks, MLPs, the residual stream — each component opening its own breakdown.',
        status: 'planned',
    },
    {
        id: 'llm-inference',
        name: 'LLM Inference Pipeline',
        domain: 'ml',
        year: 2022,
        authors: 'Pope et al. · Kwon et al.',
        summary:
            'Tokenize → prefill → KV cache → decode → sample. Click any stage to zoom into how a model actually serves a request.',
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
