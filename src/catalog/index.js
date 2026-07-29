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
    {
        id: 'numbers',
        name: 'Numbers & Primes',
        blurb: 'Divisibility, primality, and the arithmetic every cipher is built on.',
        accent: 'vermilion',
    },
    {
        id: 'methods',
        name: 'Methodologies',
        blurb: 'Coding, compression, and the general-purpose methods that turn up everywhere.',
        accent: 'gold',
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
        domain: 'numbers',
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
        authors: 'NSA · NIST FIPS 180-4',
        summary:
            'Pad, expand, stir sixty-four times — then flip one input bit and watch half the output change.',
        intro:
            'A complete SHA-256, written to be read: the padding that encodes the length, the schedule that turns 16 words into 64, and all 64 rounds scrubbing through a live bit grid. Then a measured avalanche. Checked against the standard’s own published test vectors. Every step cites its source.',
        status: 'live',
        route: '/visualizer/sha-256',
    },
    {
        id: 'euclid',
        name: 'Euclid’s Algorithm',
        domain: 'numbers',
        year: -300,
        authors: 'Euclid · Lamé',
        summary:
            'Cut the largest square off a rectangle and repeat — the oldest algorithm still in daily use.',
        intro:
            'Euclid posed it geometrically, and the picture still works: tile a rectangle with the biggest squares that fit, and the last square’s side is the greatest common divisor. Then watch division collapse the whole process, Bézout coefficients fall out for free, and Lamé prove the first complexity bound in history. Every step cites its source.',
        status: 'live',
        route: '/visualizer/euclid',
    },
    {
        id: 'huffman',
        name: 'Huffman Coding',
        domain: 'methods',
        year: 1952,
        authors: 'D. A. Huffman',
        summary:
            'Merge the two rarest symbols, over and over, and the optimal prefix code builds itself from the bottom up.',
        intro:
            'Type anything and watch the tree assemble one merge at a time, then read the codes off its branches. The result is measured against Shannon’s entropy — Huffman always lands within one bit of it, and never below. Every step cites its source.',
        status: 'live',
        route: '/visualizer/huffman',
    },
    {
        id: 'fourier',
        name: 'Fourier Epicycles',
        domain: 'methods',
        year: 1822,
        authors: 'J. B. J. Fourier · Cooley & Tukey',
        summary:
            'Every closed curve is a stack of rotating circles — and the coefficients tell you exactly which ones.',
        intro:
            'Read a drawn path as a complex signal, transform it, and watch the coefficients turn back into rotating arms that redraw the curve. Add circles and the error falls; cut a corner and Gibbs’ ringing appears. Then see why the O(N²) definition on this page is not what anyone runs. Every step cites its source.',
        status: 'live',
        route: '/visualizer/fourier',
    },
    {
        id: 'pagerank',
        name: 'PageRank',
        domain: 'graphs',
        year: 1998,
        authors: 'Page · Brin · Motwani · Winograd',
        summary:
            'A link is a vote, weighted by the voter’s own importance — a circular definition made well-defined by damping.',
        intro:
            'Pick a link graph and watch importance flow around it until it stops moving. Damping is what makes the circular definition have exactly one answer: with some probability the random surfer jumps instead of clicking, which is also how rank escapes a link farm. Every step cites its source.',
        status: 'live',
        route: '/visualizer/pagerank',
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
        authors: 'Laplace · Lyapunov · Lindeberg',
        summary:
            'Average anything — a skewed tail, two humps, a die — and the averages pile up into the same bell.',
        intro:
            'Pick a population that looks nothing like a bell curve, average n draws from it, and repeat. The histogram of those averages is normal every time, with a spread of exactly σ/√n. Every step cites its source.',
        status: 'live',
        route: '/visualizer/clt',
    },
    {
        id: 'monte-carlo',
        name: 'Monte Carlo π',
        domain: 'statistics',
        year: 1949,
        authors: 'Metropolis · Ulam',
        summary:
            'Throw darts at a square, count the ones inside the circle, and π falls out of the hit rate.',
        intro:
            'A square, an inscribed circle, and a pile of random darts. The fraction that land inside is π/4 — so counting hits estimates π without ever writing π down. Then watch how slowly 1/√n buys precision. Every step cites its source.',
        status: 'live',
        route: '/visualizer/monte-carlo',
    },
    {
        id: 'markov',
        name: 'Markov Chains',
        domain: 'statistics',
        year: 1906,
        authors: 'A. A. Markov',
        summary:
            'A walk that remembers only where it stands — and still settles into a distribution you can predict.',
        intro:
            'Choose a chain, push a distribution through its transition matrix, and watch the probability mass find its fixed point. Then break it: a periodic chain that oscillates forever, a reducible one whose answer depends on where you started. Every step cites its source.',
        status: 'live',
        route: '/visualizer/markov',
    },
    {
        id: 'regression',
        name: 'Least Squares as Projection',
        domain: 'statistics',
        year: 1805,
        authors: 'Legendre · Gauss',
        summary:
            'Drag a line through a cloud of points and watch squared error find the one perpendicular answer.',
        intro:
            'Every line leaves residuals; least squares picks the line whose residuals are perpendicular to the data’s own directions. Push a trial line around, then see the normal equations land the projection exactly. Every step cites its source.',
        status: 'live',
        route: '/visualizer/regression',
    },
    {
        id: 'kmeans',
        name: 'k-means Clustering',
        domain: 'ml',
        year: 1957,
        authors: 'S. Lloyd · J. MacQueen',
        summary:
            'Assign, average, repeat — centroids chase their clusters downhill until nothing moves.',
        intro:
            'Two half-steps, each provably non-increasing: give every point to its nearest centre, then move every centre to its cluster’s mean. It always terminates, it rarely finds the optimum, and it will happily invent k clusters in noise. Every step cites its source.',
        status: 'live',
        route: '/visualizer/kmeans',
    },
    {
        id: 'perceptron',
        name: 'The Perceptron',
        domain: 'ml',
        year: 1958,
        authors: 'F. Rosenblatt',
        summary:
            'The first algorithm that learned: one weighted sum, corrected by every mistake it makes.',
        intro:
            'Weights start at zero and change only when the machine is wrong. On separable data Novikoff’s bound says it must stop; on XOR it corrects forever — the limit that named an AI winter. Every step cites its source.',
        status: 'live',
        route: '/visualizer/perceptron',
    },
    {
        id: 'backprop',
        name: 'Backpropagation',
        domain: 'ml',
        year: 1986,
        authors: 'Rumelhart · Hinton · Williams',
        summary:
            'One forward pass, one reverse pass, and every derivative in the network falls out.',
        intro:
            'A 2–2–1 network small enough to read: watch the activations flow forward, the deltas flow back through the chain rule, and nine weights descend until XOR is solved. The gradients on this page are checked against finite differences. Every step cites its source.',
        status: 'live',
        route: '/visualizer/backprop',
    },
    {
        id: 'attention',
        name: 'Transformer Attention',
        domain: 'ml',
        year: 2017,
        authors: 'Vaswani et al. · Bahdanau et al.',
        summary:
            'Queries, keys, and values — one matrix multiply, one softmax, and every token sees every other.',
        intro:
            'Four tokens, three projections, and the arithmetic of a single attention head worked all the way through: QKᵀ, the √dₖ scaling, softmax, and the weighted sum of values. Toggle the causal mask to turn an encoder into a decoder. Every step cites its source.',
        status: 'live',
        route: '/visualizer/attention',
    },
    {
        id: 'transformer-arch',
        name: 'Transformer Architecture Map',
        domain: 'ml',
        year: 2017,
        authors: 'Vaswani et al.',
        summary:
            'The whole stack as a clickable map — embeddings, attention blocks, MLPs, the residual stream — each component opening its own breakdown.',
        intro:
            'Zoom from the whole model down to a single attention head computing real weights. Pick a configuration and every number on the page — parameter counts, head dimensions, KV cost per token — is recomputed from it. Every node cites its own paper.',
        status: 'live',
        route: '/visualizer/transformer-arch',
    },
    {
        id: 'llm-inference',
        name: 'LLM Inference Pipeline',
        domain: 'ml',
        year: 2022,
        authors: 'Pope et al. · Yu et al. · Kwon et al.',
        summary:
            'Tokenize → prefill → KV cache → decode → sample. Prefill is compute-bound, decode is memory-bound, and everything follows from that.',
        intro:
            'What actually happens between a request arriving and the last token leaving. Choose a model and an accelerator, and the timings, cache sizes, and batching gains are computed from published specs — then zoom into continuous batching, paged KV, and speculative decoding. Every node cites its own paper.',
        status: 'live',
        route: '/visualizer/llm-inference',
    },
    {
        id: 'training-loop',
        name: 'Training Loop Map',
        domain: 'ml',
        year: 1986,
        authors: 'Rumelhart et al. · Shoeybi et al. · Hoffmann et al.',
        summary:
            'Data, forward, loss, backward, step — and the parallelism, precision, and scaling laws that make it survive a thousand GPUs.',
        intro:
            'One optimizer step, and then a hundred thousand of them. Pick a run and a cluster to see FLOPs, wall clock, optimizer state, and how ZeRO, tensor, and pipeline parallelism divide it up — plus whether the run sits at the compute-optimal point. Every node cites its own paper.',
        status: 'live',
        route: '/visualizer/training-loop',
    },
    {
        id: 'raft',
        name: 'Raft Consensus',
        domain: 'systems',
        year: 2014,
        authors: 'Ongaro · Ousterhout',
        summary:
            'Elect a leader, replicate a log, survive a partition — and watch what the protocol refuses to commit.',
        intro:
            'Five servers, randomized timeouts, and a majority rule. Split the network and see the old leader keep trying while the larger side elects a new one — then heal it and watch one log win. The simulation follows Raft’s actual rules; the tests assert its safety properties on every frame. Every step cites its source.',
        status: 'live',
        route: '/visualizer/raft',
    },
    {
        id: 'consistent-hashing',
        name: 'Consistent Hashing',
        domain: 'systems',
        year: 1997,
        authors: 'Karger et al.',
        summary:
            'Keys on a ring: add a server and almost nothing moves — where hash mod N moves nearly everything.',
        intro:
            'Hash servers and keys into the same circle, and a key belongs to the first server clockwise. Add a server and only one arc changes hands. Turn up the virtual-node count and watch the load bars flatten — the one knob that made the ring practical. Every step cites its source.',
        status: 'live',
        route: '/visualizer/consistent-hashing',
    },
    {
        id: 'mapreduce',
        name: 'MapReduce',
        domain: 'systems',
        year: 2004,
        authors: 'Dean · Ghemawat',
        summary:
            'Two functions you write, a thousand machines you do not manage — and the three tricks that make it work.',
        intro:
            'A clickable job map: splits, map, combiner, shuffle, reduce — then the systems concerns that are the actual contribution, namely re-execution on failure, scheduling for locality, and backup tasks for stragglers. Job shapes are computed from the input size. Every node cites its source.',
        status: 'live',
        route: '/visualizer/mapreduce',
    },
    {
        id: 'cap',
        name: 'The CAP Theorem',
        domain: 'systems',
        year: 2002,
        authors: 'Brewer · Gilbert & Lynch',
        summary:
            'One write, one read, one partition — and a choice between an answer that is wrong and no answer at all.',
        intro:
            'Pick a policy and watch the same scenario play out: CP refuses to answer, AP answers with stale data. When the network is healthy, nothing is given up at all — the part most summaries lose. Then tune R, W, and N to see where the dial really lives. Every step cites its source.',
        status: 'live',
        route: '/visualizer/cap',
    },
];

export const liveEntries = () => CATALOG.filter((entry) => entry.status === 'live');

export const entriesByDomain = (domainId) =>
    CATALOG.filter((entry) => entry.domain === domainId);
