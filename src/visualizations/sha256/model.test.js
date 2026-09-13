import { describe, expect, it } from 'vitest';
import {
    Ch,
    H0,
    K,
    Maj,
    avalanche,
    blocksOf,
    compress,
    flipLastBit,
    hex,
    pad,
    schedule,
    sha256,
    toBytes,
} from './model';
import { buildSha256Trace } from './trace';

// The implementation is checked against FIPS 180-4's own published test
// vectors — if any operation is wrong, these fail immediately.

describe('published test vectors', () => {
    it('hashes "abc"', () => {
        expect(sha256('abc').digest).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
        );
    });

    it('hashes the empty string', () => {
        expect(sha256('').digest).toBe(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
    });

    it('hashes the two-block vector', () => {
        expect(
            sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq').digest
        ).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    });

    it('hashes a million characters’ worth of structure without drifting', () => {
        // Not the million-'a' vector (too slow for a unit test), but a long
        // multi-block message whose length crosses several block boundaries.
        const text = 'a'.repeat(1000);
        expect(sha256(text).digest).toBe(
            '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3'
        );
    });
});

describe('padding', () => {
    it('always lands on a whole number of 512-bit blocks', () => {
        for (const length of [0, 1, 54, 55, 56, 63, 64, 65, 119, 120]) {
            const padded = pad(new Array(length).fill(0x61));
            expect(padded.length % 64).toBe(0);
            expect(padded.length).toBeGreaterThan(length);
        }
    });

    it('appends the 0x80 marker and the bit length', () => {
        const padded = pad(toBytes('abc'));
        expect(padded).toHaveLength(64);
        expect(padded[3]).toBe(0x80);
        expect(padded[63]).toBe(24); // 3 bytes = 24 bits
    });

    it('gives messages of different lengths different padded forms', () => {
        expect(pad(toBytes('a')).length).toBe(64);
        expect(pad(toBytes('a'.repeat(56))).length).toBe(128);
    });
});

describe('the round function', () => {
    it('uses 64 constants and eight initial words', () => {
        expect(K).toHaveLength(64);
        expect(H0).toHaveLength(8);
        expect(hex(K[0])).toBe('428a2f98');
        expect(hex(H0[0])).toBe('6a09e667');
    });

    it('expands 16 schedule words into 64', () => {
        const block = blocksOf(pad(toBytes('abc')))[0];
        const w = schedule(block);
        expect(w).toHaveLength(64);
        expect(w.slice(0, 16)).toEqual(block);
    });

    it('records all 64 rounds and shifts the state as the standard says', () => {
        const block = blocksOf(pad(toBytes('abc')))[0];
        const { rounds } = compress(H0, block);
        expect(rounds).toHaveLength(64);
        for (let t = 1; t < 64; t++) {
            const previous = rounds[t - 1].state;
            const current = rounds[t].state;
            // b, c, d and f, g, h are the previous a, b, c and e, f, g.
            expect(current.slice(1, 4)).toEqual(previous.slice(0, 3));
            expect(current.slice(5, 8)).toEqual(previous.slice(4, 7));
        }
    });

    it('implements Ch and Maj as bit selection and majority vote', () => {
        expect(Ch(0xffffffff, 0xaaaaaaaa, 0x55555555) >>> 0).toBe(0xaaaaaaaa);
        expect(Ch(0, 0xaaaaaaaa, 0x55555555) >>> 0).toBe(0x55555555);
        expect(Maj(0xff00ff00, 0xff00ff00, 0x00000000) >>> 0).toBe(0xff00ff00);
        expect(Maj(0xffffffff, 0x00000000, 0x00000000) >>> 0).toBe(0);
    });
});

describe('avalanche', () => {
    it('changes about half the output bits for a one-bit input change', () => {
        for (const message of ['abc', 'hello world', 'the quick brown fox']) {
            const { fraction } = avalanche(message, flipLastBit(message));
            expect(fraction).toBeGreaterThan(0.35);
            expect(fraction).toBeLessThan(0.65);
        }
    });

    it('flips exactly one input bit', () => {
        const before = toBytes('abc');
        const after = toBytes(flipLastBit('abc'));
        let differing = 0;
        for (let i = 0; i < before.length; i++) {
            let diff = before[i] ^ after[i];
            while (diff) {
                differing += diff & 1;
                diff >>= 1;
            }
        }
        expect(differing).toBe(1);
    });
});

describe('buildSha256Trace', () => {
    it('streams all 64 rounds and validates the message length', () => {
        const { steps, artifacts } = buildSha256Trace({ message: 'abc' });
        expect(steps.flatMap((step) => step.stream?.events ?? [])).toHaveLength(64);
        expect(artifacts.digest).toBe(sha256('abc').digest);
        expect(() => buildSha256Trace({ message: 'x'.repeat(201) })).toThrow(/200/);
        expect(() => buildSha256Trace({ message: 5 })).toThrow(/Type a message/);
    });
});
