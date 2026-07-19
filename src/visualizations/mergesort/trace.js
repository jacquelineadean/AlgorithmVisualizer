// Builds the merge sort trace (bottom-up): cited macro-steps with the
// merging work streamed to the bar stage.

import { mergesortEvents } from '../sorting/model';

export function buildMergesortTrace({ values }) {
    if (!Array.isArray(values) || values.length < 2 || values.length > 64) {
        throw new Error('Give me an array of 2 to 64 numbers.');
    }
    if (!values.every((v) => Number.isFinite(v))) {
        throw new Error('Every element must be a number.');
    }

    const n = values.length;
    const { events, sorted, comparisons, writes, firstPassEnd } = mergesortEvents(values);
    const nlogn = Math.ceil(n * Math.log2(n));
    const passes = Math.ceil(Math.log2(n));

    const steps = [
        {
            id: 'the-array',
            title: 'The array, as bars',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'CLRS22', detail: '§2.3 figures' }],
            explanation:
                `${n} numbers as bar heights. Merge sort will never look at the whole array ` +
                'at once — it only ever merges two already-sorted runs, starting from runs of ' +
                'length one (which are trivially sorted).',
            kind: 'values',
            data: {
                eventBase: 0,
                values: [
                    { label: 'n', value: n },
                    { label: 'runs of length 1', value: n },
                ],
            },
        },
        {
            id: 'first-pass',
            title: 'Merge neighbors into runs of two',
            provenance: 'paper',
            sourceRefs: [
                { key: 'KNUTH98', detail: '§5.2.4' },
                { key: 'CLRS22', detail: '§2.3.1 MERGE' },
            ],
            explanation:
                'The first pass merges each pair of neighbors: compare the two front ' +
                'elements, write the smaller (green flashes), repeat. Knuth traces this ' +
                'method to John von Neumann’s 1945 programs for the EDVAC — sorting by ' +
                'merging is as old as stored-program computing itself.',
            kind: 'formula',
            data: {
                eventBase: 0,
                caption: 'Merging two sorted runs:',
                lines: [
                    'while both runs have elements: write the smaller front element',
                    'then copy whatever one run has left',
                ],
            },
            stream: { events: events.slice(0, firstPassEnd), tick: 80 },
        },
        {
            id: 'double-the-runs',
            title: 'Runs double until one remains',
            provenance: 'paper',
            sourceRefs: [{ key: 'KNUTH98', detail: '§5.2.4' }],
            explanation:
                `Each pass merges runs twice as long as the last — the marker top-right shows ` +
                `the current run width. ${passes} passes over ${n} bars and the staircase ` +
                'assembles itself, window by window.',
            kind: 'values',
            data: {
                eventBase: firstPassEnd,
                values: [{ label: 'passes', value: passes }],
            },
            stream: { events: events.slice(firstPassEnd), tick: 24, batch: 3 },
        },
        {
            id: 'the-guarantee',
            title: 'The n log n guarantee',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'CLRS22', detail: '§2.3.2' },
                { key: 'KNUTH98', detail: '§5.2.4' },
            ],
            explanation:
                `Sorted with ${comparisons} comparisons and ${writes} writes. Every pass costs ` +
                `at most n comparisons and there are ⌈log₂n⌉ = ${passes} passes — so the worst ` +
                `case is bounded by n·log₂n ≈ ${nlogn}, no matter how adversarial the input. ` +
                'That guarantee is what quicksort trades away for its speed on average.',
            kind: 'values',
            data: {
                eventBase: events.length,
                values: [
                    { label: 'comparisons', value: comparisons },
                    { label: 'writes', value: writes },
                    { label: 'n·log₂ n', value: nlogn },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { input: values, events, sorted, comparisons, writes },
    };
}
