// Pure BigInt number theory for the RSA visualization. No UI imports.
// Functions that back visualization steps also return their intermediate
// work (rows) so the trace can show the computation, not just the answer.

export const gcd = (a, b) => {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
};

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

// Left-to-right square-and-multiply. Returns the result plus one row per
// exponent bit: { bit, squared, value } where value folds in the multiply.
export function modPowSteps(base, exp, mod) {
    if (mod === 1n) return { result: 0n, bits: exp.toString(2), rows: [] };
    const bits = exp.toString(2);
    let acc = 1n;
    const rows = [];
    for (const bitChar of bits) {
        const squared = (acc * acc) % mod;
        const value = bitChar === '1' ? (squared * (base % mod)) % mod : squared;
        rows.push({ bit: bitChar, squared, value });
        acc = value;
    }
    return { result: acc, bits, rows };
}

export const modPow = (base, exp, mod) => modPowSteps(base, exp, mod).result;

// Trial division is plenty for the toy prime sizes the UI offers.
export function isPrime(n) {
    if (n < 2n) return false;
    if (n % 2n === 0n) return n === 2n;
    for (let d = 3n; d * d <= n; d += 2n) {
        if (n % d === 0n) return false;
    }
    return true;
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
