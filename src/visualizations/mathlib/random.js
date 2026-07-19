// Seeded PRNG shared by stages that need deterministic "randomness" —
// dot scatters, array shuffles — so identical inputs (and shared URLs)
// always reproduce identical pictures. Moved verbatim from bayes/math.js
// when sorting became its second consumer.

export function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Fisher–Yates shuffle with a seeded source; returns a new array.
export function seededShuffle(items, seed) {
    const result = [...items];
    const rand = mulberry32(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
