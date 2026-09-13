// Pure model for Rosenblatt's perceptron: labelled points, the sign rule,
// and the mistake-driven update — recorded event by event so the stage can
// replay training without learning anything itself.

import { mulberry32 } from '../mathlib/random';

export const DATASETS = [
    {
        id: 'separable',
        label: 'Linearly separable',
        note: 'A line exists, so the rule is guaranteed to find one — in finitely many mistakes.',
        margin: 1.6,
    },
    {
        id: 'narrow',
        label: 'Narrow margin',
        note: 'Still separable, but barely: the mistake bound scales with 1/γ², and it shows.',
        margin: 0.35,
    },
    {
        id: 'overlap',
        label: 'Overlapping classes',
        note: 'No line separates these. The rule never settles — it cycles, correcting forever.',
        margin: -0.9,
    },
    {
        id: 'xor',
        label: 'XOR',
        note: 'Four points, no line. The example Minsky and Papert used to bound what one unit can do.',
        xor: true,
    },
];

export const getDataset = (id) => DATASETS.find((set) => set.id === id) ?? DATASETS[0];

const gaussian = (rand) => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};

// Points carry the bias as a constant 1 in the first slot, so the update
// rule is one expression rather than a special case for b.
export function makePoints({ datasetId, n, seed }) {
    const set = getDataset(datasetId);
    if (set.xor) {
        return [
            { x: 2.5, y: 2.5, label: -1 },
            { x: 7.5, y: 7.5, label: -1 },
            { x: 2.5, y: 7.5, label: 1 },
            { x: 7.5, y: 2.5, label: 1 },
        ];
    }
    const rand = mulberry32(seed);
    const points = [];
    // Planted boundary: the line x + y = 10, offset by ± the margin.
    for (let i = 0; i < n; i++) {
        const label = i % 2 === 0 ? 1 : -1;
        const along = rand() * 8 + 1;
        const off = Math.abs(gaussian(rand)) * 1.5 + set.margin;
        points.push({
            x: along + (label * off) / Math.SQRT2,
            y: 10 - along + (label * off) / Math.SQRT2,
            label,
        });
    }
    return points.map((point) => ({
        ...point,
        x: Math.min(9.6, Math.max(0.4, point.x)),
        y: Math.min(9.6, Math.max(0.4, point.y)),
    }));
}

export const activation = (w, point) => w[0] + w[1] * point.x + w[2] * point.y;
export const predict = (w, point) => (activation(w, point) >= 0 ? 1 : -1);

// One pass in Rosenblatt's original form: walk the examples, and on every
// misclassification move the weight vector toward the offending point.
export function train({ points, rate = 1, epochs = 30, w0 = [0, 0, 0] }) {
    let w = [...w0];
    const events = [];
    const history = [{ w: [...w], mistakes: 0 }];
    let mistakes = 0;
    let converged = false;

    for (let epoch = 0; epoch < epochs; epoch++) {
        let epochMistakes = 0;
        for (const [index, point] of points.entries()) {
            const guess = predict(w, point);
            if (guess === point.label) {
                events.push({ t: 'ok', index, epoch, w: [...w] });
                continue;
            }
            const before = [...w];
            w = [
                w[0] + rate * point.label,
                w[1] + rate * point.label * point.x,
                w[2] + rate * point.label * point.y,
            ];
            mistakes += 1;
            epochMistakes += 1;
            events.push({ t: 'fix', index, epoch, before, w: [...w] });
            history.push({ w: [...w], mistakes });
        }
        if (epochMistakes === 0) {
            converged = true;
            break;
        }
    }

    return { w, events, history, mistakes, converged };
}

export const errors = (points, w) =>
    points.filter((point) => predict(w, point) !== point.label).length;

// Novikoff's bound: with data of radius R and a separator of margin γ, the
// rule makes at most (R/γ)² mistakes — independent of how many points there
// are, or what order they arrive in.
export function novikoffBound(points) {
    const R = Math.max(...points.map((point) => Math.hypot(1, point.x, point.y)));
    // Largest margin achievable by the planted separator x + y = 10, scaled
    // to a unit weight vector — a lower bound on the true optimum γ.
    const w = [-10, 1, 1];
    const norm = Math.hypot(...w);
    const margin = Math.min(...points.map((point) => (point.label * activation(w, point)) / norm));
    return { R, margin, bound: margin > 0 ? Math.ceil((R / margin) ** 2) : null };
}
