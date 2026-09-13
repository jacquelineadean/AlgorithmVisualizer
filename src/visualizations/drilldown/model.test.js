import { describe, expect, it } from 'vitest';
import { countNodes, findDuplicateChildIds, leafCount, pathOf, resolvePath, walkNodes } from './model';

const MAP = {
    id: 'pipeline',
    title: 'Pipeline',
    children: [
        { id: 'prefill', title: 'Prefill', children: [{ id: 'kv', title: 'KV cache' }] },
        { id: 'decode', title: 'Decode' },
    ],
};

describe('drill-down model', () => {
    it('walks every node with its ancestor chain', () => {
        const ids = walkNodes(MAP).map(([node, ancestors]) => [...ancestors, node.id].join('.'));
        expect(ids).toEqual([
            'pipeline',
            'pipeline.prefill',
            'pipeline.prefill.kv',
            'pipeline.decode',
        ]);
        expect(countNodes(MAP)).toBe(4);
        expect(leafCount(MAP)).toBe(2);
    });

    it('resolves a dot path below the root and round-trips it', () => {
        const chain = resolvePath(MAP, 'prefill.kv');
        expect(chain.map((node) => node.id)).toEqual(['pipeline', 'prefill', 'kv']);
        expect(pathOf(chain)).toBe('prefill.kv');
        expect(pathOf(resolvePath(MAP, ''))).toBe('');
    });

    it('stops at the deepest node that still exists (stale links degrade)', () => {
        expect(pathOf(resolvePath(MAP, 'prefill.gone.deeper'))).toBe('prefill');
        expect(pathOf(resolvePath(MAP, 'nope'))).toBe('');
    });

    it('flags sibling id collisions, which would make paths ambiguous', () => {
        expect(findDuplicateChildIds(MAP)).toEqual([]);
        const clashing = { id: 'r', children: [{ id: 'a' }, { id: 'a' }] };
        expect(findDuplicateChildIds(clashing)).toEqual(['r/a']);
    });
});
