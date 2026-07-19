// Shared modular arithmetic (BigInt). Pure, dependency-free, UI-free.
// Extracted from rsa/math.js once Diffie–Hellman became its second
// consumer — per the roadmap's extraction bar (two shipped consumers).

export const gcd = (a, b) => {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
};

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

// Trial division is plenty for the toy operand sizes the UIs offer.
export function isPrime(n) {
    if (n < 2n) return false;
    if (n % 2n === 0n) return n === 2n;
    for (let d = 3n; d * d <= n; d += 2n) {
        if (n % d === 0n) return false;
    }
    return true;
}
