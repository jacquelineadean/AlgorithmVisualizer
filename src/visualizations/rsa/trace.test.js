import { describe, expect, it } from 'vitest';
import { buildRsaTrace, suggestPublicExponent, ACTS } from './trace';
import { PRIMES } from './math';

const CLASSIC = { message: 'HELLO', p: 61n, q: 53n, e: 17n };

describe('buildRsaTrace', () => {
    it('reproduces the classic worked example (p=61, q=53, e=17 → d=2753)', () => {
        const { artifacts } = buildRsaTrace(CLASSIC);
        expect(artifacts.n).toBe(3233n);
        expect(artifacts.phi).toBe(3120n);
        expect(artifacts.d).toBe(2753n);
    });

    it('round-trips the message through encrypt + decrypt', () => {
        const { artifacts } = buildRsaTrace(CLASSIC);
        expect(artifacts.recovered).toBe('HELLO');
        // Ciphertext must actually differ from the plaintext blocks.
        const changed = artifacts.encrypted.some(({ m, c }) => m !== c);
        expect(changed).toBe(true);
    });

    it('round-trips across many prime pairs and messages', () => {
        const messages = ['a', 'Zz 9!', '~pun ctu@tion~'];
        for (let i = 0; i < PRIMES.length - 1; i += 3) {
            const p = PRIMES[i];
            const q = PRIMES[i + 1];
            const e = suggestPublicExponent((p - 1n) * (q - 1n));
            for (const message of messages) {
                const { artifacts } = buildRsaTrace({ message, p, q, e });
                expect(artifacts.recovered).toBe(message);
            }
        }
    });

    it('validates inputs', () => {
        expect(() => buildRsaTrace({ ...CLASSIC, p: 60n })).toThrow(/prime/);
        expect(() => buildRsaTrace({ ...CLASSIC, q: 61n })).toThrow(/different/);
        expect(() => buildRsaTrace({ ...CLASSIC, e: 4n })).toThrow(/not valid/);
        expect(() => buildRsaTrace({ ...CLASSIC, message: '' })).toThrow(/message/);
        expect(() => buildRsaTrace({ ...CLASSIC, message: 'x'.repeat(17) })).toThrow(/16/);
    });

    it('assigns every step to a declared act', () => {
        const actIds = new Set(ACTS.map((act) => act.id));
        const { steps } = buildRsaTrace(CLASSIC);
        for (const step of steps) {
            expect(actIds.has(step.act)).toBe(true);
        }
        // All three acts are actually used.
        expect(new Set(steps.map((s) => s.act)).size).toBe(ACTS.length);
    });
});

// The evidence gate for RSA now runs in the central suite
// (src/visualizations/evidence-gate.test.js) over the registry.

describe('suggestPublicExponent', () => {
    it('prefers 17, then 65537, then the smallest valid option', () => {
        expect(suggestPublicExponent(3120n)).toBe(17n); // classic example
        // φ = 16 rules out 17 and 65537 (both ≥ φ); smallest coprime is 3.
        expect(suggestPublicExponent(16n)).toBe(3n);
    });
});
