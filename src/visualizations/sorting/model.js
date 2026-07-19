// Shared sorting model: seeded array construction, event-recording sort
// implementations, and the event-application fold the bar stage renders
// from. Pure and UI-free; events are the Phase 2b stream-channel payload.
//
// Event vocabulary (a stage folds them left-to-right):
//   {t:'range', lo, hi}         highlight the active subarray
//   {t:'pivot', value}          pivot reference line (value, not index —
//                               indices move; a height line never lies)
//   {t:'cmp', i, j?}            comparison (counted; highlights bars)
//   {t:'swap', i, j}            exchange two bars
//   {t:'write', i, value}       write a value into a slot (merging)
//   {t:'done', i}               a slot is in final position
//   {t:'pass', width}           merge pass marker (run length doubles)
//   {t:'alldone'}               everything settled

import { mulberry32, seededShuffle } from '../mathlib/random';

export const PRESETS = [
    { id: 'random', label: 'Shuffled' },
    { id: 'nearly', label: 'Nearly sorted' },
    { id: 'reversed', label: 'Reversed' },
    { id: 'few-unique', label: 'Few unique' },
];

export function makeArray({ size, preset, seed }) {
    const ascending = Array.from({ length: size }, (_, i) =>
        size === 1 ? 100 : 8 + Math.round((92 * i) / (size - 1))
    );
    if (preset === 'reversed') return [...ascending].reverse();
    if (preset === 'nearly') {
        const values = [...ascending];
        const rand = mulberry32(seed);
        const nudges = Math.max(1, Math.floor(size / 8));
        for (let k = 0; k < nudges; k++) {
            const i = Math.floor(rand() * (size - 1));
            [values[i], values[i + 1]] = [values[i + 1], values[i]];
        }
        return values;
    }
    if (preset === 'few-unique') {
        const levels = [20, 45, 70, 95];
        const rand = mulberry32(seed);
        return Array.from({ length: size }, () => levels[Math.floor(rand() * levels.length)]);
    }
    return seededShuffle(ascending, seed);
}

// Quicksort with Hoare's two-pointer partition (pivot = middle element).
export function quicksortEvents(input) {
    const a = [...input];
    const events = [];
    let comparisons = 0;
    let swaps = 0;
    let firstPartitionEnd = null;

    const partition = (lo, hi) => {
        const pivot = a[Math.floor((lo + hi) / 2)];
        events.push({ t: 'range', lo, hi });
        events.push({ t: 'pivot', value: pivot });
        let i = lo - 1;
        let j = hi + 1;
        for (;;) {
            do {
                i++;
                comparisons++;
                events.push({ t: 'cmp', i });
            } while (a[i] < pivot);
            do {
                j--;
                comparisons++;
                events.push({ t: 'cmp', i: j });
            } while (a[j] > pivot);
            if (i >= j) return j;
            swaps++;
            [a[i], a[j]] = [a[j], a[i]];
            events.push({ t: 'swap', i, j });
        }
    };

    const sort = (lo, hi) => {
        if (lo >= hi) {
            if (lo === hi) events.push({ t: 'done', i: lo });
            return;
        }
        const split = partition(lo, hi);
        if (firstPartitionEnd === null) firstPartitionEnd = events.length;
        sort(lo, split);
        sort(split + 1, hi);
    };

    sort(0, a.length - 1);
    events.push({ t: 'alldone' });
    if (firstPartitionEnd === null) firstPartitionEnd = events.length;
    return { events, sorted: a, comparisons, swaps, firstPartitionEnd };
}

// Bottom-up merge sort: passes of doubling run width.
export function mergesortEvents(input) {
    const a = [...input];
    const n = a.length;
    const events = [];
    let comparisons = 0;
    let writes = 0;
    let firstPassEnd = null;

    for (let width = 1; width < n; width *= 2) {
        events.push({ t: 'pass', width: width * 2 });
        for (let lo = 0; lo < n - width; lo += 2 * width) {
            const mid = lo + width - 1;
            const hi = Math.min(lo + 2 * width - 1, n - 1);
            events.push({ t: 'range', lo, hi });
            const left = a.slice(lo, mid + 1);
            const right = a.slice(mid + 1, hi + 1);
            let i = 0;
            let j = 0;
            let k = lo;
            while (i < left.length && j < right.length) {
                comparisons++;
                events.push({ t: 'cmp', i: k });
                if (left[i] <= right[j]) {
                    a[k] = left[i];
                    events.push({ t: 'write', i: k, value: left[i] });
                    i++;
                } else {
                    a[k] = right[j];
                    events.push({ t: 'write', i: k, value: right[j] });
                    j++;
                }
                writes++;
                k++;
            }
            while (i < left.length) {
                a[k] = left[i];
                events.push({ t: 'write', i: k, value: left[i] });
                writes++;
                i++;
                k++;
            }
            while (j < right.length) {
                a[k] = right[j];
                events.push({ t: 'write', i: k, value: right[j] });
                writes++;
                j++;
                k++;
            }
        }
        if (firstPassEnd === null) firstPassEnd = events.length;
    }
    events.push({ t: 'alldone' });
    if (firstPassEnd === null) firstPassEnd = events.length;
    return { events, sorted: a, comparisons, writes, firstPassEnd };
}

// Fold events[0 … upTo) over the input array into a drawable state.
export function applyEvents(input, events, upTo) {
    const values = [...input];
    const settled = new Set();
    let comparisons = 0;
    let swaps = 0;
    let writes = 0;
    let range = null;
    let pivotValue = null;
    let passWidth = null;
    let last = null;

    const limit = Math.min(upTo, events.length);
    for (let k = 0; k < limit; k++) {
        const event = events[k];
        last = event;
        switch (event.t) {
            case 'range':
                range = [event.lo, event.hi];
                pivotValue = null;
                break;
            case 'pivot':
                pivotValue = event.value;
                break;
            case 'cmp':
                comparisons++;
                break;
            case 'swap':
                swaps++;
                [values[event.i], values[event.j]] = [values[event.j], values[event.i]];
                break;
            case 'write':
                writes++;
                values[event.i] = event.value;
                break;
            case 'done':
                settled.add(event.i);
                break;
            case 'pass':
                passWidth = event.width;
                range = null;
                break;
            case 'alldone':
                for (let i = 0; i < values.length; i++) settled.add(i);
                range = null;
                pivotValue = null;
                break;
            default:
                break;
        }
    }

    return { values, settled, comparisons, swaps, writes, range, pivotValue, passWidth, last };
}
