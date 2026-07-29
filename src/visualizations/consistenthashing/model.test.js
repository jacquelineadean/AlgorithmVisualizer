import { describe, expect, it } from 'vitest';
import {
    assign,
    hash32,
    imbalance,
    makeKeys,
    moduloMovedFraction,
    movedFraction,
    ownerOf,
    ringPoints,
} from './model';
import { buildHashingTrace } from './trace';

const servers = (n) => Array.from({ length: n }, (_, i) => `node-${i + 1}`);

describe('the hash', () => {
    it('is deterministic and spread across the 32-bit range', () => {
        expect(hash32('key-1')).toBe(hash32('key-1'));
        expect(hash32('key-1')).not.toBe(hash32('key-2'));
        const values = makeKeys(2000).map((key) => key.at);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        expect(mean).toBeGreaterThan(0.45);
        expect(mean).toBeLessThan(0.55);
    });
});

describe('ring assignment', () => {
    it('sends every key to the first point clockwise, wrapping at the top', () => {
        const points = ringPoints(servers(4), 3);
        for (const key of makeKeys(300)) {
            const owner = ownerOf(key.at, points);
            const successor = points.find((point) => point.at >= key.at) ?? points[0];
            expect(owner).toBe(successor.server);
        }
    });

    it('assigns every key exactly once', () => {
        const keys = makeKeys(500);
        const { owners, load } = assign(keys, servers(5), 10);
        expect(owners.size).toBe(keys.length);
        expect([...load.values()].reduce((a, b) => a + b, 0)).toBe(keys.length);
    });
});

describe('the property that matters', () => {
    it('moves far fewer keys than modulo hashing when a server joins', () => {
        const keys = makeKeys(1000);
        for (const n of [3, 4, 8]) {
            const before = servers(n);
            const after = [...before, `node-${n + 1}`];
            const ring = movedFraction(keys, before, after, 40);
            const modulo = moduloMovedFraction(keys, before, after);
            expect(ring).toBeLessThan(modulo / 2);
            // And close to the unavoidable minimum of 1/(n+1).
            expect(ring).toBeLessThan(2.5 / (n + 1));
        }
    });

    it('keeps modulo hashing catastrophic, as the first step claims', () => {
        const keys = makeKeys(1000);
        const moved = moduloMovedFraction(keys, servers(4), servers(5));
        expect(moved).toBeGreaterThan(0.7);
    });

    it('moves nothing when the server set does not change', () => {
        const keys = makeKeys(400);
        expect(movedFraction(keys, servers(4), servers(4), 20)).toBe(0);
    });

    it('never touches a key whose owner is unaffected by the new arc', () => {
        const keys = makeKeys(600);
        const before = servers(4);
        const after = [...before, 'node-5'];
        const a = assign(keys, before, 1).owners;
        const b = assign(keys, after, 1).owners;
        for (const key of keys) {
            if (a.get(key.name) !== b.get(key.name)) {
                // The only permitted destination is the newcomer.
                expect(b.get(key.name)).toBe('node-5');
            }
        }
    });
});

describe('virtual nodes', () => {
    it('flatten the load: more tokens, lower peak-to-average', () => {
        const keys = makeKeys(2000);
        const one = imbalance(assign(keys, servers(6), 1).load).peak;
        const many = imbalance(assign(keys, servers(6), 100).load).peak;
        expect(many).toBeLessThan(one);
        expect(many).toBeLessThan(1.35);
    });
});

describe('buildHashingTrace', () => {
    it('reports both movement figures and validates inputs', () => {
        const { artifacts } = buildHashingTrace({ servers: 4, keys: 400, replicas: 1 });
        expect(artifacts.moved).toBeLessThan(artifacts.modulo);
        expect(artifacts.ideal).toBeCloseTo(1 / 5, 10);
        expect(() => buildHashingTrace({ servers: 1, keys: 100, replicas: 1 })).toThrow(/2 and 12/);
        expect(() => buildHashingTrace({ servers: 4, keys: 100, replicas: 0 })).toThrow(/virtual/);
    });
});
