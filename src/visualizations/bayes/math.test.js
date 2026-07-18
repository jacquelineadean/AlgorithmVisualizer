import { describe, expect, it } from 'vitest';
import {
    asPercent,
    populationCounts,
    posteriorExact,
    scatterPermutation,
} from './math';

// The classic mammography numbers (Eddy 1982 / Gigerenzer & Hoffrage 1995):
// prevalence 1%, sensitivity 80%, false-positive rate 9.6%.
const CLASSIC = { prior: 0.01, sensitivity: 0.8, falsePositiveRate: 0.096 };

describe('posteriorExact', () => {
    it('reproduces the classic example (≈ 7.8%)', () => {
        const p = posteriorExact(CLASSIC.prior, CLASSIC.sensitivity, CLASSIC.falsePositiveRate);
        expect(p).toBeCloseTo(0.0776, 3);
    });

    it('is monotone in the prior', () => {
        const low = posteriorExact(0.01, 0.9, 0.05);
        const high = posteriorExact(0.2, 0.9, 0.05);
        expect(high).toBeGreaterThan(low);
    });

    it('handles a perfect test and a zero denominator', () => {
        expect(posteriorExact(0.1, 1, 0)).toBe(1);
        expect(posteriorExact(0, 0, 0)).toBe(0);
    });
});

describe('populationCounts', () => {
    it('reproduces the classic natural frequencies (10 sick, 8 TP, 95 FP → 8/103)', () => {
        const counts = populationCounts({ ...CLASSIC, population: 1000 });
        expect(counts.sick).toBe(10);
        expect(counts.truePositives).toBe(8);
        expect(counts.falsePositives).toBe(95);
        expect(counts.positives).toBe(103);
        expect(counts.posteriorNatural).toBeCloseTo(8 / 103, 6);
    });

    it('partitions the population exactly', () => {
        for (const prior of [0.005, 0.03, 0.2]) {
            for (const fpr of [0, 0.096, 0.3]) {
                const c = populationCounts({
                    prior,
                    sensitivity: 0.85,
                    falsePositiveRate: fpr,
                    population: 1000,
                });
                expect(c.sick + c.healthy).toBe(1000);
                expect(c.truePositives + c.falseNegatives).toBe(c.sick);
                expect(c.falsePositives + c.trueNegatives).toBe(c.healthy);
            }
        }
    });
});

describe('scatterPermutation', () => {
    it('is a deterministic permutation of all indices', () => {
        const a = scatterPermutation(1000);
        const b = scatterPermutation(1000);
        expect(a).toEqual(b);
        expect(new Set(a).size).toBe(1000);
        expect(Math.min(...a)).toBe(0);
        expect(Math.max(...a)).toBe(999);
    });
});

describe('asPercent', () => {
    it('formats fractions', () => {
        expect(asPercent(0.0776)).toBe('7.8%');
        expect(asPercent(0.5, 0)).toBe('50%');
    });
});
