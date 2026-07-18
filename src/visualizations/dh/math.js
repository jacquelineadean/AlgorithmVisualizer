// Pure math for the Diffie–Hellman visualization. No UI imports.
// Builds on the shared modular-arithmetic lib.

import { isPrime, modPow } from '../mathlib/modular';

// Safe primes (p and (p−1)/2 both prime), so generator checking is exact:
// element orders in Z_p* divide 2q, hence g generates iff g² ≠ 1 and gᑫ ≠ 1.
// All ≥ 23 keep the toy numbers readable but non-trivial.
export const SAFE_PRIMES = [
    23n, 47n, 59n, 83n, 107n, 167n, 179n, 227n, 263n, 347n, 359n, 383n, 467n,
    479n, 503n, 563n, 587n, 719n, 839n, 863n, 887n, 983n,
];

export const isSafePrime = (p) => isPrime(p) && isPrime((p - 1n) / 2n);

export function isGenerator(g, p) {
    if (g <= 1n || g >= p - 1n) return false;
    const q = (p - 1n) / 2n;
    return modPow(g, 2n, p) !== 1n && modPow(g, q, p) !== 1n;
}

// The first few generators of Z_p*, offered as the g dropdown.
export function generatorOptions(p, limit = 8) {
    const options = [];
    for (let g = 2n; g < p - 1n && options.length < limit; g++) {
        if (isGenerator(g, p)) options.push(g);
    }
    return options;
}

export function randomExponent(p) {
    // 2 … p−2 inclusive (that's p−3 candidate values), uniform enough for a toy.
    const count = Number(p - 3n);
    return BigInt(2 + Math.floor(Math.random() * count));
}
