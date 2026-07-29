// Pure model for Markov chains: stochastic matrices, the power iteration
// that pushes a distribution forward, and the structural tests (irreducible,
// aperiodic) that decide whether a unique stationary distribution exists.

// Presets are chosen to cover the interesting cases: an ergodic weather
// chain, a link graph that previews PageRank, a periodic chain that never
// settles, and a reducible one whose limit depends on where you start.
export const CHAINS = [
    {
        id: 'weather',
        label: 'Weather (ergodic)',
        states: ['Sun', 'Cloud', 'Rain'],
        matrix: [
            [0.7, 0.2, 0.1],
            [0.3, 0.4, 0.3],
            [0.2, 0.45, 0.35],
        ],
        note: 'Every state reaches every other, and each can be revisited on consecutive days.',
    },
    {
        id: 'surfer',
        label: 'Random surfer on four pages',
        states: ['A', 'B', 'C', 'D'],
        matrix: [
            [0, 0.5, 0.5, 0],
            [0, 0, 0.5, 0.5],
            [0.5, 0, 0, 0.5],
            [0.34, 0.33, 0.33, 0],
        ],
        note: 'A walk on a link graph — the chain PageRank turns into a ranking.',
    },
    {
        id: 'flipflop',
        label: 'Flip-flop (periodic)',
        states: ['On', 'Off'],
        matrix: [
            [0, 1],
            [1, 0],
        ],
        note: 'Period 2: the distribution oscillates forever instead of converging.',
    },
    {
        id: 'absorbing',
        label: 'Two traps (reducible)',
        states: ['Trap L', 'Middle', 'Trap R'],
        matrix: [
            [1, 0, 0],
            [0.5, 0, 0.5],
            [0, 0, 1],
        ],
        note: 'Two absorbing states: where you end up depends on where you began.',
    },
];

export const getChain = (id) => CHAINS.find((chain) => chain.id === id) ?? CHAINS[0];

const EPS = 1e-9;

export const isStochastic = (matrix) =>
    matrix.every(
        (row) =>
            row.every((value) => value >= -EPS) &&
            Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-6
    );

// One step of the chain: a row vector times the matrix.
export const step = (distribution, matrix) =>
    matrix[0].map((_, j) => distribution.reduce((sum, p, i) => sum + p * matrix[i][j], 0));

// The whole trajectory, distribution by distribution.
export function powerIteration(matrix, start, iterations) {
    const path = [start];
    for (let k = 0; k < iterations; k++) path.push(step(path.at(-1), matrix));
    return path;
}

// Total-variation-style L1 gap between consecutive distributions.
export const l1 = (a, b) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0);

// The stationary distribution, found by iterating until the change stops.
// Returns { distribution, iterations, converged } — a periodic chain never
// converges, and saying so is part of the lesson.
export function stationary(matrix, start, tolerance = 1e-10, maxIterations = 5000) {
    let current = start;
    for (let k = 1; k <= maxIterations; k++) {
        const next = step(current, matrix);
        if (l1(next, current) < tolerance) {
            return { distribution: next, iterations: k, converged: true };
        }
        current = next;
    }
    return { distribution: current, iterations: maxIterations, converged: false };
}

// Reachability closure: can state i reach state j in any number of steps?
function reachability(matrix) {
    const n = matrix.length;
    const reach = matrix.map((row) => row.map((value) => value > EPS));
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (reach[i][k] && reach[k][j]) reach[i][j] = true;
            }
        }
    }
    return reach;
}

// Irreducible: one communicating class — every state reaches every other.
export function isIrreducible(matrix) {
    const reach = reachability(matrix);
    return reach.every((row, i) => row.every((can, j) => i === j || can));
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// Period of state 0's return times, computed from the powers of P. An
// aperiodic chain has period 1; the flip-flop has period 2.
export function period(matrix, limit = 40) {
    const n = matrix.length;
    let power = matrix.map((row) => [...row]);
    let result = 0;
    for (let k = 1; k <= limit; k++) {
        if (power[0][0] > EPS) result = gcd(result, k);
        if (result === 1) return 1;
        power = power.map((row) =>
            matrix[0].map((_, j) => row.reduce((sum, value, m) => sum + value * matrix[m][j], 0))
        );
    }
    return result || limit;
}

export const isAperiodic = (matrix) => period(matrix) === 1;

// Uniform start unless the caller wants a point mass.
export const uniform = (n) => new Array(n).fill(1 / n);
export const pointMass = (n, index) => new Array(n).fill(0).map((_, i) => (i === index ? 1 : 0));
