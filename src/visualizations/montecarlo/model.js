// Pure model for Monte Carlo π: seeded darts in the unit square, the
// running estimate they produce, and the ±1/√n error band the law of large
// numbers puts around it.

import { mulberry32 } from '../mathlib/random';

// Darts land in [-1, 1]²; the quarter-circle test is x² + y² ≤ 1.
export function throwDarts({ count, seed }) {
    const rand = mulberry32(seed);
    const darts = [];
    let inside = 0;
    for (let i = 0; i < count; i++) {
        const x = rand() * 2 - 1;
        const y = rand() * 2 - 1;
        const hit = x * x + y * y <= 1;
        if (hit) inside += 1;
        darts.push({ x, y, inside: hit, n: i + 1, hits: inside });
    }
    return { darts, inside };
}

// The estimate after k darts: area of the square (4) times the hit rate.
export const estimateAfter = (hits, n) => (n === 0 ? 0 : (4 * hits) / n);

// Running estimates, thinned for plotting (one point per `stride` darts).
export function convergence(darts, stride = 1) {
    const points = [];
    for (let i = stride - 1; i < darts.length; i += stride) {
        points.push({ n: darts[i].n, pi: estimateAfter(darts[i].hits, darts[i].n) });
    }
    return points;
}

// Standard error of the estimator: 4·√(p(1−p)/n) with p = π/4. This is the
// central limit theorem applied to a Bernoulli count — the same σ/√n rate,
// and the reason Monte Carlo buys precision so slowly.
const P = Math.PI / 4;
export const SIGMA = 4 * Math.sqrt(P * (1 - P));
export const errorBand = (n) => SIGMA / Math.sqrt(n);

// How many darts a target absolute error needs, at ~68% confidence.
export const dartsForError = (target) => Math.ceil((SIGMA / target) ** 2);
