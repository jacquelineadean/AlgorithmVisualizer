import { describe, it, expect } from 'vitest';
import { registerAlgorithm, getAlgorithm, listAlgorithms } from './index';

describe('algorithm registry', () => {
    it('exposes dijkstra by default', () => {
        expect(getAlgorithm('dijkstra').name).toBe("Dijkstra's Algorithm");
        expect(listAlgorithms().map((algorithm) => algorithm.id)).toContain('dijkstra');
    });

    it('accepts new algorithms that satisfy the interface', () => {
        const custom = { id: 'test-noop', name: 'No-op', run: () => [] };
        registerAlgorithm(custom);

        expect(getAlgorithm('test-noop')).toBe(custom);
        expect(listAlgorithms()).toContain(custom);
    });

    it('rejects algorithms missing required fields', () => {
        expect(() => registerAlgorithm({ id: 'bad' })).toThrow(/must provide/);
        expect(() => registerAlgorithm(null)).toThrow(/must provide/);
    });

    it('rejects duplicate ids', () => {
        expect(() => registerAlgorithm({ id: 'dijkstra', name: 'Copy', run: () => [] })).toThrow(
            /already registered/
        );
    });

    it('throws for unknown ids', () => {
        expect(() => getAlgorithm('missing')).toThrow(/Unknown algorithm/);
    });
});
