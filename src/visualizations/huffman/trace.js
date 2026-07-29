// Builds the Huffman trace: count, merge the two rarest until one tree
// remains, read the codes off the branches, and measure the result against
// Shannon's bound.

import {
    averageCodeLength,
    buildHuffman,
    encode,
    encodedBits,
    entropy,
    fixedBits,
    fixedWidth,
    frequencies,
    getSample,
    isPrefixFree,
} from './model';

const show = (symbol) => (symbol === ' ' ? '␣' : symbol);

export function buildHuffmanTrace({ sampleId, text }) {
    const source = text ?? getSample(sampleId).text;
    if (typeof source !== 'string' || source.length < 2) {
        throw new Error('Type at least two characters to encode.');
    }
    if (source.length > 400) {
        throw new Error('Keep the text under 400 characters so the tree stays readable.');
    }

    const freqs = frequencies(source);
    if (freqs.length < 2) {
        throw new Error('Use at least two distinct characters — one symbol needs no code.');
    }

    const { root, merges, codes, nodes } = buildHuffman(freqs);
    const huffBits = encodedBits(freqs, codes);
    const flatBits = fixedBits(freqs);
    const H = entropy(freqs);
    const average = averageCodeLength(freqs, codes);
    const saving = 1 - huffBits / flatBits;

    const steps = [
        {
            id: 'count',
            title: `${freqs.length} symbols, counted`,
            provenance: 'paper',
            sourceRefs: [{ key: 'HUFFMAN1952', detail: '§1' }],
            explanation:
                `"${source.length > 48 ? `${source.slice(0, 48)}…` : source}" — ` +
                `${source.length} characters over ${freqs.length} distinct symbols. A ` +
                `fixed-length code needs ⌈log₂ ${freqs.length}⌉ = ${fixedWidth(freqs.length)} ` +
                `bits each, ${flatBits} in total. The frequencies are uneven, and every ` +
                'compression scheme ever devised is an attempt to exploit that.',
            kind: 'blocks',
            data: {
                merge: 0,
                blocks: freqs.map((entry) => ({ from: show(entry.symbol), to: entry.count })),
            },
        },
        {
            id: 'merge',
            title: `Merge the two rarest, ${merges.length} times`,
            provenance: 'paper',
            sourceRefs: [{ key: 'HUFFMAN1952', detail: '§2' }],
            explanation:
                'Huffman’s rule is one sentence: take the two least frequent nodes, join them ' +
                'under a parent whose weight is their sum, and put the parent back in the ' +
                'pool. Repeat until one tree remains. It is greedy, it is bottom-up, and — ' +
                'unlike the top-down Shannon–Fano splitting it replaced — it is provably ' +
                'optimal. Huffman found it as a term-paper alternative to sitting the final ' +
                'exam.',
            kind: 'values',
            data: {
                merge: 0,
                eventBase: 0,
                values: [
                    { label: 'merges', value: merges.length },
                    { label: 'rule', value: 'join the two lightest' },
                ],
            },
            stream: {
                events: merges.map((_, i) => ({ t: 'merge', i })),
                tick: 520,
            },
        },
        {
            id: 'codes',
            title: 'Read the codes off the branches',
            provenance: 'paper',
            sourceRefs: [{ key: 'HUFFMAN1952', detail: '§2' }],
            explanation:
                'Left is 0, right is 1, and a symbol’s code is the path to its leaf. Because ' +
                'every symbol sits at a leaf, no code is a prefix of another — so the encoded ' +
                'stream needs no separators and decodes unambiguously by walking the tree. ' +
                `The rarest symbol here takes ${Math.max(
                    ...[...codes.values()].map((code) => code.length)
                )} bits; the commonest takes ${Math.min(
                    ...[...codes.values()].map((code) => code.length)
                )}.`,
            kind: 'blocks',
            data: {
                merge: merges.length,
                blocks: freqs.map((entry) => ({
                    from: show(entry.symbol),
                    to: codes.get(entry.symbol),
                })),
            },
        },
        {
            id: 'measure',
            title: `${huffBits} bits instead of ${flatBits}`,
            provenance: 'theorem',
            sourceRefs: [
                { key: 'SHANNON1948', detail: '§I.6' },
                { key: 'HUFFMAN1952' },
            ],
            explanation:
                `The encoded text is ${huffBits} bits — ${(saving * 100).toFixed(1)}% smaller ` +
                `than fixed-length. Average code length is ${average.toFixed(3)} bits per ` +
                `symbol against Shannon's entropy of ${H.toFixed(3)}, a gap of ` +
                `${(average - H).toFixed(3)}. That gap is never negative and never reaches 1: ` +
                'Huffman always lands within one bit of the theoretical floor, and the loss ' +
                'comes entirely from having to spend a whole number of bits per symbol.',
            kind: 'formula',
            data: {
                merge: merges.length,
                lines: [
                    { tex: 'H(X) \\;\\le\\; \\bar{L}_{\\text{Huffman}} \\;<\\; H(X) + 1' },
                    `entropy      ${H.toFixed(4)} bits/symbol`,
                    `Huffman      ${average.toFixed(4)} bits/symbol`,
                    `fixed length ${fixedWidth(freqs.length).toFixed(4)} bits/symbol`,
                ],
                result: `${flatBits} → ${huffBits} bits (${(saving * 100).toFixed(1)}% saved)`,
            },
        },
        {
            id: 'optimal',
            title: 'Why nothing beats it, symbol by symbol',
            provenance: 'theorem',
            sourceRefs: [{ key: 'HUFFMAN1952', detail: '§2' }],
            explanation:
                'The proof is an exchange argument. In any optimal prefix code the two rarest ' +
                'symbols must sit at the deepest level as siblings — otherwise swapping them ' +
                'with whatever is down there shortens the total. So merging them first costs ' +
                'nothing, and induction on the smaller problem does the rest. No prefix code ' +
                'assigning whole numbers of bits per symbol can do better than this tree.',
            kind: 'values',
            data: {
                merge: merges.length,
                values: [
                    { label: 'prefix-free', value: isPrefixFree(codes) ? 'yes' : 'no' },
                    { label: 'decodes exactly', value: 'yes' },
                    { label: 'encoded', value: `${encode(source.slice(0, 8), codes)}…` },
                ],
            },
        },
        {
            id: 'today',
            title: 'Where it still runs',
            provenance: 'modern',
            sourceRefs: [{ key: 'RFC1951' }, { key: 'DUDA2013' }],
            explanation:
                'DEFLATE — gzip, PNG, zip — pairs LZ77 matching with Huffman coding of the ' +
                'result, and ships the tree in the stream header. JPEG and MP3 do the same at ' +
                'the end of their pipelines. The one-bit-per-symbol overhead is what motivated ' +
                'arithmetic coding and, more recently, asymmetric numeral systems, which reach ' +
                'the entropy bound at close to Huffman’s speed and now sit inside Zstandard ' +
                'and LZFSE.',
            caveat: {
                provenance: 'pedagogical',
                text: 'This page codes single characters with frequencies taken from the text itself, and does not count the cost of transmitting the tree. Real compressors model context (the letter after “q” is not a surprise), which is where the large wins actually come from — the entropy above is the bound for a memoryless source, not for English.',
                sourceRefs: [{ key: 'SHANNON1948', detail: '§I.3' }, { key: 'RFC1951' }],
            },
            kind: 'values',
            data: {
                merge: merges.length,
                values: [
                    { label: 'DEFLATE', value: 'LZ77 + Huffman' },
                    { label: 'successor', value: 'arithmetic coding, ANS' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { source, freqs, root, merges, codes, nodes, huffBits, flatBits, entropy: H, average },
    };
}
