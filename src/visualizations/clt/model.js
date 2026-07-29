// Pure model for the central limit theorem: populations with known mean and
// variance, seeded sampling, and histogram binning. No UI imports.

import { mulberry32 } from '../mathlib/random';

// Each population declares its true mean and standard deviation
// analytically — the visualization compares the sampling distribution
// against σ/√n, so the target must not be estimated from the same draws.
export const POPULATIONS = [
    {
        id: 'dice',
        label: 'Fair die (uniform 1–6)',
        blurb: 'Six flat outcomes — nothing bell-shaped about it.',
        mean: 3.5,
        sd: Math.sqrt(35 / 12),
        domain: [0, 7],
        draw: (rand) => 1 + Math.floor(rand() * 6),
    },
    {
        id: 'exponential',
        label: 'Exponential (hard right skew)',
        blurb: 'A long tail: most draws are small, a few are enormous.',
        mean: 1,
        sd: 1,
        domain: [0, 6],
        draw: (rand) => -Math.log(1 - rand()),
    },
    {
        id: 'bimodal',
        label: 'Bimodal (two humps)',
        blurb: 'Two separated clumps; the mean sits where nothing lands.',
        mean: 3,
        sd: Math.sqrt(4 + 1 / 12),
        domain: [0, 6],
        draw: (rand) => (rand() < 0.5 ? 0.5 + rand() : 4.5 + rand()),
    },
    {
        id: 'uniform',
        label: 'Uniform on [0, 6]',
        blurb: 'Flat: every value in the range equally likely.',
        mean: 3,
        sd: 6 / Math.sqrt(12),
        domain: [0, 6],
        draw: (rand) => rand() * 6,
    },
];

export const getPopulation = (id) =>
    POPULATIONS.find((population) => population.id === id) ?? POPULATIONS[0];

// The standard error the theorem predicts for means of n draws.
export const standardError = (population, n) => population.sd / Math.sqrt(n);

// One sample of n draws, plus its mean.
export function drawSample(population, n, rand) {
    const values = Array.from({ length: n }, () => population.draw(rand));
    return { values, mean: values.reduce((a, b) => a + b, 0) / n };
}

// `count` sample means of size n, deterministic in the seed.
export function sampleMeans({ populationId, n, count, seed }) {
    const population = getPopulation(populationId);
    const rand = mulberry32(seed);
    const first = drawSample(population, n, rand);
    const means = [first.mean];
    for (let i = 1; i < count; i++) means.push(drawSample(population, n, rand).mean);
    return { population, firstSample: first.values, means };
}

// A reference draw from the population itself, for the "before" picture.
export const populationDraws = (population, count, seed) => {
    const rand = mulberry32(seed ^ 0x9e3779b9);
    return Array.from({ length: count }, () => population.draw(rand));
};

// Equal-width bins over [lo, hi]; returns densities so histograms of
// different sample counts stay comparable against a density curve.
export function histogram(values, bins, [lo, hi]) {
    const counts = new Array(bins).fill(0);
    const width = (hi - lo) / bins;
    for (const value of values) {
        if (value < lo || value >= hi) continue;
        // Scale by the whole span before flooring — (value - lo) / width
        // rounds 0.6/0.2 down to bin 2 on binary floats.
        counts[Math.min(bins - 1, Math.floor(((value - lo) / (hi - lo)) * bins))] += 1;
    }
    const total = values.length || 1;
    return counts.map((count, i) => ({
        x0: lo + i * width,
        x1: lo + (i + 1) * width,
        count,
        density: count / (total * width),
    }));
}

// Normal density curve, sampled for the overlay.
export function normalCurve(mean, sd, [lo, hi], points = 120) {
    const scale = 1 / (sd * Math.sqrt(2 * Math.PI));
    return Array.from({ length: points + 1 }, (_, i) => {
        const x = lo + ((hi - lo) * i) / points;
        const z = (x - mean) / sd;
        return { x, y: scale * Math.exp(-0.5 * z * z) };
    });
}

// Share of sample means within k standard errors of the true mean — the
// number the bell curve is predicting.
export function withinBand(means, mean, se, k = 1) {
    if (means.length === 0) return 0;
    const hits = means.filter((value) => Math.abs(value - mean) <= k * se).length;
    return hits / means.length;
}
