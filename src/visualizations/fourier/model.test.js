import { describe, expect, it } from 'vitest';
import {
    PATHS,
    byAmplitude,
    dft,
    epicycles,
    evaluate,
    fftOps,
    naiveOps,
    reconstructionError,
    samplePath,
    signalEnergy,
    spectrumEnergy,
    strongest,
} from './model';
import { buildFourierTrace } from './trace';

describe('the transform', () => {
    it('inverts exactly — every sample is reproduced by the full spectrum', () => {
        for (const path of PATHS) {
            const points = samplePath(path.id, 64);
            const coefficients = dft(points);
            expect(reconstructionError(points, coefficients), path.id).toBeLessThan(1e-9);
        }
    });

    it('turns a circle into a single coefficient', () => {
        const coefficients = dft(samplePath('circle', 64));
        const ordered = byAmplitude(coefficients);
        expect(ordered[0].k).toBe(1);
        expect(ordered[0].amplitude).toBeCloseTo(1, 9);
        expect(ordered[1].amplitude).toBeLessThan(1e-9);
    });

    it('puts a star’s energy on the harmonics its symmetry predicts', () => {
        // r = 1 + 0.55·cos(5θ) has components only at k = 1, 6, and −4.
        const coefficients = dft(samplePath('star', 128));
        const significant = coefficients
            .filter((c) => c.amplitude > 0.01)
            .map((c) => c.k)
            .sort((a, b) => a - b);
        expect(significant).toEqual([-4, 1, 6]);
    });

    it('satisfies Parseval’s relation', () => {
        for (const path of PATHS) {
            const points = samplePath(path.id, 64);
            expect(spectrumEnergy(dft(points))).toBeCloseTo(signalEnergy(points), 9);
        }
    });

    it('centres its frequency axis, so negative k means clockwise', () => {
        const coefficients = dft(samplePath('heart', 32));
        expect(Math.min(...coefficients.map((c) => c.k))).toBeLessThan(0);
        expect(Math.max(...coefficients.map((c) => c.k))).toBeGreaterThan(0);
        expect(coefficients.map((c) => c.k)).toContain(0);
    });
});

describe('truncation', () => {
    it('lowers the error monotonically as circles are added', () => {
        const points = samplePath('square', 64);
        const coefficients = dft(points);
        let previous = Infinity;
        for (const count of [1, 2, 4, 8, 16, 32, 64]) {
            const error = reconstructionError(points, strongest(coefficients, count));
            expect(error).toBeLessThanOrEqual(previous + 1e-12);
            previous = error;
        }
        expect(previous).toBeLessThan(1e-9);
    });

    it('captures most of the energy in a handful of coefficients for smooth paths', () => {
        const points = samplePath('heart', 128);
        const coefficients = dft(points);
        const share = spectrumEnergy(strongest(coefficients, 6)) / signalEnergy(points);
        expect(share).toBeGreaterThan(0.99);
    });
});

describe('epicycles', () => {
    it('chains tip to tail and lands on the reconstruction', () => {
        const coefficients = strongest(dft(samplePath('star', 64)), 8);
        for (const t of [0, 0.25, 0.5, 0.9]) {
            const chain = epicycles(byAmplitude(coefficients), t);
            for (let i = 1; i < chain.length; i++) {
                expect(chain[i].from.x).toBeCloseTo(chain[i - 1].to.x, 12);
                expect(chain[i].from.y).toBeCloseTo(chain[i - 1].to.y, 12);
            }
            const tip = chain.at(-1).to;
            const target = evaluate(coefficients, t);
            expect(tip.x).toBeCloseTo(target.x, 10);
            expect(tip.y).toBeCloseTo(target.y, 10);
        }
    });

    it('closes the loop: t = 0 and t = 1 are the same point', () => {
        const coefficients = strongest(dft(samplePath('square', 64)), 12);
        const start = evaluate(coefficients, 0);
        const end = evaluate(coefficients, 1);
        expect(end.x).toBeCloseTo(start.x, 12);
        expect(end.y).toBeCloseTo(start.y, 12);
    });
});

describe('the cost argument', () => {
    it('separates N² from N log N by orders of magnitude at scale', () => {
        expect(naiveOps(1024)).toBe(1048576);
        expect(fftOps(1024)).toBe(10240);
        expect(naiveOps(2 ** 20) / fftOps(2 ** 20)).toBeGreaterThan(50000);
    });
});

describe('buildFourierTrace', () => {
    it('streams one tick per sample and validates the controls', () => {
        const { steps, artifacts } = buildFourierTrace({
            pathId: 'square',
            harmonics: 12,
            samples: 128,
        });
        expect(steps.flatMap((step) => step.stream?.events ?? [])).toHaveLength(128);
        expect(artifacts.kept).toHaveLength(12);
        expect(() => buildFourierTrace({ pathId: 'square', harmonics: 0, samples: 64 })).toThrow(
            /circles/
        );
        expect(() => buildFourierTrace({ pathId: 'square', harmonics: 4, samples: 4 })).toThrow(
            /Sample the path/
        );
    });
});
