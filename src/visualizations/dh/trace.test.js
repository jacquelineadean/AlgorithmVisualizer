import { describe, expect, it } from 'vitest';
import { modPow } from '../mathlib/modular';
import { SAFE_PRIMES, generatorOptions } from './math';
import { ACTS, buildDhTrace } from './trace';

const CLASSIC = { p: 83n, g: 2n, a: 9n, b: 21n };

describe('buildDhTrace', () => {
    it('reproduces the default worked example (A=14, B=74, s=22)', () => {
        const { artifacts } = buildDhTrace(CLASSIC);
        expect(artifacts.A).toBe(14n);
        expect(artifacts.B).toBe(74n);
        expect(artifacts.s).toBe(22n);
    });

    it('both parties always derive the same secret', () => {
        for (const p of [23n, 107n, 359n, 983n]) {
            const g = generatorOptions(p, 1)[0];
            for (const [a, b] of [
                [2n, p - 2n],
                [5n, 7n],
                [(p - 1n) / 2n, 3n],
            ]) {
                const { artifacts } = buildDhTrace({ p, g, a, b });
                expect(artifacts.s).toBe(artifacts.sBob);
                expect(artifacts.s).toBe(modPow(g, a * b, p));
            }
        }
    });

    it('validates inputs', () => {
        expect(() => buildDhTrace({ ...CLASSIC, p: 84n })).toThrow(/safe prime/);
        expect(() => buildDhTrace({ ...CLASSIC, p: 89n })).toThrow(/safe prime/); // (89−1)/2 = 44
        expect(() => buildDhTrace({ ...CLASSIC, g: 3n })).toThrow(/generator/);
        expect(() => buildDhTrace({ ...CLASSIC, a: 1n })).toThrow(/Secrets/);
        expect(() => buildDhTrace({ ...CLASSIC, b: 82n })).toThrow(/Secrets/);
    });

    it('assigns every step to a declared act and uses all acts', () => {
        const actIds = new Set(ACTS.map((act) => act.id));
        const { steps } = buildDhTrace(CLASSIC);
        for (const step of steps) {
            expect(actIds.has(step.act)).toBe(true);
        }
        expect(new Set(steps.map((s) => s.act)).size).toBe(ACTS.length);
    });

    it('offers a sensible list of safe primes for the UI', () => {
        expect(SAFE_PRIMES).toContain(83n);
        expect(SAFE_PRIMES.length).toBeGreaterThan(10);
    });
});
