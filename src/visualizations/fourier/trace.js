// Builds the Fourier trace: a closed path, its spectrum, the chain of
// rotating circles the spectrum describes, and what truncating it costs.

import {
    dft,
    fftOps,
    getPath,
    naiveOps,
    reconstructionError,
    samplePath,
    signalEnergy,
    spectrumEnergy,
    strongest,
} from './model';

const round = (value, digits = 4) => Number(value).toFixed(digits);

export function buildFourierTrace({ pathId, harmonics = 12, samples = 128 }) {
    if (!Number.isInteger(samples) || samples < 16 || samples > 256) {
        throw new Error('Sample the path between 16 and 256 times.');
    }
    if (!Number.isInteger(harmonics) || harmonics < 1 || harmonics > samples) {
        throw new Error(`Keep between 1 and ${samples} circles.`);
    }

    const path = getPath(pathId);
    const points = samplePath(pathId, samples);
    const coefficients = dft(points);
    const kept = strongest(coefficients, harmonics);
    const error = reconstructionError(points, kept);
    const fullError = reconstructionError(points, coefficients);
    const energy = signalEnergy(points);
    const keptEnergy = spectrumEnergy(kept);
    const biggest = strongest(coefficients, 3);

    const steps = [
        {
            id: 'the-path',
            title: `${path.label}, sampled ${samples} times`,
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'BRACEWELL2000', detail: 'Ch. 10' }],
            explanation:
                `${path.note} The trick that makes this work is reading each sample as a ` +
                'single complex number rather than a pair of coordinates — then a closed ' +
                'curve is just a periodic complex signal, and Fourier’s machinery applies ' +
                'to it unchanged.',
            kind: 'values',
            data: {
                view: 'path',
                harmonics: 0,
                values: [
                    { label: 'samples', value: samples },
                    { label: 'period', value: '1 loop' },
                ],
            },
        },
        {
            id: 'transform',
            title: 'Project onto every frequency',
            provenance: 'paper',
            sourceRefs: [{ key: 'FOURIER1822' }, { key: 'BRACEWELL2000', detail: 'Ch. 11' }],
            explanation:
                'For each frequency k, multiply the signal by a unit vector spinning backwards ' +
                'at that rate and average. Anything rotating at k lines up and survives the ' +
                'average; everything else cancels. Fourier’s 1822 claim — that any periodic ' +
                'function decomposes this way — was contentious enough that Lagrange had ' +
                'blocked its publication for fifteen years.',
            kind: 'formula',
            data: {
                view: 'spectrum',
                harmonics: 0,
                lines: [
                    { tex: 'X_k = \\frac{1}{N}\\sum_{n=0}^{N-1} x_n\\, e^{-2\\pi i k n / N}' },
                    ...biggest.map(
                        (c) =>
                            `k = ${c.k >= 0 ? ` ${c.k}` : c.k}   amplitude ${round(
                                c.amplitude
                            )}   phase ${round(c.phase, 3)}`
                    ),
                ],
            },
        },
        {
            id: 'circles',
            title: 'Every coefficient is a circle',
            provenance: 'paper',
            sourceRefs: [{ key: 'FOURIER1822' }, { key: 'BRACEWELL2000', detail: 'Ch. 2' }],
            explanation:
                'A coefficient carries three numbers, and each is a physical property of a ' +
                'rotating arm: amplitude is its length, phase is where it starts, and the ' +
                'frequency is how fast it turns — negative frequencies turn the other way. ' +
                `Chain ${harmonics} of them tip to tail and the free end traces the path. ` +
                'These are Ptolemy’s epicycles, arrived at from the opposite direction.',
            kind: 'values',
            data: {
                view: 'epicycles',
                harmonics,
                time: 0,
                eventBase: 0,
                values: [
                    { label: 'circles', value: harmonics },
                    { label: 'largest radius', value: round(biggest[0].amplitude) },
                ],
            },
            stream: {
                events: Array.from({ length: samples }, (_, i) => ({ t: 'tick', i })),
                tick: 40,
            },
        },
        {
            id: 'truncation',
            title: `${harmonics} circles get within ${round(error, 3)}`,
            provenance: 'theorem',
            sourceRefs: [
                { key: 'BRACEWELL2000', detail: 'Ch. 11' },
                { key: 'GIBBS1899' },
            ],
            explanation:
                `Keeping the ${harmonics} largest coefficients captures ` +
                `${round((keptEnergy / energy) * 100, 1)}% of the signal’s energy — Parseval’s ` +
                'relation says the total is conserved between the samples and the spectrum, so ' +
                'discarding small coefficients discards proportionally little. Root-mean-square ' +
                `error is ${round(error, 4)} against ${round(fullError, 6)} for the full set. ` +
                'Where the path has a corner, watch the reconstruction ring and overshoot — ' +
                'Gibbs’ phenomenon, which no number of terms removes.',
            kind: 'formula',
            data: {
                view: 'epicycles',
                harmonics,
                time: 0,
                lines: [
                    { tex: '\\frac{1}{N}\\sum_n |x_n|^2 = \\sum_k |X_k|^2' },
                    `signal energy   ${round(energy)}`,
                    `kept spectrum   ${round(keptEnergy)}  (${round((keptEnergy / energy) * 100, 1)}%)`,
                    `RMS error       ${round(error, 5)}`,
                ],
            },
        },
        {
            id: 'cost',
            title: 'And then it had to be computable',
            provenance: 'modern',
            sourceRefs: [{ key: 'COOLEY1965' }, { key: 'HEIDEMAN1984' }],
            explanation:
                `The definition above is N² operations — ${naiveOps(samples).toLocaleString()} ` +
                `for these ${samples} samples. Cooley and Tukey's 1965 factorization does it ` +
                `in N log N: ${Math.round(fftOps(samples)).toLocaleString()}, a ` +
                `${(naiveOps(samples) / fftOps(samples)).toFixed(1)}× saving here and a ` +
                'millionfold at signal-processing sizes. Heideman, Johnson and Burrus later ' +
                'found the same algorithm in Gauss’s unpublished notes from 1805 — two years ' +
                'before Fourier presented the theory it computes.',
            caveat: {
                provenance: 'pedagogical',
                text: 'This page runs the O(N²) definition on a few hundred samples, because the definition is what the picture is about. Nothing in production does that: FFTs underpin JPEG, MP3, OFDM radio, MRI reconstruction, and every spectrum analyzer, and all of them use the factorization.',
                sourceRefs: [{ key: 'COOLEY1965' }, { key: 'BRACEWELL2000', detail: 'Ch. 18' }],
            },
            kind: 'formula',
            data: {
                view: 'epicycles',
                harmonics,
                time: 0,
                lines: [
                    `direct definition   N² = ${naiveOps(samples).toLocaleString()} operations`,
                    `Cooley–Tukey        N log₂N = ${Math.round(fftOps(samples)).toLocaleString()}`,
                    `at N = 2²⁰:         ${(naiveOps(2 ** 20) / fftOps(2 ** 20)).toFixed(0)}× faster`,
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { path, points, coefficients, kept, harmonics, samples, error, energy, keptEnergy },
    };
}
