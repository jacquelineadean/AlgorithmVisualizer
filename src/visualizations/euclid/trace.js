// Builds the Euclid trace: the geometric procedure of the Elements, the
// arithmetic shortcut that replaced it, the Bézout coefficients that fall
// out for free, and the first complexity proof in history.

import {
    continuedFraction,
    divisionSteps,
    extendedEuclid,
    fibonacciPair,
    lameBound,
    subtractionSteps,
} from './model';

export function buildEuclidTrace({ a, b }) {
    if (typeof a !== 'bigint' || typeof b !== 'bigint') {
        throw new Error('Euclid’s algorithm needs two positive integers.');
    }
    if (a <= 0n || b <= 0n || a > 100000n || b > 100000n) {
        throw new Error('Pick two positive integers up to 100,000.');
    }

    const subtraction = subtractionSteps(a, b);
    const division = divisionSteps(a, b);
    const extended = extendedEuclid(a, b);
    const cf = continuedFraction(a, b);
    const [worstA, worstB] = fibonacciPair(12);
    const worstCase = divisionSteps(worstA, worstB);
    const g = division.gcd;

    const steps = [
        {
            id: 'the-question',
            title: `The largest common measure of ${a} and ${b}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'EUCLID', detail: 'VII.1–2' }],
            explanation:
                'Euclid asks it geometrically: given two lengths, find the longest ruler that ' +
                'measures both exactly. The rectangle below is a × b; the algorithm is the ' +
                'procedure for tiling it with the largest squares you can, and the last square ' +
                'you cut is the answer. It is the oldest algorithm still in everyday use — ' +
                'every RSA key generation runs it.',
            kind: 'values',
            data: {
                view: 'tiling',
                stepIndex: 0,
                values: [
                    { label: 'a', value: String(a) },
                    { label: 'b', value: String(b) },
                ],
            },
        },
        {
            id: 'subtract',
            title: 'Take the smaller from the larger, repeatedly',
            provenance: 'paper',
            sourceRefs: [{ key: 'EUCLID', detail: 'VII.2' }],
            explanation:
                `Anthyphairesis — reciprocal subtraction — is the form the Elements gives. ` +
                `Any common divisor of two numbers also divides their difference, so ` +
                `subtracting never destroys the answer and always shrinks the problem. It ` +
                `takes ${subtraction.steps.length} subtraction${
                    subtraction.steps.length === 1 ? '' : 's'
                } to reach ${subtraction.gcd} here.`,
            kind: 'values',
            data: {
                view: 'tiling',
                stepIndex: 0,
                eventBase: 0,
                values: [
                    { label: 'subtractions', value: subtraction.steps.length },
                    { label: 'invariant', value: 'gcd(x, y) = gcd(x − y, y)' },
                ],
            },
            stream: {
                events: subtraction.steps.map((_, i) => ({ t: 'sub', i })),
                tick: 220,
                batch: Math.max(1, Math.round(subtraction.steps.length / 40)),
            },
        },
        {
            id: 'divide',
            title: 'One division does a whole run of subtractions',
            provenance: 'modern',
            sourceRefs: [{ key: 'KNUTH1997', detail: '§4.5.2' }, { key: 'EUCLID', detail: 'VII.2' }],
            explanation:
                `Subtracting b from a repeatedly until it no longer fits is exactly taking ` +
                `a mod b. The same ${subtraction.steps.length} subtractions collapse into ` +
                `${division.steps.length} division${division.steps.length === 1 ? '' : 's'}. ` +
                'The quotients are worth reading on their own: ' +
                `[${cf.join(', ')}] is the continued-fraction expansion of ${a}/${b}, which ` +
                'is the same computation viewed from another angle.',
            kind: 'formula',
            data: {
                view: 'table',
                stepIndex: division.steps.length,
                caption: 'Each row is a division; the remainder becomes the next divisor:',
                lines: division.steps.map(
                    (step) =>
                        `${step.a} = ${step.quotient} × ${step.b} + ${step.remainder}`
                ),
                result: `gcd(${a}, ${b}) = ${g}`,
            },
        },
        {
            id: 'bezout',
            title: 'Reading it backwards gives Bézout',
            provenance: 'theorem',
            sourceRefs: [{ key: 'BEZOUT1779' }, { key: 'KNUTH1997', detail: '§4.5.2' }],
            explanation:
                `Carry two extra columns through the same quotients and you get integers s ` +
                `and t with a·s + b·t = gcd: ${a}·${extended.s} + ${b}·${extended.t} = ${g}. ` +
                'When the gcd is 1 this is a modular inverse, which is exactly how RSA finds ' +
                'the private exponent from the public one — the extended algorithm is not a ' +
                'variant, it is the same computation keeping better notes.',
            kind: 'formula',
            data: {
                view: 'table',
                stepIndex: division.steps.length,
                lines: [
                    { tex: '\\gcd(a,b) = a\\,s + b\\,t' },
                    `${a}·(${extended.s}) + ${b}·(${extended.t}) = ${g}`,
                    g === 1n
                        ? `so ${a} has an inverse mod ${b}: ${((extended.s % b) + b) % b}`
                        : `gcd is ${g}, so no inverse exists mod ${b}`,
                ],
            },
        },
        {
            id: 'lame',
            title: 'The first complexity proof',
            provenance: 'theorem',
            sourceRefs: [{ key: 'LAME1844' }, { key: 'KNUTH1997', detail: '§4.5.3' }],
            explanation:
                'In 1844 Lamé proved the number of divisions never exceeds five times the ' +
                'decimal digit count of the smaller number — the first worst-case analysis of ' +
                `any algorithm, more than a century before the field existed. Here b = ${b} ` +
                `has ${String(b).length} digit${String(b).length === 1 ? '' : 's'}, so the ` +
                `bound is ${lameBound(b)}; the run took ${division.steps.length}. The worst ` +
                `case is always consecutive Fibonacci numbers — ${worstA} and ${worstB} need ` +
                `${worstCase.steps.length} divisions, because every quotient is 1 and nothing ` +
                'shrinks faster than it must.',
            caveat: {
                provenance: 'pedagogical',
                text: 'Inputs here are capped at 100,000 so the subtraction form stays watchable. The algorithm itself has no such limit — the same division loop on 2048-bit RSA moduli finishes in a few hundred steps, which is why key generation is fast.',
                sourceRefs: [{ key: 'KNUTH1997', detail: '§4.5.2' }],
            },
            kind: 'formula',
            data: {
                view: 'table',
                stepIndex: division.steps.length,
                lines: [
                    { tex: '\\#\\text{divisions} \\le 5 \\cdot \\lceil \\log_{10} \\min(a,b) \\rceil' },
                    `bound ${lameBound(b)}, actual ${division.steps.length}`,
                    `worst case: gcd(${worstA}, ${worstB}) takes ${worstCase.steps.length} divisions`,
                ],
            },
        },
    ];

    return { steps, artifacts: { a, b, subtraction, division, extended, gcd: g, cf } };
}
