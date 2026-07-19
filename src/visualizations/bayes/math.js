// Pure math for the Bayes' rule visualization. No UI imports.
// Works in two registers the trace shows side by side:
//   - exact probabilities (Bayes' theorem)
//   - natural frequencies over a fixed population (counts of people)

import { seededShuffle } from '../mathlib/random';

// Exact posterior P(D | +) from prior, sensitivity, and false-positive rate.
export function posteriorExact(prior, sensitivity, falsePositiveRate) {
    const truePositiveMass = prior * sensitivity;
    const falsePositiveMass = (1 - prior) * falsePositiveRate;
    const denominator = truePositiveMass + falsePositiveMass;
    if (denominator === 0) return 0;
    return truePositiveMass / denominator;
}

// Natural-frequency breakdown of a population. Counts are rounded to whole
// people — the rounding is a labeled teaching simplification in the trace.
export function populationCounts({ prior, sensitivity, falsePositiveRate, population }) {
    const sick = Math.round(population * prior);
    const healthy = population - sick;
    const truePositives = Math.round(sick * sensitivity);
    const falseNegatives = sick - truePositives;
    const falsePositives = Math.round(healthy * falsePositiveRate);
    const trueNegatives = healthy - falsePositives;
    const positives = truePositives + falsePositives;
    const posteriorNatural = positives === 0 ? 0 : truePositives / positives;
    return {
        sick,
        healthy,
        truePositives,
        falseNegatives,
        falsePositives,
        trueNegatives,
        positives,
        posteriorNatural,
    };
}

export const asPercent = (x, digits = 1) => `${(x * 100).toFixed(digits)}%`;

// Deterministic scatter of the population across the dot grid: a fixed
// pseudo-random permutation of indices, so dots stay put as sliders move
// and prevalence "grows" instead of reshuffling.
export function scatterPermutation(size, seed = 1763) {
    return seededShuffle(
        Array.from({ length: size }, (_, i) => i),
        seed
    );
}
