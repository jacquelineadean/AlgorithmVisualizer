// Builds the Monte Carlo π trace: a square, an inscribed circle, and enough
// random darts that the hit rate reports an area.

import { convergence, dartsForError, errorBand, throwDarts } from './model';

const fixed = (value, digits = 4) => Number(value).toFixed(digits);

export function buildMonteCarloTrace({ count, seed }) {
    if (!Number.isInteger(count) || count < 50 || count > 20000) {
        throw new Error('Throw between 50 and 20,000 darts.');
    }

    const { darts, inside } = throwDarts({ count, seed });
    const estimate = (4 * inside) / count;
    const error = Math.abs(estimate - Math.PI);
    const band = errorBand(count);
    // One plotted point per ~1% of the run keeps the convergence curve light.
    const curve = convergence(darts, Math.max(1, Math.round(count / 200)));

    const steps = [
        {
            id: 'the-square',
            title: 'A circle inside a square',
            provenance: 'theorem',
            sourceRefs: [{ key: 'METROPOLIS1949', detail: '§1' }],
            explanation:
                'The square spans [−1, 1] in both directions, so its area is 4. The inscribed ' +
                'unit circle has area π. Their ratio is π/4 ≈ 0.7854 — which means a point ' +
                'dropped uniformly on the square lands inside the circle with exactly that ' +
                'probability. The geometry is the whole estimator.',
            kind: 'formula',
            data: {
                view: 'darts',
                eventBase: 0,
                lines: [
                    { tex: '\\Pr[\\,x^2 + y^2 \\le 1\\,] = \\frac{\\text{area of circle}}{\\text{area of square}} = \\frac{\\pi}{4}' },
                    'so  π = 4 × (fraction of darts inside)',
                ],
            },
        },
        {
            id: 'throw',
            title: `Throw ${count.toLocaleString()} darts`,
            provenance: 'paper',
            sourceRefs: [{ key: 'METROPOLIS1949' }, { key: 'ECKHARDT1987' }],
            explanation:
                'Each dart is a pair of uniform random numbers, tested against x² + y² ≤ 1. ' +
                'Ulam’s insight, while laying out solitaire hands during a convalescence in ' +
                '1946, was that sampling could answer questions combinatorics could not — and ' +
                'that the new machines could do the sampling. Green means inside.',
            caveat: {
                provenance: 'pedagogical',
                text: 'The darts come from a seeded mulberry32 generator so a shared link reproduces the exact picture. Production Monte Carlo uses generators with proven equidistribution and enormous periods; a weak generator biases the answer in ways no amount of sampling fixes.',
                sourceRefs: [{ key: 'ROBERT2004', detail: 'Ch. 2' }],
            },
            kind: 'values',
            data: {
                view: 'darts',
                eventBase: 0,
                values: [
                    { label: 'darts', value: count.toLocaleString() },
                    { label: 'test', value: 'x² + y² ≤ 1' },
                ],
            },
            stream: {
                events: darts.map((dart, i) => ({ t: 'dart', i })),
                tick: 16,
                batch: Math.max(1, Math.round(count / 150)),
            },
        },
        {
            id: 'estimate',
            title: 'Count the hits, read off π',
            provenance: 'paper',
            sourceRefs: [{ key: 'METROPOLIS1949', detail: '§2' }],
            explanation:
                `${inside.toLocaleString()} of ${count.toLocaleString()} darts landed inside — ` +
                `a hit rate of ${fixed(inside / count)}. Multiply by the area of the square: ` +
                `π ≈ ${fixed(estimate)}. The true value is 3.1416, so this run is off by ` +
                `${fixed(error)}. No formula for π appears anywhere in the computation.`,
            kind: 'formula',
            data: {
                view: 'darts',
                eventBase: count,
                lines: [
                    `hits / darts = ${inside.toLocaleString()} / ${count.toLocaleString()} = ${fixed(inside / count)}`,
                    `π̂ = 4 × ${fixed(inside / count)} = ${fixed(estimate)}`,
                    `|π̂ − π| = ${fixed(error)}`,
                ],
                result: `π̂ = ${fixed(estimate)}`,
            },
        },
        {
            id: 'convergence',
            title: 'The estimate wanders inward',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'HAMMERSLEY1964', detail: 'Ch. 2' },
                { key: 'ROBERT2004', detail: 'Ch. 3' },
            ],
            explanation:
                'Plotted against the number of darts, the running estimate is a random walk ' +
                'that narrows. The shaded band is ±σ/√n with σ = 4√(p(1−p)) ≈ 1.64, p = π/4 — ' +
                'the central limit theorem applied to a coin flip whose bias is the answer. ' +
                `At n = ${count.toLocaleString()} that band is ±${fixed(band)}; this run ` +
                `finished ${error <= band ? 'inside' : 'outside'} it.`,
            kind: 'formula',
            data: {
                view: 'convergence',
                eventBase: count,
                lines: [
                    { tex: '\\mathrm{SE}(\\hat{\\pi}_n) = \\frac{4\\sqrt{p(1-p)}}{\\sqrt{n}}, \\qquad p = \\frac{\\pi}{4}' },
                    `n = ${count.toLocaleString()}  ⇒  SE = ${fixed(band)}`,
                ],
            },
        },
        {
            id: 'cost',
            title: 'Why anyone accepts 1/√n',
            provenance: 'modern',
            sourceRefs: [
                { key: 'HAMMERSLEY1964', detail: 'Ch. 1' },
                { key: 'ROBERT2004', detail: 'Ch. 3' },
            ],
            explanation:
                `Two more digits of π costs a hundredfold more darts: ${dartsForError(
                    0.01
                ).toLocaleString()} for ±0.01, ${dartsForError(
                    0.001
                ).toLocaleString()} for ±0.001. As a way to compute π it is hopeless. What ` +
                'saves the method is that the rate does not depend on dimension: a grid ' +
                'quadrature in d dimensions needs N^d points, while Monte Carlo still needs ' +
                'σ²/ε². That is why it prices derivatives, renders light transport, and ran ' +
                'neutron diffusion at Los Alamos in the first place.',
            kind: 'values',
            data: {
                view: 'convergence',
                eventBase: count,
                values: [
                    { label: '±0.01 needs', value: dartsForError(0.01).toLocaleString() },
                    { label: '±0.001 needs', value: dartsForError(0.001).toLocaleString() },
                    { label: 'rate', value: 'O(n^−1/2), any dimension' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { darts, inside, count, estimate, error, band, curve },
    };
}
