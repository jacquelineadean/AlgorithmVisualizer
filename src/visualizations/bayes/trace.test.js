import { describe, expect, it } from 'vitest';
import { buildBayesTrace, POPULATION } from './trace';
import { PROVENANCE, SOURCES } from './sources';

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

// The evidence gate — same rule as RSA: no step renders without a
// resolvable citation and a declared provenance class.
describe('evidence gate', () => {
    const { steps } = buildBayesTrace(CLASSIC);

    it('every step carries at least one citation that resolves', () => {
        for (const step of steps) {
            expect(step.sourceRefs.length, `step "${step.id}" has no sources`).toBeGreaterThan(0);
            for (const ref of step.sourceRefs) {
                expect(SOURCES[ref.key], `step "${step.id}" cites unknown source "${ref.key}"`).toBeDefined();
            }
        }
    });

    it('every step declares a known provenance class', () => {
        for (const step of steps) {
            expect(
                PROVENANCE[step.provenance],
                `step "${step.id}" has unknown provenance "${step.provenance}"`
            ).toBeDefined();
        }
    });

    it('caveats cite sources too', () => {
        for (const step of steps) {
            if (!step.caveat) continue;
            expect(step.caveat.sourceRefs.length).toBeGreaterThan(0);
            for (const ref of step.caveat.sourceRefs) {
                expect(SOURCES[ref.key]).toBeDefined();
            }
            expect(PROVENANCE[step.caveat.provenance]).toBeDefined();
        }
    });
});
