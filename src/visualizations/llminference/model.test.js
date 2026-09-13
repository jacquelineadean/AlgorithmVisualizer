import { describe, expect, it } from 'vitest';
import {
    ACCELERATORS,
    MODELS,
    arithmeticIntensity,
    balancedBatch,
    capacity,
    decode,
    deviceIntensity,
    getAccelerator,
    getModel,
    kvBytes,
    kvBytesPerToken,
    prefill,
    speculativeGain,
    weightBytes,
} from './model';
import { buildInferenceMap } from './map';
import { walkNodes } from '../drilldown/model';

describe('memory accounting', () => {
    it('weighs a 7B model at about 13.5 GiB in bf16', () => {
        const gib = weightBytes(getModel('7b')) / 1024 ** 3;
        expect(gib).toBeGreaterThan(12);
        expect(gib).toBeLessThan(13.5);
    });

    it('shrinks the KV cache by exactly the GQA sharing factor', () => {
        const mha = getModel('7b');
        const gqa = getModel('70b-gqa');
        expect(kvBytesPerToken(mha)).toBe(2 * 32 * 4096 * 2);
        // 8 KV heads out of 64 query heads: one eighth of the full-width cache.
        expect(kvBytesPerToken(gqa)).toBe((2 * 80 * 8192 * 2) / 8);
    });

    it('scales the cache linearly in tokens and batch', () => {
        const model = getModel('7b');
        expect(kvBytes(model, 100, 4)).toBe(kvBytes(model, 400, 1));
        expect(kvBytes(model, 200)).toBe(2 * kvBytes(model, 100));
    });

    it('leaves room for a sensible number of concurrent conversations', () => {
        const seats = capacity(getModel('7b'), getAccelerator('a100'), 4096);
        expect(seats).toBeGreaterThan(10);
        expect(seats).toBeLessThan(200);
    });
});

describe('the two phases', () => {
    it('makes prefill compute-bound and decode memory-bound', () => {
        for (const model of MODELS) {
            for (const device of ACCELERATORS) {
                const single = decode(model, device, { batch: 1, contextTokens: 1024 });
                // A decode step moves more bytes than it does useful FLOPs per byte.
                expect(arithmeticIntensity(1)).toBeLessThan(deviceIntensity(device));
                // And one step is fast in absolute terms but slow per FLOP.
                expect(single.secondsPerStep).toBeGreaterThan(0);
                expect(single.tokensPerSecond).toBeLessThan(200);
            }
        }
    });

    it('buys throughput from batching while per-user latency only worsens', () => {
        const model = getModel('7b');
        const device = getAccelerator('a100');
        const one = decode(model, device, { batch: 1, contextTokens: 1024 });
        const many = decode(model, device, { batch: 32, contextTokens: 1024 });
        expect(many.tokensPerSecond / one.tokensPerSecond).toBeGreaterThan(8);
        expect(many.perUserTokensPerSecond).toBeLessThan(one.perUserTokensPerSecond);
    });

    it('shows the KV cache, not the weights, capping the batching win', () => {
        const model = getModel('7b');
        const device = getAccelerator('a100');
        // With a short context the weight read dominates and batching is
        // nearly linear; with a long one the per-sequence cache reads take
        // over, which is exactly what paged and shared caches attack.
        const short = decode(model, device, { batch: 32, contextTokens: 64 });
        const long = decode(model, device, { batch: 32, contextTokens: 4096 });
        const shortGain =
            short.tokensPerSecond / decode(model, device, { batch: 1, contextTokens: 64 }).tokensPerSecond;
        const longGain =
            long.tokensPerSecond /
            decode(model, device, { batch: 1, contextTokens: 4096 }).tokensPerSecond;
        expect(shortGain).toBeGreaterThan(28);
        expect(longGain).toBeLessThan(shortGain / 2);
    });

    it('reports a plausible time to first token', () => {
        const { seconds } = prefill(getModel('7b'), getAccelerator('a100'), 1024);
        expect(seconds).toBeGreaterThan(0.02);
        expect(seconds).toBeLessThan(1.5);
    });

    it('finds the batch size where the device balances', () => {
        for (const device of ACCELERATORS) {
            const balanced = balancedBatch(device);
            expect(arithmeticIntensity(balanced)).toBeGreaterThanOrEqual(
                deviceIntensity(device) - 2
            );
        }
    });
});

describe('speculative decoding', () => {
    it('matches the Leviathan et al. expected-token formula', () => {
        expect(speculativeGain(4, 0)).toBeCloseTo(1, 12); // nothing accepted: one token
        expect(speculativeGain(4, 1)).toBeCloseTo(5, 12); // all accepted: k + 1
        expect(speculativeGain(4, 0.7)).toBeCloseTo((1 - 0.7 ** 5) / (1 - 0.7), 12);
    });

    it('is monotone in the acceptance rate', () => {
        let previous = 0;
        for (const alpha of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            const gain = speculativeGain(4, alpha);
            expect(gain).toBeGreaterThan(previous);
            previous = gain;
        }
    });
});

describe('buildInferenceMap', () => {
    it('reaches the serving techniques by path and validates the prompt', () => {
        const { root } = buildInferenceMap({
            modelId: '7b',
            deviceId: 'a100',
            promptTokens: 1024,
            batch: 16,
        });
        const paths = walkNodes(root).map(([node, ancestors]) => [...ancestors, node.id].join('.'));
        expect(paths).toContain('request.serving.paged-kv');
        expect(paths).toContain('request.prefill.kv-build');
        expect(paths).toContain('request.decode.batching-gain');
        expect(() =>
            buildInferenceMap({ modelId: '7b', deviceId: 'a100', promptTokens: 99999, batch: 1 })
        ).toThrow(/prompt must be/);
    });

    it('cites every node', () => {
        const { root } = buildInferenceMap({
            modelId: '70b-gqa',
            deviceId: 'h100',
            promptTokens: 2048,
            batch: 32,
        });
        for (const [node] of walkNodes(root)) {
            expect(node.sourceRefs?.length, node.id).toBeGreaterThan(0);
            expect(node.provenance, node.id).toBeTruthy();
        }
    });
});
