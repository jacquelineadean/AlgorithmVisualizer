// Pure BigInt number theory for the RSA visualization. No UI imports.
// Functions that back visualization steps also return their intermediate
// work (rows) so the trace can show the computation, not just the answer.
// Generic modular arithmetic lives in ../mathlib/modular and is re-exported
// here so RSA's public surface is unchanged.

export { gcd, isPrime, modPow, modPowSteps } from '../mathlib/modular';
import { gcd } from '../mathlib/modular';

// Extended Euclid. Returns g = gcd(a, b) plus Bézout coefficients with
// a·x + b·y = g, and the division rows (a = q·b + r) for display.
export function egcdSteps(a, b) {
    let [prevR, r] = [a, b];
    let [prevX, x] = [1n, 0n];
    let [prevY, y] = [0n, 1n];
    const rows = [];
    while (r !== 0n) {
        const q = prevR / r;
        rows.push({ a: prevR, b: r, q, r: prevR % r });
        [prevR, r] = [r, prevR - q * r];
        [prevX, x] = [x, prevX - q * x];
        [prevY, y] = [y, prevY - q * y];
    }
    return { g: prevR, x: prevX, y: prevY, rows };
}

// Modular inverse of a mod m (throws if gcd(a, m) !== 1).
export function modInverse(a, m) {
    const { g, x } = egcdSteps(a, m);
    if (g !== 1n) throw new Error(`${a} has no inverse mod ${m} (gcd is ${g}).`);
    return ((x % m) + m) % m;
}

// Primes offered by the UI. All ≥ 11 so that n = p·q > 126 and every
// printable-ASCII code fits in a single block.
export const PRIMES = [
    11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n,
    71n, 73n, 79n, 83n, 89n, 97n, 101n, 103n, 107n, 109n, 113n,
];

// Public exponents worth offering, smallest-first; 65537 is the modern
// default when it fits. Filtered against φ for validity.
const E_CANDIDATES = [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 257n, 65537n];

export const validPublicExponents = (phi) =>
    E_CANDIDATES.filter((e) => e < phi && gcd(e, phi) === 1n);

export function randomPrimePair() {
    const first = PRIMES[Math.floor(Math.random() * PRIMES.length)];
    let second = first;
    while (second === first) {
        second = PRIMES[Math.floor(Math.random() * PRIMES.length)];
    }
    return [first, second];
}

// Message encoding: one printable-ASCII character per block, mirroring the
// 1978 paper's per-block letter coding but using char codes. Throws on
// characters outside printable ASCII.
export function encodeMessage(text) {
    return [...text].map((char) => {
        const code = char.codePointAt(0);
        if (code < 32 || code > 126) {
            throw new Error(
                `"${char}" is outside printable ASCII — use letters, digits, or punctuation.`
            );
        }
        return { char, code: BigInt(code) };
    });
}
