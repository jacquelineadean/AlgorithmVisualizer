// Pure model for Euclid's algorithm, in both the form the Elements gives
// (repeated subtraction) and the form every implementation uses (division),
// plus the extended version that produces Bézout coefficients. BigInt
// throughout, so the same code serves RSA-sized inputs.

// Anthyphairesis — "reciprocal subtraction", the procedure of Elements
// VII.1–2. Each step also has a geometric reading: cut the largest possible
// square off a rectangle and repeat on what is left.
export function subtractionSteps(a, b) {
    if (a <= 0n || b <= 0n) throw new Error('Euclid’s algorithm needs two positive integers.');
    const steps = [];
    let [x, y] = [a, b];
    let guard = 0;
    while (x !== y) {
        if (guard++ > 10000) break; // subtraction is slow by design; keep the page finite
        if (x > y) {
            steps.push({ from: [x, y], subtract: y, to: [x - y, y] });
            x -= y;
        } else {
            steps.push({ from: [x, y], subtract: x, to: [x, y - x] });
            y -= x;
        }
    }
    return { steps, gcd: x, exhausted: guard > 10000 };
}

// The division form: one modulo replaces a whole run of subtractions.
export function divisionSteps(a, b) {
    if (a <= 0n || b <= 0n) throw new Error('Euclid’s algorithm needs two positive integers.');
    const steps = [];
    let [x, y] = a >= b ? [a, b] : [b, a];
    while (y !== 0n) {
        const q = x / y;
        const r = x % y;
        steps.push({ a: x, b: y, quotient: q, remainder: r });
        [x, y] = [y, r];
    }
    return { steps, gcd: x };
}

export function gcd(a, b) {
    let [x, y] = [a < 0n ? -a : a, b < 0n ? -b : b];
    while (y !== 0n) [x, y] = [y, x % y];
    return x;
}

// Extended Euclid: gcd(a, b) = a·s + b·t, with the coefficients carried
// backward through the same quotients.
export function extendedEuclid(a, b) {
    let [oldR, r] = [a, b];
    let [oldS, s] = [1n, 0n];
    let [oldT, t] = [0n, 1n];
    const rows = [];
    while (r !== 0n) {
        const q = oldR / r;
        rows.push({ quotient: q, r: oldR, s: oldS, t: oldT });
        [oldR, r] = [r, oldR - q * r];
        [oldS, s] = [s, oldS - q * s];
        [oldT, t] = [t, oldT - q * t];
    }
    rows.push({ quotient: null, r: oldR, s: oldS, t: oldT });
    return { gcd: oldR, s: oldS, t: oldT, rows };
}

// The quotients of the division form are exactly the continued-fraction
// expansion of a/b — the same algorithm read a different way.
export const continuedFraction = (a, b) =>
    divisionSteps(a, b).steps.map((step) => step.quotient);

// Lamé (1844): the number of division steps is at most five times the number
// of decimal digits of the smaller input, and the worst case is a pair of
// consecutive Fibonacci numbers.
export function fibonacciPair(index) {
    let [x, y] = [1n, 1n];
    for (let i = 2; i <= index; i++) [x, y] = [y, x + y];
    return [y, x];
}

export const lameBound = (b) => 5 * String(b).length;
