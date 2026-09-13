// A complete SHA-256, written to be read: padding, the message schedule,
// and all 64 rounds with every working variable recorded. Constants and
// operations follow FIPS 180-4 §4.1.2, §4.2.2, §5.3.3, and §6.2. The tests
// check it against the standard's own published digests.

export const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// The initial hash value: fractional parts of the square roots of the first
// eight primes — "nothing up my sleeve" numbers.
export const H0 = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
const shr = (x, n) => x >>> n;
const add = (...values) => values.reduce((a, b) => (a + b) >>> 0, 0);

export const Ch = (x, y, z) => ((x & y) ^ (~x & z)) >>> 0;
export const Maj = (x, y, z) => ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
export const Sigma0 = (x) => (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
export const Sigma1 = (x) => (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
export const sigma0 = (x) => (rotr(x, 7) ^ rotr(x, 18) ^ shr(x, 3)) >>> 0;
export const sigma1 = (x) => (rotr(x, 17) ^ rotr(x, 19) ^ shr(x, 10)) >>> 0;

export const hex = (word) => word.toString(16).padStart(8, '0');
export const bits = (word) => word.toString(2).padStart(32, '0');

// §5.1.1: append a 1 bit, pad with zeros to 448 mod 512, then the length as
// a 64-bit big-endian integer. Encoding the length is what stops two
// different messages from sharing a padded form.
export function pad(messageBytes) {
    const bitLength = messageBytes.length * 8;
    const padded = [...messageBytes, 0x80];
    while (padded.length % 64 !== 56) padded.push(0);
    for (let i = 7; i >= 0; i--) padded.push((bitLength / 2 ** (8 * i)) & 0xff);
    return padded;
}

export const toBytes = (text) => [...new TextEncoder().encode(text)];

export function blocksOf(paddedBytes) {
    const blocks = [];
    for (let i = 0; i < paddedBytes.length; i += 64) {
        const words = [];
        for (let w = 0; w < 16; w++) {
            const offset = i + w * 4;
            words.push(
                ((paddedBytes[offset] << 24) |
                    (paddedBytes[offset + 1] << 16) |
                    (paddedBytes[offset + 2] << 8) |
                    paddedBytes[offset + 3]) >>>
                    0
            );
        }
        blocks.push(words);
    }
    return blocks;
}

// §6.2.2: the 16 words of a block expand into 64, each new word mixing four
// earlier ones. This is what makes every output bit depend on every input.
export function schedule(block) {
    const w = [...block];
    for (let t = 16; t < 64; t++) {
        w.push(add(sigma1(w[t - 2]), w[t - 7], sigma0(w[t - 15]), w[t - 16]));
    }
    return w;
}

// §6.2.2 step 3: 64 rounds over eight working variables. Every round is
// recorded so the page can scrub through the compression.
export function compress(state, block) {
    const w = schedule(block);
    let [a, b, c, d, e, f, g, h] = state;
    const rounds = [];
    for (let t = 0; t < 64; t++) {
        const T1 = add(h, Sigma1(e), Ch(e, f, g), K[t], w[t]);
        const T2 = add(Sigma0(a), Maj(a, b, c));
        h = g;
        g = f;
        f = e;
        e = add(d, T1);
        d = c;
        c = b;
        b = a;
        a = add(T1, T2);
        rounds.push({ t, T1, T2, w: w[t], k: K[t], state: [a, b, c, d, e, f, g, h] });
    }
    const next = state.map((value, i) => add(value, [a, b, c, d, e, f, g, h][i]));
    return { rounds, schedule: w, next };
}

export function sha256(text) {
    const padded = pad(toBytes(text));
    const blocks = blocksOf(padded);
    let state = [...H0];
    const perBlock = [];
    for (const block of blocks) {
        const result = compress(state, block);
        perBlock.push({ block, ...result, before: state });
        state = result.next;
    }
    return { digest: state.map(hex).join(''), state, blocks, perBlock, padded };
}

// The avalanche criterion: flipping one input bit should change about half
// the output bits. Measured, not assumed.
export function avalanche(a, b) {
    const digestA = sha256(a).state;
    const digestB = sha256(b).state;
    let changed = 0;
    for (let i = 0; i < 8; i++) {
        let diff = (digestA[i] ^ digestB[i]) >>> 0;
        while (diff) {
            changed += diff & 1;
            diff >>>= 1;
        }
    }
    return { changed, total: 256, fraction: changed / 256 };
}

// One-character mutation used by the avalanche step: flip the low bit of the
// last character, so the two messages differ in exactly one bit.
export function flipLastBit(text) {
    if (text.length === 0) return '';
    const bytes = toBytes(text);
    bytes[bytes.length - 1] ^= 1;
    return new TextDecoder().decode(new Uint8Array(bytes));
}
