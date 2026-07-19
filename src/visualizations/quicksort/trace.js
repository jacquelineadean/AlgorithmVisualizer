// Builds the quicksort trace: a handful of cited macro-steps, with the
// actual sorting work carried in stream channels (Phase 2b) that the bar
// stage replays event by event.

import { quicksortEvents } from '../sorting/model';

export function buildQuicksortTrace({ values }) {
    if (!Array.isArray(values) || values.length < 2 || values.length > 64) {
        throw new Error('Give me an array of 2 to 64 numbers.');
    }
    if (!values.every((v) => Number.isFinite(v))) {
        throw new Error('Every element must be a number.');
    }

    const n = values.length;
    const { events, sorted, comparisons, swaps, firstPartitionEnd } = quicksortEvents(values);
    const nlogn = Math.ceil(n * Math.log2(n));

    const steps = [
        {
            id: 'the-array',
            title: 'The array, as bars',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'CLRS22', detail: 'Ch. 7 figures' }],
            explanation:
                `${n} numbers drawn as bar heights — the same convention the textbooks use, ` +
                'because sortedness becomes something you can see at a glance: a staircase. ' +
                'Nothing has been compared yet.',
            kind: 'values',
            data: {
                eventBase: 0,
                values: [
                    { label: 'n', value: n },
                    { label: 'values', value: '8 … 100' },
                ],
            },
        },
        {
            id: 'first-partition',
            title: 'Partition around a pivot',
            provenance: 'paper',
            sourceRefs: [
                { key: 'HOARE61' },
                { key: 'HOARE62', detail: 'partition' },
            ],
            explanation:
                'Hoare’s move: pick a pivot value (gold line), then walk two pointers inward — ' +
                'from the left until a bar is too big, from the right until one is too small — ' +
                'and swap the misfits. When the pointers cross, everything left of the split is ' +
                '≤ everything right of it. Watch the first partition run.',
            caveat: {
                provenance: 'modern',
                text: 'Hoare suggested a random pivot; taking the middle element (as here) is the common textbook variant and dodges the classic sorted-input trap.',
                sourceRefs: [{ key: 'CLRS22', detail: 'Problem 7-1' }],
            },
            kind: 'formula',
            data: {
                eventBase: 0,
                caption: 'Hoare partition, in pointer form:',
                lines: [
                    'i ← lo−1;  j ← hi+1',
                    'repeat:  i++ while a[i] < pivot;   j−− while a[j] > pivot',
                    'if i ≥ j: split found — else swap a[i], a[j] and continue',
                ],
            },
            stream: { events: events.slice(0, firstPartitionEnd), tick: 90 },
        },
        {
            id: 'divide-and-conquer',
            title: 'Recurse on both sides',
            provenance: 'paper',
            sourceRefs: [
                { key: 'HOARE61' },
                { key: 'CLRS22', detail: '§7.1' },
            ],
            explanation:
                'Algorithm 64 is four lines: partition, then quicksort each side. The active ' +
                'window (tinted) shrinks as recursion descends; single bars settle green. ' +
                'Here is the entire remaining recursion.',
            kind: 'values',
            data: {
                eventBase: firstPartitionEnd,
                values: [{ label: 'subproblems', value: 'partition → left, right' }],
            },
            stream: { events: events.slice(firstPartitionEnd), tick: 24, batch: 3 },
        },
        {
            id: 'the-cost',
            title: 'What it cost',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'HOARE62', detail: 'analysis' },
                { key: 'CLRS22', detail: '§7.4' },
            ],
            explanation:
                `Sorted with ${comparisons} comparisons and ${swaps} swaps. Hoare's own analysis ` +
                `puts the average near 2n·ln n ≈ ${Math.round(2 * n * Math.log(n))} comparisons — ` +
                `n·log₂n is ${nlogn} for scale. Adversarial orders can still force ~n²/2 ` +
                `(${Math.round((n * n) / 2)} here); randomized pivots make that vanishingly unlikely.`,
            kind: 'values',
            data: {
                eventBase: events.length,
                values: [
                    { label: 'comparisons', value: comparisons },
                    { label: 'swaps', value: swaps },
                    { label: 'n·log₂ n', value: nlogn },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { input: values, events, sorted, comparisons, swaps },
    };
}
