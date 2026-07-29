import { describe, expect, it } from 'vitest';
import {
    OPTIMIZER_BYTES,
    RUNS,
    chinchillaParams,
    chinchillaTokens,
    getCluster,
    getRun,
    learningRate,
    runTime,
    stateBytes,
    stepFlops,
    stepsInRun,
    trainingFlops,
    zeroBytes,
} from './model';
import { buildTrainingMap } from './map';
import { walkNodes } from '../drilldown/model';

describe('compute accounting', () => {
    it('uses the 6ND rule and splits it 1 : 2 forward to backward', () => {
        expect(trainingFlops(1e9, 1e12)).toBe(6e21);
        expect(stepFlops(1e9, 1e6)).toBe(6e15);
    });

    it('puts a 7B run on 256 A100s in a plausible number of days', () => {
        const { days, gpuHours } = runTime(getRun('llama-7b'), getCluster('256xa100'), 0.45);
        expect(days).toBeGreaterThan(1);
        expect(days).toBeLessThan(30);
        expect(gpuHours).toBeGreaterThan(1e4);
    });

    it('gets faster with more or better devices, in proportion', () => {
        const run = getRun('llama-7b');
        const small = runTime(run, getCluster('8xa100'), 0.45).seconds;
        const big = runTime(run, getCluster('256xa100'), 0.45).seconds;
        expect(small / big).toBeCloseTo(32, 5);
    });

    it('counts steps from the token budget', () => {
        for (const run of RUNS) {
            expect(stepsInRun(run)).toBe(Math.round(run.tokens / run.batchTokens));
        }
    });
});

describe('memory accounting', () => {
    it('charges 16 bytes per parameter for mixed-precision AdamW', () => {
        expect(Object.values(OPTIMIZER_BYTES).reduce((a, b) => a + b, 0)).toBe(16);
        expect(stateBytes(1e9)).toBe(16e9);
    });

    it('shards monotonically across ZeRO stages', () => {
        const params = 7e9;
        const shards = 64;
        const stages = [0, 1, 2, 3].map((stage) => zeroBytes(params, shards, stage));
        for (let i = 1; i < stages.length; i++) {
            expect(stages[i]).toBeLessThan(stages[i - 1]);
        }
        // Stage 3 shards everything: total state divided by the shard count.
        expect(stages[3]).toBeCloseTo(stateBytes(params) / shards, 5);
        // With one shard, no stage saves anything.
        expect(zeroBytes(params, 1, 3)).toBeCloseTo(zeroBytes(params, 1, 0), 5);
    });
});

describe('scaling laws', () => {
    it('places the compute-optimal point at 20 tokens per parameter', () => {
        expect(chinchillaTokens(7e9)).toBe(1.4e11);
        expect(chinchillaParams(1.4e12)).toBe(7e10);
    });

    it('recognizes the 7B run as trained well past compute-optimal', () => {
        const run = getRun('llama-7b');
        expect(run.tokens / chinchillaTokens(run.params)).toBeGreaterThan(8);
    });

    it('recognizes the 70B run as sitting at the Chinchilla point', () => {
        const run = getRun('chinchilla-70b');
        expect(run.tokens / chinchillaTokens(run.params)).toBeCloseTo(1, 1);
    });
});

describe('learning-rate schedule', () => {
    it('warms up linearly and decays to the floor', () => {
        const options = { total: 1000, warmup: 100, peak: 3e-4, floor: 0.1 };
        expect(learningRate(0, options)).toBe(0);
        expect(learningRate(50, options)).toBeCloseTo(1.5e-4, 10);
        expect(learningRate(100, options)).toBeCloseTo(3e-4, 10);
        expect(learningRate(1000, options)).toBeCloseTo(3e-5, 10);
    });

    it('peaks exactly once, at the end of warmup', () => {
        const options = { total: 500, warmup: 40 };
        let best = { step: -1, rate: -1 };
        for (let step = 0; step <= 500; step++) {
            const rate = learningRate(step, options);
            if (rate > best.rate) best = { step, rate };
        }
        expect(best.step).toBe(40);
    });
});

describe('buildTrainingMap', () => {
    it('exposes the parallelism strategies as addressable nodes', () => {
        const { root } = buildTrainingMap({ runId: 'llama-7b', clusterId: '256xa100', mfu: 0.45 });
        const paths = walkNodes(root).map(([node, ancestors]) => [...ancestors, node.id].join('.'));
        expect(paths).toContain('loop.parallel.zero');
        expect(paths).toContain('loop.optimizer.precision');
        expect(paths).toContain('loop.budget');
    });

    it('cites every node and validates utilization', () => {
        const { root } = buildTrainingMap({ runId: 'gpt2-xl', clusterId: '8xa100', mfu: 0.3 });
        for (const [node] of walkNodes(root)) {
            expect(node.sourceRefs?.length, node.id).toBeGreaterThan(0);
            expect(node.provenance, node.id).toBeTruthy();
        }
        expect(() =>
            buildTrainingMap({ runId: 'gpt2-xl', clusterId: '8xa100', mfu: 0 })
        ).toThrow(/utilization/);
    });
});
