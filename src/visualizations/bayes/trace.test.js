import { describe, expect, it } from 'vitest';
import { buildBayesTrace, POPULATION } from './trace';

const CLASSIC = { prior: 0.01, sensitivity: 0.8, falsePositiveRate: 0.096 };

describe('buildBayesTrace', () => {
    it('reproduces the classic worked example', () => {
        const { artifacts } = buildBayesTrace(CLASSIC);
        expect(artifacts.population).toBe(POPULATION);
        expect(artifacts.truePositives).toBe(8);
        expect(artifacts.falsePositives).toBe(95);
        expect(artifacts.posteriorNatural).toBeCloseTo(8 / 103, 6);
        expect(artifacts.exact).toBeCloseTo(0.0776, 3);
    });

    it('validates inputs', () => {
        expect(() => buildBayesTrace({ ...CLASSIC, prior: 0 })).toThrow(/Prevalence/);
        expect(() => buildBayesTrace({ ...CLASSIC, sensitivity: 0.3 })).toThrow(/Sensitivity/);
        expect(() => buildBayesTrace({ ...CLASSIC, falsePositiveRate: 0.9 })).toThrow(
            /false-positive/
        );
    });

    it('keeps steps consistent with artifacts as inputs vary', () => {
        for (const prior of [0.002, 0.05, 0.3]) {
            const { steps, artifacts } = buildBayesTrace({ ...CLASSIC, prior });
            const posteriorStep = steps.find((s) => s.id === 'posterior');
            expect(posteriorStep.explanation).toContain(String(artifacts.truePositives));
        }
    });
});

// The evidence gate for Bayes now runs in the central suite
// (src/visualizations/evidence-gate.test.js) over the registry.
