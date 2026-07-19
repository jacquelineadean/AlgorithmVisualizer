// Builds the RSA visualization trace: an ordered list of steps, each
// carrying its computed values, a provenance class, and citations into
// sources.js. The UI renders the trace; it never computes RSA itself.

import {
    egcdSteps,
    encodeMessage,
    gcd,
    isPrime,
    modInverse,
    modPowSteps,
    validPublicExponents,
} from './math';

export const ACTS = [
    { id: 'keygen', name: 'Act I — Key generation', actor: 'Alice' },
    { id: 'encrypt', name: 'Act II — Encryption', actor: 'Bob' },
    { id: 'decrypt', name: 'Act III — Decryption', actor: 'Alice' },
];

// inputs: { message: string, p: bigint, q: bigint, e: bigint }
export function buildRsaTrace({ message, p, q, e }) {
    if (!isPrime(p) || !isPrime(q)) throw new Error('p and q must both be prime.');
    if (p === q) throw new Error('p and q must be different primes.');
    if (!message || message.length === 0) throw new Error('Type a message to encrypt.');
    if (message.length > 16) throw new Error('Keep the message to 16 characters.');

    const n = p * q;
    const phi = (p - 1n) * (q - 1n);
    if (gcd(e, phi) !== 1n || e <= 1n || e >= phi) {
        throw new Error(`e = ${e} is not valid: it must satisfy 1 < e < φ(n) and gcd(e, φ(n)) = 1.`);
    }

    const blocks = encodeMessage(message); // throws on non-ASCII
    const dWork = egcdSteps(e, phi);
    const d = modInverse(e, phi);
    const encrypted = blocks.map(({ char, code }) => {
        const work = modPowSteps(code, e, n);
        return { char, m: code, c: work.result, work };
    });
    const decrypted = encrypted.map(({ c }) => {
        const work = modPowSteps(c, d, n);
        return { c, m: work.result, work };
    });
    const recovered = decrypted
        .map(({ m }) => String.fromCodePoint(Number(m)))
        .join('');

    const k = (e * d - 1n) / phi; // e·d = k·φ(n) + 1

    const steps = [
        {
            id: 'choose-primes',
            act: 'keygen',
            title: 'Choose two primes',
            provenance: 'paper',
            sourceRefs: [{ key: 'RSA78', detail: '§VII.A' }],
            explanation:
                `Alice picks two prime numbers, p = ${p} and q = ${q}, and keeps both secret. ` +
                'The entire scheme rests on how hard it is to recover them later.',
            caveat: {
                provenance: 'pedagogical',
                text:
                    'Toy primes so you can follow every digit. The paper recommends primes of ~100 decimal digits; today NIST calls for moduli of 2048 bits or more.',
                sourceRefs: [
                    { key: 'RSA78', detail: '§VII.A' },
                    { key: 'NIST80057', detail: 'Table 2' },
                ],
            },
            kind: 'values',
            data: {
                values: [
                    { label: 'p', value: p },
                    { label: 'q', value: q },
                ],
            },
        },
        {
            id: 'compute-n',
            act: 'keygen',
            title: 'Multiply into the modulus',
            provenance: 'paper',
            sourceRefs: [{ key: 'RSA78', detail: '§IV' }],
            explanation:
                `n = p · q = ${p} × ${q} = ${n}. The modulus n is public; multiplying is instant, ` +
                'but undoing it — factoring n back into p and q — is the hard direction.',
            kind: 'values',
            data: {
                values: [{ label: 'n = p·q', value: n }],
            },
        },
        {
            id: 'compute-phi',
            act: 'keygen',
            title: 'Count what n cannot see',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'EULER1763', detail: 'totient theorem' },
                { key: 'RSA78', detail: '§V' },
            ],
            explanation:
                `Euler's totient φ(n) counts the integers below n that share no factor with it. ` +
                `Knowing the factorization makes it easy: φ(n) = (p−1)(q−1) = ${p - 1n} × ${q - 1n} = ${phi}. ` +
                'Without p and q, computing φ(n) is as hard as factoring.',
            caveat: {
                provenance: 'modern',
                text:
                    'The 1978 paper works with Euler\'s φ(n); modern PKCS #1 uses the Carmichael function λ(n) = lcm(p−1, q−1), which yields the smallest working d. Both satisfy the same congruence.',
                sourceRefs: [{ key: 'RFC8017', detail: '§3.1' }],
            },
            kind: 'values',
            data: {
                values: [{ label: 'φ(n) = (p−1)(q−1)', value: phi }],
            },
        },
        {
            id: 'choose-e',
            act: 'keygen',
            title: 'Pick the public exponent',
            provenance: 'paper',
            sourceRefs: [
                { key: 'RSA78', detail: '§VII.B' },
                { key: 'RFC8017', detail: '§3.1' },
            ],
            explanation:
                `Alice chooses e = ${e}, which must be coprime to φ(n) so that it can be inverted: ` +
                `gcd(${e}, ${phi}) = 1. Curiously, the paper picks the private exponent d first and derives e; ` +
                'practice flipped the order, fixing small e (today usually 65537) for fast encryption.',
            kind: 'values',
            data: {
                values: [
                    { label: 'e', value: e },
                    { label: 'gcd(e, φ(n))', value: gcd(e, phi) },
                ],
            },
        },
        {
            id: 'compute-d',
            act: 'keygen',
            title: 'Derive the private exponent',
            provenance: 'paper',
            sourceRefs: [
                { key: 'RSA78', detail: '§VII.D' },
                { key: 'KNUTH97', detail: '§4.5.2' },
            ],
            explanation:
                `The private exponent is the modular inverse d = e⁻¹ mod φ(n), found with the extended ` +
                `Euclidean algorithm — the same procedure the paper prescribes. Here d = ${d}, ` +
                `since e·d = ${e}·${d} ≡ 1 (mod ${phi}).`,
            kind: 'egcd',
            data: {
                rows: dWork.rows,
                d,
                e,
                phi,
            },
        },
        {
            id: 'publish-keys',
            act: 'keygen',
            title: 'Publish (e, n) — keep d secret',
            provenance: 'paper',
            sourceRefs: [
                { key: 'RSA78', detail: '§IV' },
                { key: 'DH76', detail: '§III' },
            ],
            explanation:
                `Alice publishes the public key (e, n) = (${e}, ${n}) for anyone — including Eve — to read. ` +
                `The private key d = ${d} never leaves her side. This is the public-key idea Diffie and Hellman ` +
                'proposed in 1976; RSA was its first practical realization.',
            kind: 'values',
            data: {
                values: [
                    { label: 'public key (e, n)', value: `(${e}, ${n})` },
                    { label: 'private key d', value: d },
                ],
            },
        },
        {
            id: 'encode-message',
            act: 'encrypt',
            title: 'Turn text into numbers',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'RSA78', detail: '§V' }],
            explanation:
                `Bob wants to send “${message}”. Each character becomes its character code, one block per ` +
                'character — every block must be smaller than n. The paper encoded text the same way in ' +
                'spirit (blank = 00, A = 01, …); we use the character codes your keyboard already speaks.',
            caveat: {
                provenance: 'modern',
                text:
                    'Real RSA never encrypts raw blocks: deterministic “textbook RSA” leaks repeated characters (see the identical blocks below, if any). PKCS #1 pads each message with randomness (OAEP).',
                sourceRefs: [
                    { key: 'RFC8017', detail: '§7.1' },
                    { key: 'KL2020', detail: 'Ch. 12' },
                ],
            },
            kind: 'blocks',
            data: {
                blocks: blocks.map(({ char, code }) => ({ from: char, to: code })),
            },
        },
        {
            id: 'encrypt',
            act: 'encrypt',
            title: 'Encrypt: c = mᵉ mod n',
            provenance: 'paper',
            sourceRefs: [
                { key: 'RSA78', detail: '§V, eq. (1)' },
                { key: 'KNUTH97', detail: '§4.6.3' },
            ],
            explanation:
                `Each block m is raised to the public exponent: c = mᵉ mod n. Bob needs only the public key. ` +
                `Computing m^${e} directly would blow up, so exponentiation runs by repeated squaring — ` +
                `the table shows every square-and-multiply move for the first character.`,
            kind: 'sqmul',
            data: {
                mapping: encrypted.map(({ char, m, c }) => ({ char, from: m, to: c })),
                focus: {
                    caption: `Square-and-multiply, m = ${encrypted[0].m} (“${encrypted[0].char}”), exponent e = ${e} = ${encrypted[0].work.bits}₂ (first block):`,
                    rows: encrypted[0].work.rows,
                    result: encrypted[0].c,
                },
            },
        },
        {
            id: 'send-ciphertext',
            act: 'encrypt',
            title: 'Send it in the open',
            provenance: 'paper',
            sourceRefs: [
                { key: 'RSA78', detail: '§I' },
                { key: 'DH76', detail: '§II' },
            ],
            explanation:
                `The ciphertext ${encrypted.map(({ c }) => c).join(' · ')} crosses the public channel. ` +
                'Eve sees every block and the public key — and still cannot read the message without ' +
                'factoring n.',
            kind: 'blocks',
            data: {
                blocks: encrypted.map(({ char, c }) => ({ from: char, to: c, masked: true })),
            },
        },
        {
            id: 'decrypt',
            act: 'decrypt',
            title: 'Decrypt: m = cᵈ mod n',
            provenance: 'paper',
            sourceRefs: [{ key: 'RSA78', detail: '§V, eq. (2)' }],
            explanation:
                `Alice raises each block to her private exponent: m = cᵈ mod n. Same operation Bob used — ` +
                `but with d = ${d}, which only she knows. The first block: ${decrypted[0].c}^${d} mod ${n} = ${decrypted[0].m}.`,
            kind: 'sqmul',
            data: {
                mapping: decrypted.map(({ c, m }, i) => ({
                    char: encrypted[i].char,
                    from: c,
                    to: m,
                })),
                focus: {
                    caption: `Square-and-multiply, c = ${decrypted[0].c}, exponent d = ${d} = ${decrypted[0].work.bits}₂ (first block):`,
                    rows: decrypted[0].work.rows,
                    result: decrypted[0].m,
                },
            },
        },
        {
            id: 'decode-message',
            act: 'decrypt',
            title: 'Numbers back to text',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'RSA78', detail: '§V' }],
            explanation: `The recovered blocks decode to “${recovered}” — the round trip is exact.`,
            kind: 'blocks',
            data: {
                blocks: decrypted.map(({ m }, i) => ({
                    from: m,
                    to: encrypted[i].char,
                })),
            },
        },
        {
            id: 'why-it-works',
            act: 'decrypt',
            title: 'Why decryption inverts encryption',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'EULER1763', detail: 'a^φ(n) ≡ 1' },
                { key: 'RSA78', detail: '§VI' },
            ],
            explanation:
                'Decryption computes (mᵉ)ᵈ = m^(e·d). Because d inverts e modulo φ(n), the exponent ' +
                'e·d is one more than a multiple of φ(n) — and Euler proved that m^φ(n) ≡ 1 (mod n) ' +
                'whenever gcd(m, n) = 1. The paper (§VI) extends the argument to every m.',
            kind: 'formula',
            data: {
                lines: [
                    `e·d = ${e} × ${d} = ${e * d} = ${k}·φ(n) + 1`,
                    `m^(e·d) = m^(${k}·φ(n) + 1) = (m^φ(n))^${k} · m`,
                    `≡ 1^${k} · m ≡ m (mod ${n})   [Euler's theorem]`,
                ],
            },
        },
        {
            id: 'security-note',
            act: 'decrypt',
            title: 'What keeps it secret',
            provenance: 'modern',
            sourceRefs: [
                { key: 'RSA78', detail: '§IX' },
                { key: 'NIST80057', detail: 'Table 2' },
                { key: 'KL2020', detail: 'Ch. 9' },
            ],
            explanation:
                `Everything public here — (e, n) and the ciphertext — would betray the message only if Eve ` +
                `could factor n = ${n}. At this toy size a laptop factors it instantly; at 2048 bits, ` +
                'no known classical algorithm finishes in the lifetime of the universe. The paper already ' +
                'framed security this way, and key-size guidance has been rising ever since.',
            kind: 'values',
            data: {
                values: [
                    { label: 'Eve sees', value: `(${e}, ${n}) + ciphertext` },
                    { label: 'Eve needs', value: `p, q — the factors of ${n}` },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: {
            p,
            q,
            n,
            phi,
            e,
            d,
            message,
            blocks,
            encrypted,
            decrypted,
            recovered,
        },
    };
}

// Suggest a default public exponent for a given φ: prefer 17 (the classic
// worked example), then 65537 (the modern default), then the smallest valid.
export function suggestPublicExponent(phi) {
    const options = validPublicExponents(phi);
    if (options.includes(17n)) return 17n;
    if (options.includes(65537n)) return 65537n;
    return options[0];
}
