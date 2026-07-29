import { describe, expect, it } from 'vitest';
import {
    continuedFraction,
    divisionSteps,
    extendedEuclid,
    fibonacciPair,
    gcd,
    lameBound,
    subtractionSteps,
} from './model';
import { buildEuclidTrace } from './trace';

const PAIRS = [
    [1071n, 462n],
    [462n, 1071n],
    [17n, 3120n],
    [377n, 233n],
    [100n, 100n],
    [1n, 99991n],
];

describe('gcd', () => {
    it('matches the classic worked example', () => {
        expect(gcd(1071n, 462n)).toBe(21n);
    });

    it('agrees between the subtraction and division forms', () => {
        for (const [a, b] of PAIRS) {
            expect(subtractionSteps(a, b).gcd).toBe(divisionSteps(a, b).gcd);
            expect(divisionSteps(a, b).gcd).toBe(gcd(a, b));
        }
    });

    it('divides both inputs, and nothing larger does', () => {
        for (const [a, b] of PAIRS) {
            const g = gcd(a, b);
            expect(a % g).toBe(0n);
            expect(b % g).toBe(0n);
            for (let d = g + 1n; d <= (a < b ? a : b) && d < g + 50n; d++) {
                expect(a % d === 0n && b % d === 0n).toBe(false);
            }
        }
    });

    it('rejects non-positive inputs', () => {
        expect(() => divisionSteps(0n, 5n)).toThrow(/positive/);
        expect(() => subtractionSteps(5n, -1n)).toThrow(/positive/);
    });
});

describe('the division form', () => {
    it('replaces a run of subtractions with one step', () => {
        expect(subtractionSteps(1071n, 462n).steps.length).toBeGreaterThan(
            divisionSteps(1071n, 462n).steps.length
        );
    });

    it('produces the continued fraction of a / b', () => {
        // 1071/462 = [2; 3, 7] — reconstruct it and check.
        const quotients = continuedFraction(1071n, 462n);
        expect(quotients).toEqual([2n, 3n, 7n]);
        let value = Number(quotients.at(-1));
        for (let i = quotients.length - 2; i >= 0; i--) value = Number(quotients[i]) + 1 / value;
        expect(value).toBeCloseTo(1071 / 462, 9);
    });

    it('keeps each remainder strictly smaller than its divisor', () => {
        for (const [a, b] of PAIRS) {
            for (const step of divisionSteps(a, b).steps) {
                expect(step.remainder).toBeLessThan(step.b);
                expect(step.a).toBe(step.quotient * step.b + step.remainder);
            }
        }
    });
});

describe('extended Euclid', () => {
    it('produces Bézout coefficients that check out', () => {
        for (const [a, b] of PAIRS) {
            const { gcd: g, s, t } = extendedEuclid(a, b);
            expect(g).toBe(gcd(a, b));
            expect(a * s + b * t).toBe(g);
        }
    });

    it('finds a modular inverse when the gcd is 1', () => {
        const { gcd: g, s } = extendedEuclid(17n, 3120n);
        expect(g).toBe(1n);
        expect((17n * (((s % 3120n) + 3120n) % 3120n)) % 3120n).toBe(1n);
    });
});

describe('Lamé’s bound', () => {
    it('holds for every pair, and Fibonacci pairs are the worst case', () => {
        for (const [a, b] of PAIRS) {
            const smaller = a < b ? a : b;
            expect(divisionSteps(a, b).steps.length).toBeLessThanOrEqual(lameBound(smaller));
        }
        // Every quotient of a Fibonacci pair is 1 — nothing shrinks slower.
        const [f1, f2] = fibonacciPair(14);
        const quotients = divisionSteps(f1, f2).steps.map((step) => step.quotient);
        expect(quotients.slice(0, -1).every((q) => q === 1n)).toBe(true);
    });
});

describe('buildEuclidTrace', () => {
    it('streams one event per subtraction and validates the range', () => {
        const { steps, artifacts } = buildEuclidTrace({ a: 1071n, b: 462n });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toHaveLength(artifacts.subtraction.steps.length);
        expect(artifacts.gcd).toBe(21n);
        expect(() => buildEuclidTrace({ a: 200000n, b: 5n })).toThrow(/100,000/);
        expect(() => buildEuclidTrace({ a: 5, b: 5 })).toThrow(/positive integers/);
    });
});
