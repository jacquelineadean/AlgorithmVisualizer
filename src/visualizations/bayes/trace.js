// Builds the Bayes' rule trace: the update worked as natural frequencies
// over a population, each step cited. The UI renders the trace; it never
// computes probabilities itself.

import { asPercent, populationCounts, posteriorExact } from './math';

export const POPULATION = 1000;

// inputs: { prior, sensitivity, falsePositiveRate } as fractions in [0, 1].
export function buildBayesTrace({ prior, sensitivity, falsePositiveRate }) {
    if (!(prior > 0 && prior <= 0.5)) {
        throw new Error('Prevalence must be between 0% and 50%.');
    }
    if (!(sensitivity >= 0.5 && sensitivity <= 1)) {
        throw new Error('Sensitivity must be between 50% and 100%.');
    }
    if (!(falsePositiveRate >= 0 && falsePositiveRate <= 0.5)) {
        throw new Error('The false-positive rate must be between 0% and 50%.');
    }

    const counts = populationCounts({
        prior,
        sensitivity,
        falsePositiveRate,
        population: POPULATION,
    });
    const exact = posteriorExact(prior, sensitivity, falsePositiveRate);
    const {
        sick,
        healthy,
        truePositives,
        falseNegatives,
        falsePositives,
        trueNegatives,
        positives,
        posteriorNatural,
    } = counts;

    const steps = [
        {
            id: 'set-prior',
            title: 'Start from the base rate',
            provenance: 'paper',
            sourceRefs: [{ key: 'BAYES1763', detail: 'Prop. 3–5' }],
            explanation:
                `Before anyone is tested, the condition has a base rate — the prior — of ` +
                `${asPercent(prior)}. Bayes' essay poses exactly this problem: what an event's ` +
                'unknown probability should be believed to be, before and after evidence.',
            caveat: {
                provenance: 'modern',
                text: 'In practice priors come from measured base rates (epidemiology, logs, historical data) — the step most famously skipped by intuition.',
                sourceRefs: [{ key: 'EDDY1982' }],
            },
            kind: 'stat',
            data: {
                values: [{ label: 'prior P(D)', value: asPercent(prior) }],
            },
        },
        {
            id: 'natural-frequencies',
            title: 'Make it a population',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'GH1995' }],
            explanation:
                `Instead of juggling probabilities, count people: of ${POPULATION.toLocaleString()} ` +
                `individuals, about ${sick} have the condition and ${healthy} do not. Gigerenzer and ` +
                'Hoffrage showed that this "natural frequency" format is how the same math becomes ' +
                'intuitive — the visualization leans on their result. Counts are rounded to whole people.',
            kind: 'stat',
            data: {
                values: [
                    { label: 'have it', value: sick },
                    { label: 'do not', value: healthy },
                ],
            },
        },
        {
            id: 'test-sick',
            title: 'Test the sick group',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'KOLMOGOROV1933', detail: 'product rule' },
                { key: 'GH1995' },
            ],
            explanation:
                `The test catches a true case with probability ${asPercent(sensitivity)} (its ` +
                `sensitivity). Of the ${sick} people who have the condition, about ` +
                `${truePositives} test positive and ${falseNegatives} are missed. This is the ` +
                'product rule: P(D and +) = P(D) · P(+ | D).',
            kind: 'stat',
            data: {
                values: [
                    { label: 'true positives', value: truePositives },
                    { label: 'missed (false negatives)', value: falseNegatives },
                ],
            },
        },
        {
            id: 'test-healthy',
            title: 'Test the healthy group',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'KOLMOGOROV1933', detail: 'product rule' },
                { key: 'GH1995' },
            ],
            explanation:
                `The test also fires falsely on ${asPercent(falsePositiveRate)} of healthy people. ` +
                `Of the ${healthy} without the condition, about ${falsePositives} still test ` +
                `positive — often more people than the true positives, because the healthy group ` +
                'is so much larger.',
            kind: 'stat',
            data: {
                values: [
                    { label: 'false positives', value: falsePositives },
                    { label: 'true negatives', value: trueNegatives },
                ],
            },
        },
        {
            id: 'condition-on-positive',
            title: 'Keep only the positives',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'BAYES1763', detail: 'Prop. 5' },
                { key: 'KOLMOGOROV1933', detail: 'conditional probability' },
            ],
            explanation:
                `A positive result arrives. Everyone who tested negative leaves the picture — ` +
                `conditioning restricts the world to the ${positives} people with a positive test: ` +
                `${truePositives} sick and ${falsePositives} healthy.`,
            kind: 'stat',
            data: {
                values: [
                    { label: 'positive tests', value: positives },
                    { label: '…actually sick', value: truePositives },
                    { label: '…false alarms', value: falsePositives },
                ],
            },
        },
        {
            id: 'posterior',
            title: 'The posterior: what a positive means',
            provenance: 'paper',
            sourceRefs: [
                { key: 'BAYES1763' },
                { key: 'LAPLACE1774', detail: 'general form' },
            ],
            explanation:
                `Among positives, the share who are actually sick is ${truePositives} out of ` +
                `${positives} — ${asPercent(posteriorNatural)}. That is Bayes' rule, in the general ` +
                'form Laplace gave it: the prior reweighted by how well the evidence discriminates.',
            kind: 'formula',
            data: {
                lines: [
                    'P(D | +) = P(+ | D)·P(D) / [ P(+ | D)·P(D) + P(+ | ¬D)·P(¬D) ]',
                    `= (${sensitivity.toFixed(3)} × ${prior.toFixed(3)}) / (${sensitivity.toFixed(3)} × ${prior.toFixed(3)} + ${falsePositiveRate.toFixed(3)} × ${(1 - prior).toFixed(3)})`,
                    `= ${asPercent(exact, 2)}   (exact)`,
                    `≈ ${truePositives} / (${truePositives} + ${falsePositives}) = ${truePositives}/${positives} = ${asPercent(posteriorNatural)}   (whole people)`,
                ],
            },
        },
        {
            id: 'base-rates',
            title: 'Why the answer surprises',
            provenance: 'modern',
            sourceRefs: [{ key: 'EDDY1982' }, { key: 'GH1995' }],
            explanation:
                `Most people — including, in Eddy's study, most physicians — expect a number near ` +
                `the test's accuracy and land far from ${asPercent(posteriorNatural)}. The error has ` +
                'a name: base-rate neglect. When a condition is rare, even a good test spends most ' +
                'of its positives on false alarms. Drag the prevalence slider and watch the ' +
                'posterior chase the base rate.',
            kind: 'stat',
            data: {
                values: [
                    { label: 'test sensitivity', value: asPercent(sensitivity) },
                    { label: 'P(sick | positive)', value: asPercent(posteriorNatural) },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: {
            prior,
            sensitivity,
            falsePositiveRate,
            population: POPULATION,
            exact,
            ...counts,
        },
    };
}
