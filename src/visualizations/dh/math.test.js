import { describe, expect, it } from 'vitest';
import { modPow } from '../mathlib/modular';
import {
    SAFE_PRIMES,
    generatorOptions,
    isGenerator,
    isSafePrime,
    randomExponent,
} from './math';

describe('safe primes', () => {
    it('every offered prime is a safe prime', () => {
        for (const p of SAFE_PRIMES) {
            expect(isSafePrime(p), `${p} should be a safe prime`).toBe(true);
        }
    });
});

describe('isGenerator', () => {
    it('accepts known generators and rejects non-generators mod 83', () => {
        // 2 and 5 generate Z_83*; 3 has order 41; 1 and p−1 are degenerate.
        expect(isGenerator(2n, 83n)).toBe(true);
        expect(isGenerator(5n, 83n)).toBe(true);
        expect(isGenerator(3n, 83n)).toBe(false);
        expect(isGenerator(1n, 83n)).toBe(false);
        expect(isGenerator(82n, 83n)).toBe(false);
    });

    it('generator powers really do cycle through the whole group', () => {
        const p = 23n;
        for (const g of generatorOptions(p)) {
            const seen = new Set();
            for (let k = 0n; k < p - 1n; k++) {
                seen.add(modPow(g, k, p).toString());
            }
            expect(seen.size).toBe(Number(p - 1n));
        }
    });
});

describe('generatorOptions', () => {
    it('returns generators only, capped at the limit', () => {
        for (const p of [23n, 83n, 107n]) {
            const options = generatorOptions(p, 5);
            expect(options.length).toBeGreaterThan(0);
            expect(options.length).toBeLessThanOrEqual(5);
            for (const g of options) {
                expect(isGenerator(g, p)).toBe(true);
            }
        }
    });
});

describe('randomExponent', () => {
    it('stays within 2 … p−2', () => {
        for (let i = 0; i < 50; i++) {
            const x = randomExponent(23n);
            expect(x >= 2n && x <= 21n).toBe(true);
        }
    });
});
