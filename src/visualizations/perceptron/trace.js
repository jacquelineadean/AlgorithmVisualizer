// Builds the perceptron trace: a weight vector that starts at zero, gets
// pushed by every point it misreads, and — if a line exists — stops.

import { errors, getDataset, makePoints, novikoffBound, train } from './model';

const fixed = (value, digits = 2) => Number(value).toFixed(digits);
const wStr = (w) => `[ ${w.map((value) => fixed(value)).join(', ')} ]`;

export function buildPerceptronTrace({ datasetId, n, seed, rate = 1, epochs = 30 }) {
    if (!Number.isInteger(n) || n < 4 || n > 200) {
        throw new Error('Use between 4 and 200 training points.');
    }
    if (!(rate > 0 && rate <= 4)) {
        throw new Error('The learning rate must be between 0 and 4.');
    }

    const dataset = getDataset(datasetId);
    const points = makePoints({ datasetId, n, seed });
    const run = train({ points, rate, epochs });
    const firstFix = run.events.find((event) => event.t === 'fix');
    const { R, margin, bound } = novikoffBound(points);
    const finalErrors = errors(points, run.w);

    const steps = [
        {
            id: 'the-task',
            title: `${points.length} labelled points, one line wanted`,
            provenance: 'paper',
            sourceRefs: [{ key: 'ROSENBLATT1958', detail: '§I' }],
            explanation:
                `${dataset.label}. ${dataset.note} Rosenblatt's question in 1958 was not how to ` +
                'draw the line but whether a machine could find one *by itself*, from examples ' +
                'and corrections alone — the first learning algorithm with a proof attached.',
            kind: 'values',
            data: {
                stage: 'data',
                eventIndex: 0,
                values: [
                    { label: 'points', value: points.length },
                    { label: 'classes', value: '+1 / −1' },
                ],
            },
        },
        {
            id: 'the-rule',
            title: 'One weighted sum, one threshold',
            provenance: 'paper',
            sourceRefs: [{ key: 'ROSENBLATT1958', detail: '§II' }],
            explanation:
                'The unit computes w₀ + w₁x₁ + w₂x₂ and fires if the result is non-negative. ' +
                'That makes the decision boundary the straight line where the sum is zero, and ' +
                'the weights its normal vector. Training starts from w = [0, 0, 0]: no line at ' +
                'all, everything classified +1.',
            kind: 'formula',
            data: {
                stage: 'weights',
                eventIndex: 0,
                lines: [
                    { tex: '\\hat{y} = \\operatorname{sign}(w_0 + w_1 x_1 + w_2 x_2)' },
                    'boundary: w₀ + w₁x₁ + w₂x₂ = 0',
                    'start: w = [ 0, 0, 0 ]',
                ],
            },
        },
        {
            id: 'mistake',
            title: 'Learn only from mistakes',
            provenance: 'paper',
            sourceRefs: [{ key: 'ROSENBLATT1958', detail: '§IV' }],
            explanation: firstFix
                ? `The first misread point is #${firstFix.index + 1}. The correction adds the ` +
                  `point itself, signed by its true label: w ← w + η·y·x, taking ` +
                  `${wStr(firstFix.before)} to ${wStr(firstFix.w)}. Geometrically the boundary ` +
                  'swings toward that point. Correctly classified examples change nothing — ' +
                  'the rule is driven entirely by error.'
                : 'No mistake was ever made: the starting weights already classify every point.',
            kind: 'formula',
            data: {
                stage: 'training',
                eventIndex: firstFix ? run.events.indexOf(firstFix) + 1 : 0,
                lines: [
                    { tex: 'w \\leftarrow w + \\eta\\, y\\, x \\quad \\text{when } \\hat{y} \\ne y' },
                    firstFix ? `before: ${wStr(firstFix.before)}` : 'no correction needed',
                    firstFix ? `after:  ${wStr(firstFix.w)}` : '',
                ].filter(Boolean),
            },
        },
        {
            id: 'train',
            title: run.converged
                ? `Converged after ${run.mistakes} corrections`
                : `${run.mistakes} corrections and still cycling`,
            provenance: 'paper',
            sourceRefs: [{ key: 'ROSENBLATT1958', detail: '§IV' }, { key: 'BLOCK1962' }],
            explanation: run.converged
                ? `Sweep the examples, correcting on every mistake. After ${run.mistakes} ` +
                  `corrections a whole pass goes by with nothing to fix, and training stops. ` +
                  `Final weights ${wStr(run.w)}; misclassified: ${finalErrors}.`
                : `The rule keeps correcting and never completes a clean pass — after ` +
                  `${epochs} epochs it has made ${run.mistakes} corrections and still gets ` +
                  `${finalErrors} points wrong. Nothing is broken: no separating line exists, ` +
                  'so the loop has no fixed point to reach.',
            kind: 'values',
            data: {
                stage: 'training',
                eventIndex: 0,
                eventBase: 0,
                values: [
                    { label: 'corrections', value: run.mistakes },
                    { label: 'converged', value: run.converged ? 'yes' : 'no' },
                    { label: 'still wrong', value: finalErrors },
                ],
            },
            stream: {
                events: run.events.map((event, i) => ({ t: event.t, i })),
                tick: 30,
                batch: Math.max(1, Math.round(run.events.length / 160)),
            },
        },
        {
            id: 'convergence',
            title: 'Why it must stop (when it can)',
            provenance: 'theorem',
            sourceRefs: [{ key: 'NOVIKOFF1962' }, { key: 'BLOCK1962' }],
            explanation:
                'Novikoff’s bound is the reason the perceptron mattered: if some unit-norm ' +
                'weight vector separates the data with margin γ, and every point lies within ' +
                'radius R of the origin, the rule makes at most (R/γ)² mistakes — whatever the ' +
                'order of presentation, however many points there are. ' +
                (bound
                    ? `Here R = ${fixed(R)} and γ ≥ ${fixed(margin)}, so at most ` +
                      `${bound.toLocaleString()} corrections; it took ${run.mistakes}.`
                    : 'Here no positive margin exists, so the bound says nothing — and neither ' +
                      'does the algorithm.'),
            kind: 'formula',
            data: {
                stage: 'final',
                eventIndex: run.events.length,
                lines: [
                    { tex: '\\text{mistakes} \\;\\le\\; \\left(\\frac{R}{\\gamma}\\right)^{2}' },
                    `R = ${fixed(R)}`,
                    margin > 0 ? `γ ≥ ${fixed(margin)}` : 'γ ≤ 0 — the data is not separable',
                    bound ? `bound = ${bound.toLocaleString()}, actual = ${run.mistakes}` : '',
                ].filter(Boolean),
            },
        },
        {
            id: 'the-limit',
            title: 'What one unit cannot do',
            provenance: 'theorem',
            sourceRefs: [{ key: 'MINSKY1969', detail: 'Ch. 1–2' }],
            explanation:
                'Switch the dataset to XOR: four points, two classes, and no straight line that ' +
                'separates them. Minsky and Papert’s 1969 book worked out exactly which ' +
                'predicates a single-layer perceptron can represent, and XOR is the standard ' +
                'witness that the answer is “not all of them”. The fix is depth — a hidden ' +
                'layer bends the boundary — but training that layer needed backpropagation, ' +
                'which arrived in force seventeen years later.',
            caveat: {
                provenance: 'pedagogical',
                text: 'This page trains in the original online form, one example at a time with a fixed rate and no bias-free normalization. Modern linear classifiers optimize a smooth surrogate loss (logistic, hinge) with regularization, which gives a unique, maximum-margin answer instead of whichever separator the rule happens to stop on.',
                sourceRefs: [{ key: 'MINSKY1969' }, { key: 'BLOCK1962' }],
            },
            kind: 'values',
            data: {
                stage: 'final',
                eventIndex: run.events.length,
                values: [
                    { label: 'representable', value: 'linearly separable sets only' },
                    { label: 'witness', value: 'XOR' },
                    { label: 'fix', value: 'a hidden layer (see backpropagation)' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { points, run, dataset, R, margin, bound, finalErrors },
    };
}
