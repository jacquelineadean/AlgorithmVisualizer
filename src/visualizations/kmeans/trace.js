// Builds the k-means trace: seed k centres, assign, average, repeat — and
// be honest about what the loop does and does not guarantee.

import { getDataset, kmeansRun, makePoints } from './model';

const fixed = (value, digits = 1) => Number(value).toFixed(digits);

export function buildKmeansTrace({ datasetId, n, k, seed, init }) {
    if (!Number.isInteger(k) || k < 2 || k > 6) {
        throw new Error('Choose k between 2 and 6.');
    }
    if (!Number.isInteger(n) || n < k || n > 400) {
        throw new Error(`Use between ${k} and 400 points.`);
    }

    const dataset = getDataset(datasetId);
    const points = makePoints({ datasetId, n, seed });
    const run = kmeansRun({ points, k, seed, init });
    const rounds = run.iterations.length - 1;
    const first = run.iterations[0];
    const second = run.iterations[1] ?? first;
    const final = run.final;

    const steps = [
        {
            id: 'points',
            title: `${n} points, ${k} centres wanted`,
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'MACQUEEN1967', detail: '§1' }],
            explanation:
                `${dataset.label}. ${dataset.note} The task: split the points into k groups so ` +
                'that each point is near its group’s centre. MacQueen’s 1967 paper gave the ' +
                'procedure the name it still has.',
            kind: 'values',
            data: {
                iteration: 0,
                showAssignment: false,
                values: [
                    { label: 'points', value: n },
                    { label: 'k', value: k },
                    { label: 'objective', value: 'within-cluster sum of squares' },
                ],
            },
        },
        {
            id: 'seed',
            title:
                init === 'plusplus' ? 'Seed the centres with k-means++' : 'Seed the centres at random',
            provenance: init === 'plusplus' ? 'modern' : 'paper',
            sourceRefs:
                init === 'plusplus'
                    ? [{ key: 'ARTHUR2007' }]
                    : [{ key: 'LLOYD1982' }, { key: 'MACQUEEN1967' }],
            explanation:
                init === 'plusplus'
                    ? 'k-means++ picks the first centre uniformly, then draws each next centre ' +
                      'with probability proportional to its squared distance from the nearest ' +
                      'centre already chosen — spreading the seeds out. Arthur and ' +
                      'Vassilvitskii proved this alone brings the expected cost within ' +
                      'O(log k) of optimal, before a single iteration runs.'
                    : 'Forgy’s rule: take k of the observations themselves as the starting ' +
                      'centres. Cheap, and occasionally terrible — two seeds inside the same ' +
                      'blob will split it and merge two others. Switch the initializer and ' +
                      'compare the final inertia.',
            kind: 'values',
            data: {
                iteration: 0,
                showAssignment: false,
                showCentroids: true,
                values: run.start.map((centroid, index) => ({
                    label: `centre ${index + 1}`,
                    value: `(${fixed(centroid.x)}, ${fixed(centroid.y)})`,
                })),
            },
        },
        {
            id: 'assign',
            title: 'Assign: every point to its nearest centre',
            provenance: 'paper',
            sourceRefs: [{ key: 'LLOYD1982', detail: '§II' }],
            explanation:
                'With the centres fixed, the best assignment is obvious — take the nearest one. ' +
                'The boundaries this draws are the perpendicular bisectors between centres: a ' +
                'Voronoi diagram. This half-step can only lower the objective, because every ' +
                `point moves to a closer centre or stays put. Inertia: ${fixed(first.inertia)}.`,
            kind: 'values',
            data: {
                iteration: 0,
                showAssignment: true,
                showCentroids: true,
                values: [
                    { label: 'inertia', value: fixed(first.inertia) },
                    { label: 'rule', value: 'argmin ‖x − μⱼ‖²' },
                ],
            },
        },
        {
            id: 'update',
            title: 'Update: every centre to its cluster’s mean',
            provenance: 'paper',
            sourceRefs: [{ key: 'LLOYD1982', detail: '§II' }],
            explanation:
                'Now fix the assignment and move each centre. The point minimizing the sum of ' +
                'squared distances to a set is exactly its mean — that is the whole reason the ' +
                `update is an average. Inertia falls to ${fixed(second.inertia)}. Two ` +
                'half-steps, each provably non-increasing, is the entire algorithm.',
            kind: 'formula',
            data: {
                iteration: 1,
                showAssignment: true,
                showCentroids: true,
                lines: [
                    { tex: '\\mu_j \\leftarrow \\frac{1}{|C_j|}\\sum_{x \\in C_j} x' },
                    `inertia ${fixed(first.inertia)} → ${fixed(second.inertia)}`,
                ],
            },
        },
        {
            id: 'iterate',
            title: `Repeat until nothing moves (${rounds} rounds)`,
            provenance: 'paper',
            sourceRefs: [{ key: 'LLOYD1982', detail: '§II' }, { key: 'MACQUEEN1967' }],
            explanation:
                'Assign, average, assign, average. Because the objective strictly decreases ' +
                'whenever anything changes, and there are only finitely many assignments, the ' +
                `loop must stop — here after ${rounds} round${rounds === 1 ? '' : 's'}, with ` +
                `inertia ${fixed(final.inertia)}. Termination is guaranteed; optimality is not.`,
            kind: 'values',
            data: {
                iteration: 1,
                showAssignment: true,
                showCentroids: true,
                eventBase: 0,
                values: [
                    { label: 'rounds', value: rounds },
                    { label: 'final inertia', value: fixed(final.inertia) },
                ],
            },
            stream: {
                events: run.iterations.slice(2).map((_, i) => ({ t: 'iter', k: i + 2 })),
                tick: 420,
            },
        },
        {
            id: 'local-minimum',
            title: 'A local minimum, not the minimum',
            provenance: 'theorem',
            sourceRefs: [{ key: 'ALOISE2009' }, { key: 'ARTHUR2007' }],
            explanation:
                'The loop stops when no point wants to move — a local minimum of the objective, ' +
                'which is generally not the global one. Finding the true optimum is NP-hard ' +
                'even in the plane (Aloise et al., 2009), so practice runs the loop several ' +
                'times from different seeds and keeps the lowest inertia. Reseed this page and ' +
                'watch the final number change.',
            caveat: {
                provenance: 'pedagogical',
                text: 'k is an input here, as it is in the algorithm — nothing in k-means discovers how many clusters exist. On the uniform preset it will still return k tidy groups. Choosing k is a separate question (elbow plots, silhouettes, or a model that can say “none”).',
                sourceRefs: [{ key: 'MACQUEEN1967' }, { key: 'ALOISE2009' }],
            },
            kind: 'values',
            data: {
                iteration: run.iterations.length - 1,
                showAssignment: true,
                showCentroids: true,
                values: [
                    { label: 'converged', value: run.converged ? 'yes' : 'hit the iteration cap' },
                    { label: 'inertia', value: fixed(final.inertia) },
                    { label: 'global optimum?', value: 'NP-hard to know' },
                ],
            },
        },
    ];

    return { steps, artifacts: { points, run, k, dataset, init } };
}
