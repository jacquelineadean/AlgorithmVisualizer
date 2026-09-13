import { describe, expect, it } from 'vitest';
import {
    TASKS,
    applyGradient,
    backward,
    batchGradient,
    forward,
    getTask,
    initNetwork,
    loss,
    totalLoss,
    trainNetwork,
} from './model';
import { buildBackpropTrace } from './trace';

// The claim this page makes is that the backward pass computes derivatives.
// Finite differences check it directly — if backprop is wrong anywhere, the
// numbers disagree.

const perturb = (net, path, delta) => {
    const copy = {
        W1: net.W1.map((row) => [...row]),
        b1: [...net.b1],
        W2: [...net.W2],
        b2: net.b2,
    };
    if (path.length === 3) copy[path[0]][path[1]][path[2]] += delta;
    else if (path.length === 2) copy[path[0]][path[1]] += delta;
    else copy[path[0]] += delta;
    return copy;
};

const PATHS = [
    ['W1', 0, 0],
    ['W1', 0, 1],
    ['W1', 1, 0],
    ['W1', 1, 1],
    ['b1', 0],
    ['b1', 1],
    ['W2', 0],
    ['W2', 1],
    ['b2'],
];

const gradientAt = (grad, path) => {
    if (path[0] === 'W1') return grad.gW1[path[1]][path[2]];
    if (path[0] === 'b1') return grad.gb1[path[1]];
    if (path[0] === 'W2') return grad.gW2[path[1]];
    return grad.gb2;
};

describe('backward pass', () => {
    it('matches finite differences on every parameter', () => {
        const net = initNetwork(3);
        const sample = { input: [1, 0], target: 1 };
        const analytic = backward(net, sample.input, sample.target);
        const h = 1e-6;
        for (const path of PATHS) {
            const up = loss(forward(perturb(net, path, h), sample.input).a2, sample.target);
            const down = loss(forward(perturb(net, path, -h), sample.input).a2, sample.target);
            const numeric = (up - down) / (2 * h);
            expect(gradientAt(analytic, path)).toBeCloseTo(numeric, 6);
        }
    });

    it('averages correctly over a batch', () => {
        const net = initNetwork(11);
        const data = getTask('xor').data;
        const batch = batchGradient(net, data);
        const h = 1e-6;
        for (const path of PATHS) {
            const numeric =
                (totalLoss(perturb(net, path, h), data) -
                    totalLoss(perturb(net, path, -h), data)) /
                (2 * h);
            expect(gradientAt(batch, path)).toBeCloseTo(numeric, 6);
        }
    });

    it('takes a step that lowers the loss', () => {
        const net = initNetwork(7);
        const data = getTask('xor').data;
        const before = totalLoss(net, data);
        const after = totalLoss(applyGradient(net, batchGradient(net, data), 0.5), data);
        expect(after).toBeLessThan(before);
    });
});

describe('training', () => {
    it('solves XOR from the default seed, and the loss never rises', () => {
        const net = initNetwork(5);
        const run = trainNetwork({ net, data: getTask('xor').data, rate: 3, epochs: 4000 });
        expect(run.solved).toBe(true);
        expect(run.curve.at(-1).loss).toBeLessThan(0.01);
        for (let i = 1; i < run.curve.length; i++) {
            expect(run.curve[i].loss).toBeLessThanOrEqual(run.curve[i - 1].loss + 1e-6);
        }
    });

    it('learns every task in the preset list', () => {
        for (const task of TASKS) {
            const run = trainNetwork({
                net: initNetwork(5),
                data: task.data,
                rate: 3,
                epochs: 6000,
            });
            expect(run.solved, task.id).toBe(true);
        }
    });
});

describe('buildBackpropTrace', () => {
    it('streams one event per recorded epoch and validates inputs', () => {
        const { steps, artifacts } = buildBackpropTrace({
            taskId: 'xor',
            seed: 5,
            rate: 3,
            epochs: 4000,
            exampleIndex: 1,
        });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toHaveLength(artifacts.run.curve.length - 1);
        expect(() =>
            buildBackpropTrace({ taskId: 'xor', seed: 1, rate: 0, epochs: 1000 })
        ).toThrow(/learning rate/);
        expect(() =>
            buildBackpropTrace({ taskId: 'xor', seed: 1, rate: 1, epochs: 10 })
        ).toThrow(/epochs/);
    });
});
