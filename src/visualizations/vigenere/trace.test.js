import { describe, expect, it } from 'vitest';
import { buildVigenereTrace } from './trace';
import { decryptVigenere } from './model';

describe('buildVigenereTrace', () => {
    it('reproduces the classic example (ATTACK AT DAWN / LEMON)', () => {
        const { artifacts } = buildVigenereTrace({ message: 'ATTACK AT DAWN', key: 'LEMON' });
        // The textbook result LXFOPVEFRNHR, with our space convention.
        expect(artifacts.cipher).toBe('LXFOPV EF RNHR');
        expect(artifacts.decrypted).toBe('ATTACK AT DAWN');
    });

    it('round-trips arbitrary letter messages', () => {
        for (const [m, k] of [
            ['HELLO WORLD', 'KEY'],
            ['ZZZ ZZZ', 'AB'],
            ['THE QUICK BROWN FOX', 'CIPHER'],
        ]) {
            const { artifacts } = buildVigenereTrace({ message: m, key: k });
            expect(decryptVigenere(artifacts.cipher, artifacts.key)).toBe(artifacts.message);
        }
    });

    it('streams align + enc events exactly once, in order', () => {
        const { steps, artifacts } = buildVigenereTrace({ message: 'ABC DE', key: 'KEY' });
        const streamed = steps.flatMap((s) => s.stream?.events ?? []);
        expect(streamed).toEqual(artifacts.events);
        let applied = 0;
        for (const step of steps) {
            expect(step.data.eventBase).toBe(applied);
            applied += step.stream?.events.length ?? 0;
        }
    });

    it('sanitizes and validates input', () => {
        const { artifacts } = buildVigenereTrace({ message: 'attack, at dawn!', key: 'lemon5' });
        expect(artifacts.message).toBe('ATTACK AT DAWN');
        expect(artifacts.key).toBe('LEMON');
        expect(() => buildVigenereTrace({ message: '123', key: 'KEY' })).toThrow(/letters/);
        expect(() => buildVigenereTrace({ message: 'HI', key: '' })).toThrow(/keyword/i);
    });
});
