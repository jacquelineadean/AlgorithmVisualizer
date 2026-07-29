import { describe, expect, it } from 'vitest';
import {
    CHAINS,
    getChain,
    isAperiodic,
    isIrreducible,
    isStochastic,
    l1,
    period,
    pointMass,
    powerIteration,
    stationary,
    step,
    uniform,
} from './model';
import { buildMarkovTrace } from './trace';

describe('chain presets', () => {
    it('are all stochastic matrices', () => {
        for (const chain of CHAINS) {
            expect(isStochastic(chain.matrix), chain.id).toBe(true);
            expect(chain.matrix).toHaveLength(chain.states.length);
        }
    });

    it('cover the ergodic, periodic, and reducible cases', () => {
        expect(isIrreducible(getChain('weather').matrix)).toBe(true);
        expect(isAperiodic(getChain('weather').matrix)).toBe(true);
        expect(period(getChain('flipflop').matrix)).toBe(2);
        expect(isIrreducible(getChain('absorbing').matrix)).toBe(false);
    });
});

describe('power iteration', () => {
    it('keeps distributions normalized at every step', () => {
        for (const chain of CHAINS) {
            const path = powerIteration(chain.matrix, uniform(chain.states.length), 25);
            for (const distribution of path) {
                expect(distribution.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
                expect(Math.min(...distribution)).toBeGreaterThanOrEqual(0);
            }
        }
    });

    it('lands on a vector the matrix leaves alone', () => {
        const { matrix } = getChain('weather');
        const { distribution, converged } = stationary(matrix, uniform(3));
        expect(converged).toBe(true);
        expect(l1(step(distribution, matrix), distribution)).toBeLessThan(1e-9);
    });

    it('forgets its start when the chain is ergodic, and remembers it when reducible', () => {
        const weather = getChain('weather').matrix;
        const fromSun = stationary(weather, pointMass(3, 0)).distribution;
        const fromRain = stationary(weather, pointMass(3, 2)).distribution;
        expect(l1(fromSun, fromRain)).toBeLessThan(1e-6);

        const traps = getChain('absorbing').matrix;
        const fromLeft = stationary(traps, pointMass(3, 0)).distribution;
        const fromRight = stationary(traps, pointMass(3, 2)).distribution;
        expect(l1(fromLeft, fromRight)).toBeCloseTo(2, 6); // opposite point masses
    });

    it('reports non-convergence for the periodic chain', () => {
        const { converged } = stationary(getChain('flipflop').matrix, pointMass(2, 0), 1e-10, 200);
        expect(converged).toBe(false);
    });
});

describe('buildMarkovTrace', () => {
    it('records the trajectory the stage draws and validates inputs', () => {
        const { steps, artifacts } = buildMarkovTrace({
            chainId: 'weather',
            startIndex: -1,
            iterations: 40,
        });
        expect(artifacts.path).toHaveLength(41);
        expect(steps.flatMap((s) => s.stream?.events ?? [])).toHaveLength(39);
        expect(artifacts.ergodic).toBe(true);
        expect(() => buildMarkovTrace({ chainId: 'weather', startIndex: 9 })).toThrow(/starting state/);
    });

    it('says out loud when a chain has no limit', () => {
        const { steps, artifacts } = buildMarkovTrace({ chainId: 'flipflop', startIndex: 0 });
        expect(artifacts.ergodic).toBe(false);
        expect(steps.find((s) => s.id === 'stationary').title).toMatch(/No fixed point/i);
    });
});
