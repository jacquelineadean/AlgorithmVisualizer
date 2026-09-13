import { describe, expect, it } from 'vitest';
import {
    SAMPLES,
    averageCodeLength,
    buildHuffman,
    decode,
    encode,
    encodedBits,
    entropy,
    fixedBits,
    frequencies,
    isPrefixFree,
    layout,
} from './model';
import { buildHuffmanTrace } from './trace';

const of = (text) => {
    const freqs = frequencies(text);
    return { freqs, ...buildHuffman(freqs) };
};

describe('frequencies', () => {
    it('counts every character exactly once', () => {
        const freqs = frequencies('mississippi');
        expect(freqs.reduce((sum, entry) => sum + entry.count, 0)).toBe(11);
        expect(new Map(freqs.map((e) => [e.symbol, e.count])).get('s')).toBe(4);
        expect(freqs.map((e) => e.count)).toEqual([...freqs.map((e) => e.count)].sort((a, b) => b - a));
    });
});

describe('the code', () => {
    it('is prefix-free and round-trips every sample', () => {
        for (const sample of SAMPLES) {
            const { root, codes } = of(sample.text);
            expect(isPrefixFree(codes), sample.id).toBe(true);
            expect(decode(encode(sample.text, codes), root)).toBe(sample.text);
        }
    });

    it('gives shorter codes to more frequent symbols', () => {
        const { freqs, codes } = of('the quick brown fox jumps over the lazy dog');
        for (const a of freqs) {
            for (const b of freqs) {
                if (a.count > b.count) {
                    expect(codes.get(a.symbol).length).toBeLessThanOrEqual(codes.get(b.symbol).length);
                }
            }
        }
    });

    it('is deterministic — the same text always builds the same tree', () => {
        expect([...of('abracadabra').codes.entries()]).toEqual([...of('abracadabra').codes.entries()]);
    });
});

describe('optimality', () => {
    it('lands within one bit of the entropy bound, and never below it', () => {
        for (const sample of SAMPLES) {
            const { freqs, codes } = of(sample.text);
            const H = entropy(freqs);
            const average = averageCodeLength(freqs, codes);
            expect(average, sample.id).toBeGreaterThanOrEqual(H - 1e-12);
            expect(average, sample.id).toBeLessThan(H + 1);
        }
    });

    it('beats fixed-length coding whenever the frequencies are uneven', () => {
        const { freqs, codes } = of('mississippi');
        expect(encodedBits(freqs, codes)).toBeLessThan(fixedBits(freqs));
    });

    it('saves nothing on a uniform distribution — and loses nothing either', () => {
        const { freqs, codes } = of('abcdefgh');
        expect(encodedBits(freqs, codes)).toBe(fixedBits(freqs));
        expect(averageCodeLength(freqs, codes)).toBeCloseTo(entropy(freqs), 10);
    });

    it('beats every other assignment of the same code lengths’ multiset', () => {
        // Swapping any two symbols' codes cannot improve the total.
        const { freqs, codes } = of('abracadabra');
        const best = encodedBits(freqs, codes);
        const symbols = freqs.map((entry) => entry.symbol);
        for (let i = 0; i < symbols.length; i++) {
            for (let j = i + 1; j < symbols.length; j++) {
                const swapped = new Map(codes);
                swapped.set(symbols[i], codes.get(symbols[j]));
                swapped.set(symbols[j], codes.get(symbols[i]));
                expect(encodedBits(freqs, swapped)).toBeGreaterThanOrEqual(best);
            }
        }
    });
});

describe('layout', () => {
    it('places every node, with the root at the top', () => {
        const { root, nodes } = of('mississippi');
        const positions = layout(root);
        expect(positions.size).toBe(nodes.length);
        expect(positions.get(root.id).y).toBe(0);
        for (const [, position] of positions) {
            expect(position.x).toBeGreaterThanOrEqual(0);
            expect(position.x).toBeLessThanOrEqual(1);
        }
    });
});

describe('buildHuffmanTrace', () => {
    it('streams one event per merge and validates the input', () => {
        const { steps, artifacts } = buildHuffmanTrace({ sampleId: 'mississippi' });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toHaveLength(artifacts.merges.length);
        expect(artifacts.merges).toHaveLength(artifacts.freqs.length - 1);
        expect(() => buildHuffmanTrace({ text: 'a' })).toThrow(/at least two characters/);
        expect(() => buildHuffmanTrace({ text: 'aaaa' })).toThrow(/distinct/);
        expect(() => buildHuffmanTrace({ text: 'ab'.repeat(300) })).toThrow(/400/);
    });
});
