// Pure model for backpropagation on a 2–2–1 network: a forward pass, a
// reverse pass that reuses everything the forward pass computed, and a
// training loop. Small enough that every number on the page is checkable by
// hand — and checked, in model.test.js, against finite differences.

import { mulberry32 } from '../mathlib/random';

export const TASKS = [
    {
        id: 'xor',
        label: 'XOR',
        note: 'The function one perceptron cannot represent. Two hidden units are enough.',
        data: [
            { input: [0, 0], target: 0 },
            { input: [0, 1], target: 1 },
            { input: [1, 0], target: 1 },
            { input: [1, 1], target: 0 },
        ],
    },
    {
        id: 'and',
        label: 'AND',
        note: 'Linearly separable — the hidden layer is not needed, and training is quick.',
        data: [
            { input: [0, 0], target: 0 },
            { input: [0, 1], target: 0 },
            { input: [1, 0], target: 0 },
            { input: [1, 1], target: 1 },
        ],
    },
    {
        id: 'xnor',
        label: 'XNOR',
        note: 'XOR’s complement: same difficulty, mirrored solution.',
        data: [
            { input: [0, 0], target: 1 },
            { input: [0, 1], target: 0 },
            { input: [1, 0], target: 0 },
            { input: [1, 1], target: 1 },
        ],
    },
];

export const getTask = (id) => TASKS.find((task) => task.id === id) ?? TASKS[0];

export const sigmoid = (z) => 1 / (1 + Math.exp(-z));
export const dSigmoid = (a) => a * (1 - a); // in terms of the activation
export const dTanh = (a) => 1 - a * a;

// Symmetry has to be broken or both hidden units learn the same feature.
export function initNetwork(seed) {
    const rand = mulberry32(seed);
    const draw = () => (rand() - 0.5) * 2.4;
    return {
        W1: [
            [draw(), draw()],
            [draw(), draw()],
        ], // W1[h][i]
        b1: [draw(), draw()],
        W2: [draw(), draw()], // W2[h]
        b2: draw(),
    };
}

export function forward(net, input) {
    const z1 = net.b1.map((bias, h) => bias + net.W1[h][0] * input[0] + net.W1[h][1] * input[1]);
    const a1 = z1.map(Math.tanh);
    const z2 = net.b2 + net.W2[0] * a1[0] + net.W2[1] * a1[1];
    const a2 = sigmoid(z2);
    return { z1, a1, z2, a2 };
}

// Squared error on the output, halved so its derivative is (a2 − y).
export const loss = (a2, target) => 0.5 * (a2 - target) ** 2;

export const totalLoss = (net, data) =>
    data.reduce((sum, sample) => sum + loss(forward(net, sample.input).a2, sample.target), 0) /
    data.length;

// The reverse pass. Every quantity here is either an activation the forward
// pass already stored or a delta from the layer above — that reuse is what
// makes the gradient cost the same order as the function evaluation.
export function backward(net, input, target) {
    const f = forward(net, input);
    const delta2 = (f.a2 - target) * dSigmoid(f.a2); // ∂L/∂z₂
    const gW2 = [delta2 * f.a1[0], delta2 * f.a1[1]];
    const gb2 = delta2;
    const delta1 = [0, 1].map((h) => delta2 * net.W2[h] * dTanh(f.a1[h])); // ∂L/∂z₁ₕ
    const gW1 = [
        [delta1[0] * input[0], delta1[0] * input[1]],
        [delta1[1] * input[0], delta1[1] * input[1]],
    ];
    const gb1 = [delta1[0], delta1[1]];
    return { forward: f, delta2, delta1, gW1, gb1, gW2, gb2, loss: loss(f.a2, target) };
}

const zeroGrad = () => ({
    gW1: [
        [0, 0],
        [0, 0],
    ],
    gb1: [0, 0],
    gW2: [0, 0],
    gb2: 0,
});

// Full-batch gradient: average the per-example gradients.
export function batchGradient(net, data) {
    const acc = zeroGrad();
    for (const sample of data) {
        const grad = backward(net, sample.input, sample.target);
        for (let h = 0; h < 2; h++) {
            acc.gW1[h][0] += grad.gW1[h][0] / data.length;
            acc.gW1[h][1] += grad.gW1[h][1] / data.length;
            acc.gb1[h] += grad.gb1[h] / data.length;
            acc.gW2[h] += grad.gW2[h] / data.length;
        }
        acc.gb2 += grad.gb2 / data.length;
    }
    return acc;
}

export const applyGradient = (net, grad, rate) => ({
    W1: net.W1.map((row, h) => row.map((w, i) => w - rate * grad.gW1[h][i])),
    b1: net.b1.map((b, h) => b - rate * grad.gb1[h]),
    W2: net.W2.map((w, h) => w - rate * grad.gW2[h]),
    b2: net.b2 - rate * grad.gb2,
});

// Training records the loss curve and a few network snapshots so the stage
// can show the weights at any point without re-running anything.
export function trainNetwork({ net, data, rate, epochs, snapshots = 40 }) {
    let current = net;
    const curve = [{ epoch: 0, loss: totalLoss(current, data) }];
    const frames = [current];
    const every = Math.max(1, Math.floor(epochs / snapshots));
    for (let epoch = 1; epoch <= epochs; epoch++) {
        current = applyGradient(current, batchGradient(current, data), rate);
        if (epoch % every === 0 || epoch === epochs) {
            curve.push({ epoch, loss: totalLoss(current, data) });
            frames.push(current);
        }
    }
    const predictions = data.map((sample) => forward(current, sample.input).a2);
    return {
        net: current,
        curve,
        frames,
        predictions,
        solved: data.every(
            (sample, i) => Math.round(predictions[i]) === sample.target
        ),
    };
}
