// Builds the backpropagation trace: one forward pass with real numbers, one
// reverse pass that reuses them, the weight update, and then the same loop
// run a few thousand times until XOR is solved.

import {
    backward,
    batchGradient,
    forward,
    getTask,
    initNetwork,
    totalLoss,
    trainNetwork,
} from './model';

const fixed = (value, digits = 3) => Number(value).toFixed(digits);

export function buildBackpropTrace({ taskId, seed, rate, epochs, exampleIndex = 1 }) {
    if (!(rate > 0 && rate <= 10)) {
        throw new Error('The learning rate must be between 0 and 10.');
    }
    if (!Number.isInteger(epochs) || epochs < 100 || epochs > 20000) {
        throw new Error('Train for between 100 and 20,000 epochs.');
    }

    const task = getTask(taskId);
    const net = initNetwork(seed);
    const sample = task.data[Math.min(exampleIndex, task.data.length - 1)];
    const pass = backward(net, sample.input, sample.target);
    const grad = batchGradient(net, task.data);
    const run = trainNetwork({ net, data: task.data, rate, epochs });
    const startLoss = totalLoss(net, task.data);
    const endLoss = run.curve.at(-1).loss;

    const steps = [
        {
            id: 'the-network',
            title: 'Two inputs, two hidden units, one output',
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }],
            explanation:
                `Task: ${task.label}. ${task.note} Every edge carries a weight, every unit a ` +
                'bias, and the whole network is one composed function of nine numbers. ' +
                'Learning means nudging those nine in the direction that lowers the error — ' +
                'which requires knowing the derivative of the error with respect to each of ' +
                'them.',
            kind: 'values',
            data: {
                view: 'network',
                phase: 'idle',
                values: [
                    { label: 'parameters', value: 9 },
                    { label: 'hidden activation', value: 'tanh' },
                    { label: 'output activation', value: 'sigmoid' },
                    { label: 'initial loss', value: fixed(startLoss, 4) },
                ],
            },
        },
        {
            id: 'forward',
            title: `Forward pass on (${sample.input.join(', ')})`,
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }],
            explanation:
                'Each hidden unit takes a weighted sum and squashes it; the output unit does ' +
                `the same over the hidden activations. For this example the network answers ` +
                `${fixed(pass.forward.a2)} where the target is ${sample.target}. Every ` +
                'intermediate value is kept — the backward pass is about to need all of them.',
            kind: 'formula',
            data: {
                view: 'network',
                phase: 'forward',
                lines: [
                    { tex: 'a^{(1)} = \\tanh(W^{(1)}x + b^{(1)}), \\qquad \\hat{y} = \\sigma(W^{(2)}a^{(1)} + b^{(2)})' },
                    `z₁ = [ ${pass.forward.z1.map((v) => fixed(v)).join(', ')} ]  →  a₁ = [ ${pass.forward.a1
                        .map((v) => fixed(v))
                        .join(', ')} ]`,
                    `z₂ = ${fixed(pass.forward.z2)}  →  ŷ = ${fixed(pass.forward.a2)}`,
                ],
            },
        },
        {
            id: 'loss',
            title: 'How wrong, in one number',
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }],
            explanation:
                `Squared error, halved so its derivative is exactly (ŷ − y): here ` +
                `${fixed(pass.loss, 4)}. Halving is cosmetic; what matters is that the error ` +
                'is a differentiable function of every weight, which is what lets calculus ' +
                'replace search.',
            kind: 'formula',
            data: {
                view: 'network',
                phase: 'forward',
                lines: [
                    { tex: 'E = \\tfrac{1}{2}(\\hat{y} - y)^2' },
                    `E = ½(${fixed(pass.forward.a2)} − ${sample.target})² = ${fixed(pass.loss, 4)}`,
                ],
            },
        },
        {
            id: 'output-delta',
            title: 'Start at the end: δ at the output',
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }, { key: 'GOODFELLOW2016', detail: '§6.5' }],
            explanation:
                'The chain rule, applied once: how much the error changes per unit change in ' +
                'the output unit’s pre-activation. It is the error times the slope of the ' +
                `sigmoid at that point — ${fixed(pass.forward.a2 - sample.target)} × ` +
                `${fixed(pass.forward.a2 * (1 - pass.forward.a2))} = ${fixed(pass.delta2, 4)}. ` +
                'Multiply δ₂ by each incoming activation and you have the gradients for the ' +
                'output weights, for free.',
            kind: 'formula',
            data: {
                view: 'network',
                phase: 'backward',
                lines: [
                    { tex: '\\delta^{(2)} = \\frac{\\partial E}{\\partial z^{(2)}} = (\\hat{y} - y)\\,\\sigma\'(z^{(2)})' },
                    `δ₂ = ${fixed(pass.delta2, 4)}`,
                    `∂E/∂W₂ = δ₂·a₁ = [ ${pass.gW2.map((v) => fixed(v, 4)).join(', ')} ]`,
                ],
            },
        },
        {
            id: 'chain-back',
            title: 'Push the blame backward',
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }, { key: 'LINNAINMAA1976' }],
            explanation:
                'A hidden unit is responsible for the error in proportion to the weight ' +
                'connecting it forward, scaled by its own slope. That is the entire ' +
                'recursion — one matrix multiply and one elementwise product per layer, and ' +
                'it works for a hundred layers exactly as it works for this one. This is ' +
                'reverse-mode automatic differentiation, which Linnainmaa published in 1970 ' +
                'for rounding-error analysis, sixteen years before it was applied to networks.',
            kind: 'formula',
            data: {
                view: 'network',
                phase: 'backward',
                lines: [
                    { tex: '\\delta^{(1)}_h = \\delta^{(2)}\\, W^{(2)}_h \\;\\cdot\\; \\big(1 - a^{(1)2}_h\\big)' },
                    `δ₁ = [ ${pass.delta1.map((v) => fixed(v, 4)).join(', ')} ]`,
                    `∂E/∂W₁ = [ ${pass.gW1
                        .map((row) => `[${row.map((v) => fixed(v, 4)).join(', ')}]`)
                        .join(', ')} ]`,
                ],
            },
        },
        {
            id: 'update',
            title: 'Step downhill',
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }, { key: 'LECUN1998', detail: '§1–4' }],
            explanation:
                `Averaging the per-example gradients over all ${task.data.length} examples ` +
                `gives the batch gradient; subtract η = ${rate} times it from every weight. ` +
                'One forward pass and one backward pass produce every derivative the update ' +
                'needs — the cost of the gradient is a small constant times the cost of the ' +
                'function, which is the property the whole field runs on.',
            kind: 'formula',
            data: {
                view: 'network',
                phase: 'backward',
                lines: [
                    { tex: 'w \\leftarrow w - \\eta \\frac{\\partial E}{\\partial w}' },
                    `batch ∂E/∂W₂ = [ ${grad.gW2.map((v) => fixed(v, 4)).join(', ')} ]`,
                    `batch ∂E/∂b₂ = ${fixed(grad.gb2, 4)}`,
                ],
            },
        },
        {
            id: 'train',
            title: `Repeat ${epochs.toLocaleString()} times`,
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }, { key: 'LECUN1998' }],
            explanation: run.solved
                ? `Loss falls from ${fixed(startLoss, 4)} to ${fixed(endLoss, 4)} and the ` +
                  'network answers every case correctly. The plateau at the start is the ' +
                  'famous part: the two hidden units drift for a long while before they ' +
                  'discover complementary features, then the error collapses.'
                : `Loss went from ${fixed(startLoss, 4)} to ${fixed(endLoss, 4)}, which is not ` +
                  'enough — this seed and rate land in a flat region. Reseed or raise the ' +
                  'learning rate: gradient descent finds a local minimum, and for XOR some of ' +
                  'them are useless.',
            kind: 'values',
            data: {
                view: 'curve',
                phase: 'idle',
                frame: 0,
                eventBase: 0,
                values: [
                    { label: 'epochs', value: epochs.toLocaleString() },
                    { label: 'loss', value: `${fixed(startLoss, 4)} → ${fixed(endLoss, 4)}` },
                    { label: 'solved', value: run.solved ? 'yes' : 'no' },
                ],
            },
            stream: {
                events: run.curve.slice(1).map((point, i) => ({ t: 'epoch', i: i + 1 })),
                tick: 60,
            },
        },
        {
            id: 'what-it-learned',
            title: 'What the hidden layer found',
            provenance: 'paper',
            sourceRefs: [{ key: 'RHW1986' }, { key: 'GOODFELLOW2016', detail: '§6.5' }],
            explanation:
                'The trained answers are ' +
                task.data
                    .map(
                        (item, i) =>
                            `(${item.input.join(',')})→${fixed(run.predictions[i], 2)}`
                    )
                    .join(', ') +
                '. The point Rumelhart, Hinton and Williams were making in 1986 was not the ' +
                'arithmetic — it was that the hidden units are not designed. They acquire ' +
                'useful internal representations as a side effect of descending the error, ' +
                'which is why the paper is titled “learning representations”.',
            caveat: {
                provenance: 'pedagogical',
                text: 'Nine parameters, four examples, full-batch descent, plain squared error. Production training swaps in mini-batches, cross-entropy, adaptive optimizers, normalization layers, and initialization schemes designed to keep gradients from vanishing across dozens of layers — all refinements of this loop, none of them changes to it.',
                sourceRefs: [{ key: 'LECUN1998' }, { key: 'GOODFELLOW2016', detail: '§8' }],
            },
            kind: 'values',
            data: {
                view: 'network',
                phase: 'trained',
                frame: run.frames.length - 1,
                values: task.data.map((item, i) => ({
                    label: `(${item.input.join(', ')}) → ${item.target}`,
                    value: fixed(run.predictions[i], 3),
                })),
            },
        },
    ];

    return { steps, artifacts: { task, net, sample, pass, grad, run, rate, epochs } };
}
