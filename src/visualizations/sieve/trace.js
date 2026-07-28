// Builds the sieve trace: the board, the first crossing-out (streamed),
// the rest of the sieve (streamed), and the harvest.

import { sieveEvents } from './model';

export function buildSieveTrace({ N }) {
    if (!Number.isInteger(N) || N < 10 || N > 400) {
        throw new Error('Pick a board size N between 10 and 400.');
    }

    const { events, primes, firstPrimeEnd } = sieveEvents(N);
    const sqrtN = Math.floor(Math.sqrt(N));

    const steps = [
        {
            id: 'the-board',
            title: `Every number from 2 to ${N}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'HORSLEY1772' }],
            explanation:
                'Eratosthenes of Cyrene — per Nicomachus, and in Horsley’s 1772 account ' +
                'for the Royal Society — lays out the integers and lets them eliminate ' +
                'each other. No division, no trial factoring: only counting in strides.',
            caveat: {
                provenance: 'pedagogical',
                text: 'Toy board so every strike is visible. The primes that guard RSA are hundreds of digits long — sieves at that scale only precompute the small primes used to screen candidates.',
                sourceRefs: [{ key: 'ONEILL2009' }],
            },
            kind: 'values',
            data: {
                eventBase: 0,
                values: [
                    { label: 'board', value: `2 … ${N}` },
                    { label: 'numbers', value: N - 1 },
                ],
            },
        },
        {
            id: 'first-prime',
            title: '2 survives; its multiples fall',
            provenance: 'paper',
            sourceRefs: [{ key: 'HORSLEY1772' }],
            explanation:
                'The smallest unstruck number must be prime — nothing smaller was around ' +
                'to strike it. Keep 2, then cross out 4, 6, 8… in strides of 2. Half the ' +
                'board falls at once.',
            kind: 'values',
            data: {
                eventBase: 0,
                values: [{ label: 'stride', value: 2 }],
            },
            stream: { events: events.slice(0, firstPrimeEnd), tick: 25 },
        },
        {
            id: 'sieve-on',
            title: `Repeat up to √${N} ≈ ${sqrtN}`,
            provenance: 'theorem',
            sourceRefs: [
                { key: 'HORSLEY1772' },
                { key: 'ONEILL2009', detail: '§1–2' },
            ],
            explanation:
                `Each surviving p starts crossing at p² — every smaller multiple of p ` +
                `already fell to a smaller prime. And once p exceeds √${N}, p² is off the ` +
                'board: everything still standing is prime. The genuine sieve does no ' +
                'division at all — O’Neill’s point — which is why it costs only ' +
                'Θ(n log log n).',
            kind: 'formula',
            data: {
                eventBase: firstPrimeEnd,
                lines: [
                    'the least unstruck number is always prime',
                    'p strikes p², p²+p, p²+2p, …   (smaller multiples already fell)',
                    `p > √N  ⇒  p² > N  ⇒  nothing left to strike`,
                ],
            },
            stream: { events: events.slice(firstPrimeEnd), tick: 12, batch: 3 },
        },
        {
            id: 'harvest',
            title: `${primes.length} primes remain`,
            provenance: 'paper',
            sourceRefs: [{ key: 'HORSLEY1772' }, { key: 'ONEILL2009' }],
            explanation:
                `π(${N}) = ${primes.length}: the survivors ${primes.slice(0, 8).join(', ')}` +
                `${primes.length > 8 ? ', …' : ''} up to ${primes.at(-1)}. Slide the board ` +
                'larger and watch the primes thin out — they never stop, but they spread.',
            kind: 'values',
            data: {
                eventBase: events.length,
                values: [
                    { label: `π(${N})`, value: primes.length },
                    { label: 'largest', value: primes.at(-1) },
                ],
            },
        },
    ];

    return { steps, artifacts: { N, events, primes } };
}
