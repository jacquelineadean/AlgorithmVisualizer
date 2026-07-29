// Builds the central-limit-theorem trace: look at a population that is
// nothing like a bell, average n draws from it over and over, and watch the
// distribution of those averages become one anyway.

import { histogram, sampleMeans, standardError, withinBand } from './model';

const fixed = (value, digits = 2) => Number(value).toFixed(digits);

export function buildCltTrace({ populationId, n, count, seed }) {
    if (!Number.isInteger(n) || n < 1 || n > 100) {
        throw new Error('Sample size n must be a whole number between 1 and 100.');
    }
    if (!Number.isInteger(count) || count < 20 || count > 2000) {
        throw new Error('Draw between 20 and 2,000 samples.');
    }

    const { population, firstSample, means } = sampleMeans({ populationId, n, count, seed });
    const se = standardError(population, n);
    // Centre the sampling-distribution axis on the true mean, four standard
    // errors either side — wide enough to show the tails, tight enough that
    // the shape is visible at n = 30.
    const span = Math.max(4 * se, 0.35);
    const meanRange = [population.mean - span, population.mean + span];
    const observedMean = means.reduce((a, b) => a + b, 0) / means.length;
    const observedSd = Math.sqrt(
        means.reduce((sum, value) => sum + (value - observedMean) ** 2, 0) / means.length
    );
    const coverage = withinBand(means, population.mean, se, 1);

    // The stream is one event per sample mean; the stage folds them into the
    // histogram, so the bell assembles bar by bar.
    const events = means.map((value, i) => ({ t: 'mean', value, i }));

    const steps = [
        {
            id: 'population',
            title: 'A population that is not a bell',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'FELLER1971', detail: 'Ch. VIII' }],
            explanation:
                `${population.label}: ${population.blurb} Its true mean is μ = ${fixed(
                    population.mean
                )} and its standard deviation σ = ${fixed(population.sd)}. Nothing about this ` +
                'shape is normal — that is the point. The theorem does not care what you sample ' +
                'from, only that the variance is finite.',
            kind: 'values',
            data: {
                view: 'population',
                values: [
                    { label: 'population', value: population.label },
                    { label: 'μ', value: fixed(population.mean) },
                    { label: 'σ', value: fixed(population.sd) },
                ],
            },
        },
        {
            id: 'one-sample',
            title: `Take one sample of n = ${n}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'LAPLACE1810' }],
            explanation:
                `Draw ${n} value${n === 1 ? '' : 's'} at random and average them: the first ` +
                `sample lands at x̄ = ${fixed(firstSample.reduce((a, b) => a + b, 0) / n)}. One ` +
                'sample mean is just a number, and it is not μ. Laplace’s question was what ' +
                'happens to that error when you repeat the experiment.',
            kind: 'values',
            data: {
                view: 'one-sample',
                values: [
                    { label: 'n', value: n },
                    {
                        label: 'first draws',
                        value: firstSample
                            .slice(0, 6)
                            .map((v) => fixed(v, 1))
                            .join(', ') + (n > 6 ? ', …' : ''),
                    },
                    { label: 'x̄', value: fixed(firstSample.reduce((a, b) => a + b, 0) / n) },
                ],
            },
        },
        {
            id: 'repeat',
            title: `Repeat it ${count.toLocaleString()} times`,
            provenance: 'paper',
            sourceRefs: [{ key: 'LAPLACE1810' }, { key: 'POLYA1920' }],
            explanation:
                `Every bar is one sample mean dropping into its bin. The population’s shape ` +
                'never changes — the same skew, the same humps, the same flat top — yet the ' +
                'histogram of averages piles up in the middle and thins symmetrically on both ' +
                'sides. Pólya gave this convergence the name it still carries: the central ' +
                'limit theorem.',
            kind: 'values',
            data: {
                view: 'means',
                eventBase: 0,
                values: [
                    { label: 'samples', value: count.toLocaleString() },
                    { label: 'each of size', value: n },
                ],
            },
            stream: { events, tick: 16, batch: Math.max(1, Math.round(count / 120)) },
        },
        {
            id: 'bell',
            title: 'The limit is normal, and only normal',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'LINDEBERG1922' },
                { key: 'LYAPUNOV1901' },
                { key: 'FELLER1971', detail: 'Ch. XVII' },
            ],
            explanation:
                `The curve is N(μ, σ²/n) — not fitted to the bars, computed from the population ` +
                `alone: centre ${fixed(population.mean)}, standard error ${fixed(se, 3)}. The ` +
                `${count.toLocaleString()} observed means average ${fixed(observedMean, 3)} with ` +
                `spread ${fixed(observedSd, 3)}. Lyapunov and then Lindeberg supplied the ` +
                'conditions that turn Laplace’s approximation into a theorem: no single term ' +
                'may dominate the sum.',
            kind: 'formula',
            data: {
                view: 'means',
                eventBase: count,
                caption: 'The statement being drawn:',
                lines: [
                    { tex: '\\bar{X}_n \\;\\xrightarrow{\\;d\\;}\\; \\mathcal{N}\\!\\left(\\mu,\\; \\frac{\\sigma^2}{n}\\right)' },
                    `predicted spread σ/√n = ${fixed(se, 3)}`,
                    `observed spread of the means = ${fixed(observedSd, 3)}`,
                ],
                result: `${fixed(coverage * 100, 1)}% of sample means fell within one standard error of μ (the normal law says 68.3%)`,
            },
        },
        {
            id: 'sqrt-n',
            title: 'Precision costs quadratically',
            provenance: 'theorem',
            sourceRefs: [{ key: 'LAPLACE1810' }, { key: 'FELLER1971', detail: 'Ch. VIII' }],
            explanation:
                `The width of the bell shrinks as σ/√n, not σ/n. Halving your error means ` +
                `quadrupling your sample: at n = ${n} the standard error is ${fixed(se, 3)}; ` +
                `at n = ${n * 4} it would be ${fixed(se / 2, 3)}. Drag the sample-size slider ` +
                'and watch the histogram narrow — every survey, every A/B test, and every ' +
                'Monte Carlo estimate pays this same rate.',
            kind: 'formula',
            data: {
                view: 'means',
                eventBase: count,
                lines: [
                    { tex: '\\mathrm{SE}(\\bar{X}_n) = \\frac{\\sigma}{\\sqrt{n}}' },
                    `σ = ${fixed(population.sd)},  n = ${n}  ⇒  SE = ${fixed(se, 3)}`,
                    `to halve SE, sample ${n * 4} instead of ${n}`,
                ],
            },
        },
        {
            id: 'conditions',
            title: 'When it fails',
            provenance: 'theorem',
            sourceRefs: [{ key: 'LINDEBERG1922' }, { key: 'FELLER1971', detail: 'Ch. XVII' }],
            explanation:
                'Finite variance is not decoration. Average draws from a Cauchy distribution ' +
                'and the sample mean is Cauchy again — no narrowing, no bell, no matter how ' +
                'large n gets, because the tails are too heavy for a variance to exist. ' +
                'Lindeberg’s condition is the precise version: the contribution of any single ' +
                'term to the total variance must vanish as n grows.',
            caveat: {
                provenance: 'pedagogical',
                text: 'This page draws independent, identically distributed samples with a seeded generator. Real data is rarely independent — clustered survey responses and autocorrelated time series both inflate the true standard error well beyond σ/√n.',
                sourceRefs: [{ key: 'FELLER1971', detail: 'Ch. VIII' }],
            },
            kind: 'formula',
            data: {
                view: 'means',
                eventBase: count,
                caption: 'Lindeberg’s condition — no single term may dominate:',
                lines: [
                    {
                        tex: '\\forall \\varepsilon > 0:\\quad \\frac{1}{s_n^2}\\sum_{k=1}^{n} \\mathbb{E}\\big[(X_k-\\mu_k)^2 \\mathbf{1}_{\\{|X_k-\\mu_k| > \\varepsilon s_n\\}}\\big] \\to 0',
                    },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: {
            population,
            n,
            count,
            means,
            firstSample,
            se,
            meanRange,
            observedMean,
            observedSd,
            coverage,
            events,
            popHistogram: histogram(
                // A large reference draw so the population picture is stable.
                sampleMeans({ populationId, n: 1, count: 1500, seed: seed + 7 }).means,
                24,
                population.domain
            ),
        },
    };
}
