// Builds the Diffie–Hellman trace: two parties agree on a shared secret
// over a channel Eve can read in full. The UI renders the trace; it never
// computes the protocol itself.

import { modPowSteps } from '../mathlib/modular';
import { isGenerator, isSafePrime } from './math';

export const ACTS = [
    { id: 'setup', name: 'Act I — Public agreement', actor: 'Everyone' },
    { id: 'exchange', name: 'Act II — Secrets & publics', actor: 'Alice & Bob' },
    { id: 'secret', name: 'Act III — The shared secret', actor: 'Alice & Bob' },
];

const sqmulData = (caption, work) => ({
    focus: { caption, rows: work.rows, result: work.result },
});

// inputs: { p, g, a, b } as BigInt.
export function buildDhTrace({ p, g, a, b }) {
    if (!isSafePrime(p)) {
        throw new Error(`p = ${p} must be a safe prime (p and (p−1)/2 both prime).`);
    }
    if (!isGenerator(g, p)) {
        throw new Error(`g = ${g} is not a generator of the multiplicative group mod ${p}.`);
    }
    if (!(a >= 2n && a <= p - 2n) || !(b >= 2n && b <= p - 2n)) {
        throw new Error(`Secrets must lie in 2 … ${p - 2n}.`);
    }

    const workA = modPowSteps(g, a, p); // A = g^a mod p
    const workB = modPowSteps(g, b, p); // B = g^b mod p
    const A = workA.result;
    const B = workB.result;
    const workSharedAlice = modPowSteps(B, a, p); // s = B^a mod p
    const workSharedBob = modPowSteps(A, b, p); // s = A^b mod p
    const s = workSharedAlice.result;

    const steps = [
        {
            id: 'agree-parameters',
            act: 'setup',
            title: 'Agree on public parameters',
            provenance: 'paper',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                `Alice and Bob publicly agree on a prime modulus p = ${p} and a generator ` +
                `g = ${g} — a number whose powers cycle through every value mod p. Nothing here ` +
                'is secret; Eve reads both. This is the 1976 paper that proposed public-key ' +
                'cryptography, two years before RSA realized digital signatures with it.',
            caveat: {
                provenance: 'modern',
                text: 'Deployed systems use standardized groups with 2048-bit-plus moduli (often g = 2), so parameter choice is an RFC lookup, not a negotiation.',
                sourceRefs: [{ key: 'RFC3526' }, { key: 'NIST80056A' }],
            },
            kind: 'values',
            data: {
                values: [
                    { label: 'modulus p', value: p },
                    { label: 'generator g', value: g },
                ],
            },
        },
        {
            id: 'alice-secret',
            act: 'exchange',
            title: 'Alice draws a secret',
            provenance: 'paper',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                `Alice picks a = ${a}, uniformly at random from 2 … p−2, and tells no one — ` +
                'not even Bob. The entire protocol rests on a and b staying private while ' +
                'everything computed from them travels in the open.',
            kind: 'values',
            data: {
                values: [{ label: 'Alice’s secret a', value: a }],
            },
        },
        {
            id: 'alice-public',
            act: 'exchange',
            title: 'Alice computes her public value',
            provenance: 'paper',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                `Alice raises the generator to her secret: A = g^a mod p = ${g}^${a} mod ${p} ` +
                `= ${A}, by repeated squaring. Computing A from a is fast; recovering a from A ` +
                'is the discrete-logarithm problem.',
            kind: 'sqmul',
            data: sqmulData(
                `Square-and-multiply, A = ${g}^${a} mod ${p}, exponent a = ${a} = ${workA.bits}₂:`,
                workA
            ),
        },
        {
            id: 'bob-secret',
            act: 'exchange',
            title: 'Bob draws a secret',
            provenance: 'paper',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                `Bob independently picks his own secret b = ${b} from the same range, and ` +
                'likewise tells no one.',
            kind: 'values',
            data: {
                values: [{ label: 'Bob’s secret b', value: b }],
            },
        },
        {
            id: 'bob-public',
            act: 'exchange',
            title: 'Bob computes his public value',
            provenance: 'paper',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                `Bob computes B = g^b mod p = ${g}^${b} mod ${p} = ${B} the same way — one ` +
                'modular exponentiation of the shared generator.',
            kind: 'sqmul',
            data: sqmulData(
                `Square-and-multiply, B = ${g}^${b} mod ${p}, exponent b = ${b} = ${workB.bits}₂:`,
                workB
            ),
        },
        {
            id: 'exchange-publics',
            act: 'exchange',
            title: 'Swap public values in the open',
            provenance: 'paper',
            sourceRefs: [
                { key: 'DH76', detail: '§I, §III' },
                { key: 'MERKLE78' },
            ],
            explanation:
                `A = ${A} and B = ${B} cross the public channel. Eve now holds p, g, A, and B — ` +
                'every message ever sent. Merkle had argued the year before the paper appeared ' +
                'that secure communication over an insecure channel was possible at all; this ' +
                'exchange is the idea at full strength.',
            kind: 'values',
            data: {
                values: [
                    { label: 'Alice → Bob', value: `A = ${A}` },
                    { label: 'Bob → Alice', value: `B = ${B}` },
                    { label: 'Eve sees', value: `p, g, A, B` },
                ],
            },
        },
        {
            id: 'alice-shared',
            act: 'secret',
            title: 'Alice computes the shared secret',
            provenance: 'paper',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                `Alice raises Bob's public value to her secret: s = B^a mod p = ` +
                `${B}^${a} mod ${p} = ${s}. She never needed b.`,
            kind: 'sqmul',
            data: sqmulData(
                `Square-and-multiply, s = ${B}^${a} mod ${p}, exponent a = ${a} = ${workSharedAlice.bits}₂:`,
                workSharedAlice
            ),
        },
        {
            id: 'bob-shared',
            act: 'secret',
            title: 'Bob computes the same secret',
            provenance: 'paper',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                `Bob raises Alice's public value to his secret: s = A^b mod p = ` +
                `${A}^${b} mod ${p} = ${workSharedBob.result}. Different route, identical ` +
                'destination.',
            kind: 'sqmul',
            data: sqmulData(
                `Square-and-multiply, s = ${A}^${b} mod ${p}, exponent b = ${b} = ${workSharedBob.bits}₂:`,
                workSharedBob
            ),
        },
        {
            id: 'same-secret',
            act: 'secret',
            title: 'Why both routes agree',
            provenance: 'theorem',
            sourceRefs: [{ key: 'DH76', detail: '§III' }],
            explanation:
                'Exponentiation commutes in the exponent: raising g to a and then b lands on ' +
                'the same value as raising it to b and then a. That elementary law of exponents ' +
                'is the entire trick.',
            kind: 'formula',
            data: {
                lines: [
                    'B^a = (g^b)^a = g^(b·a) = g^(a·b) = (g^a)^b = A^b   (mod p)',
                    `${B}^${a} ≡ ${g}^(${a}·${b}) ≡ ${A}^${b} ≡ ${s}   (mod ${p})`,
                ],
                result: `shared secret s = ${s}`,
            },
        },
        {
            id: 'why-eve-fails',
            act: 'secret',
            title: 'What Eve is missing',
            provenance: 'modern',
            sourceRefs: [
                { key: 'DH76', detail: '§III' },
                { key: 'NIST80056A' },
            ],
            explanation:
                `Eve holds p, g, A, and B — but s was computed from a secret she never saw. ` +
                `To get s she must recover a from A = g^a mod p (or b from B): the discrete-` +
                'logarithm problem, for which no efficient classical algorithm is known at ' +
                'deployed sizes. The shared secret then feeds a symmetric cipher as its key.',
            caveat: {
                provenance: 'pedagogical',
                text: `At this toy size Eve brute-forces a in microseconds — try it: check every exponent up to ${p - 2n}. Real groups make that search take longer than the universe has.`,
                sourceRefs: [{ key: 'RFC3526' }, { key: 'NIST80056A' }],
            },
            kind: 'values',
            data: {
                values: [
                    { label: 'Eve sees', value: `p, g, A = ${A}, B = ${B}` },
                    { label: 'Eve needs', value: `a from g^a ≡ ${A}, or b from g^b ≡ ${B}` },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { p, g, a, b, A, B, s, sBob: workSharedBob.result },
    };
}
