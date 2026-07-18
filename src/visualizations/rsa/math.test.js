import { describe, expect, it } from 'vitest';
import {
    egcdSteps,
    encodeMessage,
    gcd,
    isPrime,
    modInverse,
    modPow,
    modPowSteps,
    PRIMES,
    randomPrimePair,
    validPublicExponents,
} from './math';

describe('gcd / egcd', () => {
    it('computes gcd', () => {
        expect(gcd(3120n, 17n)).toBe(1n);
        expect(gcd(48n, 18n)).toBe(6n);
        expect(gcd(0n, 5n)).toBe(5n);
    });

    it('produces Bézout coefficients satisfying a·x + b·y = g', () => {
        const { g, x, y } = egcdSteps(17n, 3120n);
        expect(g).toBe(1n);
        expect(17n * x + 3120n * y).toBe(1n);
    });

    it('records division rows a = q·b + r', () => {
        const { rows } = egcdSteps(17n, 3120n);
        for (const { a, b, q, r } of rows) {
            expect(a).toBe(q * b + r);
        }
        expect(rows.at(-1).r).toBe(gcd(17n, 3120n) === 1n ? 0n : rows.at(-1).r);
    });
});

describe('modInverse', () => {
    it('matches the classic worked example (17⁻¹ mod 3120 = 2753)', () => {
        expect(modInverse(17n, 3120n)).toBe(2753n);
        expect((17n * 2753n) % 3120n).toBe(1n);
    });

    it('throws when no inverse exists', () => {
        expect(() => modInverse(6n, 9n)).toThrow(/no inverse/);
    });
});

describe('modPow', () => {
    it('matches direct computation on small cases', () => {
        expect(modPow(72n, 17n, 3233n)).toBe(72n ** 17n % 3233n);
        expect(modPow(5n, 0n, 7n)).toBe(1n);
        expect(modPow(0n, 5n, 7n)).toBe(0n);
    });

    it('records one square-and-multiply row per exponent bit', () => {
        const { bits, rows, result } = modPowSteps(72n, 17n, 3233n);
        expect(bits).toBe('10001');
        expect(rows).toHaveLength(5);
        expect(rows.at(-1).value).toBe(result);
    });
});

describe('primes and exponents', () => {
    it('every offered prime is prime and ≥ 11', () => {
        for (const p of PRIMES) {
            expect(isPrime(p)).toBe(true);
            expect(p >= 11n).toBe(true);
        }
    });

    it('random pairs are distinct primes from the list', () => {
        for (let i = 0; i < 20; i++) {
            const [p, q] = randomPrimePair();
            expect(p).not.toBe(q);
            expect(PRIMES).toContain(p);
            expect(PRIMES).toContain(q);
        }
    });

    it('valid public exponents are coprime to φ and in range', () => {
        const phi = 3120n;
        const options = validPublicExponents(phi);
        expect(options).toContain(17n);
        for (const e of options) {
            expect(gcd(e, phi)).toBe(1n);
            expect(e < phi).toBe(true);
        }
        // 3 divides 3120, so 3 must be filtered out.
        expect(options).not.toContain(3n);
    });
});

describe('encodeMessage', () => {
    it('encodes printable ASCII to char codes', () => {
        expect(encodeMessage('HI')).toEqual([
            { char: 'H', code: 72n },
            { char: 'I', code: 73n },
        ]);
    });

    it('rejects non-ASCII characters', () => {
        expect(() => encodeMessage('héllo')).toThrow(/printable ASCII/);
    });
});
