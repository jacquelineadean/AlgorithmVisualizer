// Builds the Markov-chain trace: states, a transition matrix, and the
// distribution that walks it until (sometimes) it stops moving.

import {
    getChain,
    isAperiodic,
    isIrreducible,
    isStochastic,
    l1,
    period,
    pointMass,
    powerIteration,
    stationary,
    uniform,
} from './model';

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const vec = (distribution, states) =>
    distribution.map((value, i) => `${states[i]} ${pct(value)}`).join('   ');

export function buildMarkovTrace({ chainId, startIndex, iterations = 40 }) {
    const chain = getChain(chainId);
    const n = chain.states.length;
    if (!isStochastic(chain.matrix)) {
        throw new Error('Every row of a transition matrix must be non-negative and sum to 1.');
    }
    if (!Number.isInteger(startIndex) || startIndex < -1 || startIndex >= n) {
        throw new Error('Pick a starting state, or the uniform distribution.');
    }

    const start = startIndex < 0 ? uniform(n) : pointMass(n, startIndex);
    const startLabel = startIndex < 0 ? 'uniform' : `all mass on ${chain.states[startIndex]}`;
    const path = powerIteration(chain.matrix, start, iterations);
    const limit = stationary(chain.matrix, start);
    const irreducible = isIrreducible(chain.matrix);
    const aperiodic = isAperiodic(chain.matrix);
    const ergodic = irreducible && aperiodic;
    // Where the walk effectively settles — the first iteration whose change
    // is under half a percent in L1.
    const settledAt = path.findIndex(
        (distribution, i) => i > 0 && l1(distribution, path[i - 1]) < 0.005
    );

    const steps = [
        {
            id: 'states',
            title: 'States, and only the current one matters',
            provenance: 'paper',
            sourceRefs: [{ key: 'BASHARIN2004' }, { key: 'MARKOV1913' }],
            explanation:
                `${chain.label}: ${n} states and the arrows between them. The Markov property ` +
                'is the whole model — the next state depends on the current one and on nothing ' +
                'before it. Markov introduced chains in 1906 to prove the law of large numbers ' +
                'survives dependence, then demonstrated it by hand-counting 20,000 vowels and ' +
                'consonants in Eugene Onegin.',
            kind: 'values',
            data: {
                view: 'graph',
                iteration: 0,
                values: [
                    { label: 'states', value: chain.states.join(', ') },
                    { label: 'start', value: startLabel },
                ],
            },
        },
        {
            id: 'matrix',
            title: 'The transition matrix',
            provenance: 'paper',
            sourceRefs: [{ key: 'NORRIS1997', detail: '§1.1' }],
            explanation:
                'Row i holds the probabilities of leaving state i, so every row sums to 1 — a ' +
                'stochastic matrix. Reading a row is a forecast; reading a column asks where ' +
                'arrivals come from. Nothing else about the process is stored.',
            kind: 'values',
            data: {
                view: 'matrix',
                iteration: 0,
                values: chain.states.map((label, i) => ({
                    label: `from ${label}`,
                    value: chain.matrix[i].map((value) => value.toFixed(2)).join(' · '),
                })),
            },
        },
        {
            id: 'one-step',
            title: 'One step: π₁ = π₀P',
            provenance: 'theorem',
            sourceRefs: [{ key: 'NORRIS1997', detail: '§1.1' }],
            explanation:
                `Push the starting distribution (${startLabel}) through the matrix once. Each ` +
                'destination collects probability from every source that can reach it, weighted ' +
                `by the arrow. After one step: ${vec(path[1], chain.states)}.`,
            kind: 'formula',
            data: {
                view: 'graph',
                iteration: 1,
                caption: 'A distribution is a row vector; a step is a multiplication:',
                lines: [
                    { tex: '\\pi_{k+1}(j) = \\sum_i \\pi_k(i)\\, P_{ij}' },
                    `π₀ = [ ${start.map((v) => v.toFixed(3)).join(', ')} ]`,
                    `π₁ = [ ${path[1].map((v) => v.toFixed(3)).join(', ')} ]`,
                ],
            },
        },
        {
            id: 'iterate',
            title: `Iterate ${iterations} steps`,
            provenance: 'theorem',
            sourceRefs: [{ key: 'NORRIS1997', detail: '§1.7' }, { key: 'LEVIN2017', detail: 'Ch. 4' }],
            explanation: ergodic
                ? `Each circle grows or shrinks with its probability. The memory of where the ` +
                  `walk started washes out — by iteration ${
                      settledAt > 0 ? settledAt : iterations
                  } the distribution is moving by less than half a percent.`
                : 'Watch what does not happen: this chain never settles into a single answer. ' +
                  'The structural conditions in the last step say exactly why.',
            kind: 'values',
            data: {
                view: 'graph',
                iteration: 1,
                eventBase: 0,
                values: [
                    { label: 'iterations', value: iterations },
                    { label: 'settles by', value: settledAt > 0 ? settledAt : 'never' },
                ],
            },
            stream: {
                events: path.slice(2).map((distribution, i) => ({ t: 'iter', k: i + 2 })),
                tick: 120,
            },
        },
        {
            id: 'stationary',
            title: limit.converged ? 'The fixed point' : 'No fixed point is reached',
            provenance: 'theorem',
            sourceRefs: [{ key: 'PERRON1907' }, { key: 'NORRIS1997', detail: '§1.7' }],
            explanation: limit.converged
                ? `The walk lands on π = [ ${limit.distribution
                      .map((v) => v.toFixed(4))
                      .join(', ')} ], and pushing it through P returns it unchanged: πP = π. ` +
                  'That makes π a left eigenvector of P with eigenvalue 1 — Perron and ' +
                  'Frobenius proved a non-negative matrix always has one, and that for a ' +
                  'positive matrix it is unique and strictly positive.'
                : 'Iterating never converges here: the distribution cycles instead. A ' +
                  'stationary vector still exists as an eigenvector, but the powers Pᵏ do not ' +
                  'approach it, so no starting distribution decays into it.',
            kind: 'formula',
            data: {
                view: 'graph',
                iteration: iterations,
                lines: [
                    { tex: '\\pi P = \\pi, \\qquad \\sum_i \\pi_i = 1' },
                    `π = [ ${limit.distribution.map((v) => v.toFixed(4)).join(', ')} ]`,
                    `πP = [ ${chain.matrix[0]
                        .map((_, j) =>
                            limit.distribution
                                .reduce((sum, p, i) => sum + p * chain.matrix[i][j], 0)
                                .toFixed(4)
                        )
                        .join(', ')} ]`,
                ],
                result: limit.converged
                    ? `converged after ${limit.iterations} iterations`
                    : 'did not converge — see the conditions below',
            },
        },
        {
            id: 'ergodic',
            title: 'When a unique limit is guaranteed',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'NORRIS1997', detail: '§1.8' },
                { key: 'LEVIN2017', detail: 'Ch. 4' },
                { key: 'PERRON1907' },
            ],
            explanation:
                'Two structural conditions decide it. Irreducible: every state can reach ' +
                'every other, so the chain cannot get stranded in a sub-graph. Aperiodic: ' +
                'return times share no common divisor above 1, so the distribution cannot ' +
                `oscillate. This chain is ${irreducible ? '' : 'not '}irreducible and has ` +
                `period ${period(chain.matrix)}${aperiodic ? ' (aperiodic)' : ''} — so the ` +
                `limit is ${ergodic ? 'unique and independent of where you start' : 'not guaranteed'}. ` +
                'Switch the preset and the start state to see both failures.',
            caveat: {
                provenance: 'pedagogical',
                text: 'Convergence here is shown by iterating P, which is the intuition, not the practice. Real chains are attacked with eigen-solvers, and the interesting quantity is usually the mixing time — how many steps until the distance to π is small — governed by the second-largest eigenvalue.',
                sourceRefs: [{ key: 'LEVIN2017', detail: 'Ch. 4, 12' }],
            },
            kind: 'values',
            data: {
                view: 'matrix',
                iteration: iterations,
                values: [
                    { label: 'irreducible', value: irreducible ? 'yes' : 'no' },
                    { label: 'period', value: period(chain.matrix) },
                    { label: 'unique limit', value: ergodic ? 'yes' : 'no' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: {
            chain,
            states: chain.states,
            matrix: chain.matrix,
            path,
            start,
            limit,
            irreducible,
            aperiodic,
            ergodic,
            iterations,
            settledAt,
        },
    };
}
