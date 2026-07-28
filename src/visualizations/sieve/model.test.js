import { describe, expect, it } from 'vitest';
import { applySieveEvents, sieveEvents } from './model';
import { buildSieveTrace } from './trace';

const isPrime = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
};

describe('sieveEvents', () => {
    it('finds exactly the primes (checked against trial division)', () => {
        for (const N of [10, 30, 120, 240]) {
            const { primes } = sieveEvents(N);
            const expected = [];
            for (let n = 2; n <= N; n++) if (isPrime(n)) expected.push(n);
            expect(primes).toEqual(expected);
        }
    });

    it('π(120) = 30, and every composite is crossed by its smallest prime factor', () => {
        const { events, primes } = sieveEvents(120);
        expect(primes.length).toBe(30);
        for (const e of events) {
            if (e.t !== 'cross') continue;
            expect(e.n % e.by).toBe(0);
            // No prime smaller than `by` divides n.
            for (const p of primes) {
                if (p >= e.by) break;
                expect(e.n % p).not.toBe(0);
            }
            expect(e.n).toBeGreaterThanOrEqual(e.by * e.by);
        }
    });

    it('folds incrementally', () => {
        const { events } = sieveEvents(60);
        const mid = applySieveEvents(events, 5);
        expect(mid.primes.size + mid.crossed.size).toBe(5);
        const full = applySieveEvents(events, events.length);
        expect(full.primes.size).toBe(17); // π(60)
    });
});

describe('buildSieveTrace', () => {
    it('streams every event exactly once and validates input', () => {
        const { steps, artifacts } = buildSieveTrace({ N: 60 });
        const streamed = steps.flatMap((s) => s.stream?.events ?? []);
        expect(streamed).toEqual(artifacts.events);
        expect(() => buildSieveTrace({ N: 5 })).toThrow(/between/);
    });
});
