import { describe, expect, it } from 'vitest';
import {
    CONFIGS,
    attentionParams,
    getConfig,
    headDim,
    human,
    kvBytesPerToken,
    mlpParams,
    parameterBreakdown,
} from './model';
import { buildTransformerMap } from './map';
import { walkNodes } from '../drilldown/model';

// The map's whole claim is that its numbers are computed, not quoted — so
// the tests check them against the published totals.

describe('parameter accounting', () => {
    it('reproduces GPT-2 small’s 124M within the weight-matrix approximation', () => {
        const { total } = parameterBreakdown(getConfig('gpt2-small'));
        expect(total).toBeGreaterThan(120e6);
        expect(total).toBeLessThan(126e6);
    });

    it('reproduces GPT-2 XL’s 1.5B', () => {
        const { total } = parameterBreakdown(getConfig('gpt2-xl'));
        expect(total / 1e9).toBeGreaterThan(1.4);
        expect(total / 1e9).toBeLessThan(1.6);
    });

    it('reproduces a Llama-style 7B', () => {
        const { total } = parameterBreakdown(getConfig('llama-7b'));
        expect(total / 1e9).toBeGreaterThan(6.4);
        expect(total / 1e9).toBeLessThan(7.1);
    });

    it('sums its own parts', () => {
        for (const config of CONFIGS) {
            const p = parameterBreakdown(config);
            expect(p.embedding + p.positional + p.blocks + p.unembedding).toBe(p.total);
            expect(p.attention + p.mlp).toBe(p.blocks);
            expect(p.attention).toBe(config.layers * attentionParams(config));
            expect(p.mlp).toBe(config.layers * mlpParams(config));
        }
    });

    it('charges rotary models nothing for positions and gated MLPs a third more', () => {
        const llama = getConfig('llama-7b');
        const gpt2 = getConfig('gpt2-small');
        expect(parameterBreakdown(llama).positional).toBe(0);
        expect(parameterBreakdown(gpt2).positional).toBe(gpt2.context * gpt2.dModel);
        expect(mlpParams(llama)).toBe(3 * llama.dModel * llama.dFF);
        expect(mlpParams(gpt2)).toBe(2 * gpt2.dModel * gpt2.dFF);
    });

    it('divides the model dimension evenly across heads', () => {
        for (const config of CONFIGS) {
            expect(Number.isInteger(headDim(config)), config.id).toBe(true);
            expect(headDim(config) * config.heads).toBe(config.dModel);
        }
    });

    it('sizes the KV cache at 2 · layers · d_model · bytes per token', () => {
        const config = getConfig('llama-7b');
        expect(kvBytesPerToken(config)).toBe(2 * 32 * 4096 * 2);
        // A full 4,096-token context of KV is half a gigabyte at fp16.
        expect(kvBytesPerToken(config) * config.context / 1024 ** 3).toBeGreaterThan(1.9);
    });

    it('formats large numbers compactly', () => {
        expect(human(1.24e8)).toBe('124.0 M');
        expect(human(7e9)).toBe('7.00 B');
    });
});

describe('buildTransformerMap', () => {
    it('builds a tree deep enough to reach a single head, with unique paths', () => {
        const { root } = buildTransformerMap({ configId: 'gpt2-small' });
        const paths = walkNodes(root).map(([node, ancestors]) => [...ancestors, node.id].join('.'));
        expect(paths).toContain('model.block.attention.head');
        expect(paths).toContain('model.input.positions');
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('switches the position and MLP nodes with the configuration', () => {
        const gpt2 = buildTransformerMap({ configId: 'gpt2-small' }).root;
        const llama = buildTransformerMap({ configId: 'llama-7b' }).root;
        const find = (root, id) =>
            walkNodes(root).find(([node]) => node.id === id)[0];
        expect(find(gpt2, 'positions').title).toMatch(/Learned/);
        expect(find(llama, 'positions').title).toMatch(/Rotary/);
        expect(find(llama, 'mlp').title).toMatch(/SwiGLU/);
        expect(find(gpt2, 'norm').title).toMatch(/LayerNorm/);
        expect(find(llama, 'norm').title).toMatch(/RMSNorm/);
    });

    it('gives every node a citation and a provenance class', () => {
        for (const config of CONFIGS) {
            const { root } = buildTransformerMap({ configId: config.id });
            for (const [node] of walkNodes(root)) {
                expect(node.sourceRefs?.length, node.id).toBeGreaterThan(0);
                expect(node.provenance, node.id).toBeTruthy();
            }
        }
    });
});
