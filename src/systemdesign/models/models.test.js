import { describe, expect, it } from 'vitest';
import {
    SERVING_GPUS,
    SERVING_MODELS,
    batchPoint,
    estimateFleet,
    kvBytesPerToken,
    serving,
} from './serving';
import { addPartition, kafkaPartition, murmur2, partitionLoad, reshard, toPositive } from './hashing';
import { breadthClock, kvGeometry, kvLayouts, ladderRatio, quorum } from './fundamentals';
import {
    DEEPSEEK_V3,
    KV_MODELS,
    PROMPT_BEST,
    PROMPT_START,
    billCut,
    decodeStep,
    DECODE_SETUPS,
    deepseekDay,
    endToEnd,
    kvFootprint,
    kvModel,
    prefixMatch,
    promptCacheMatch,
    ridgePoint,
    roofline,
    selfHostedCostPerMillion,
    singleUserTokensPerSecond,
    minDecodeStep,
} from './inference';
import { attentionTraffic, batchRace, deploySeries, gatewaySim, launchTimeline, prefillDecode } from './sims';

// Every number a system page states is computed here and pinned to the
// value its source publishes. If a model change moves one, the page and
// this file disagree loudly.

describe('Kafka murmur2', () => {
    // Kafka's own vectors, from clients/src/test/java/.../utils/UtilsTest.java.
    it('matches the published test vectors', () => {
        expect(murmur2('21')).toBe(-973932308);
        expect(murmur2('foobar')).toBe(-790332482);
        expect(murmur2('a-little-bit-long-string')).toBe(-985981536);
        expect(murmur2('a-little-bit-longer-string')).toBe(-1486304829);
        expect(murmur2('lkjh234lh9fiuh90y23oiuhsafujhadof229phr9h19h89h8')).toBe(-58897971);
        expect(murmur2(new Uint8Array([97, 98, 99]))).toBe(479470107);
    });

    it('maps a key to toPositive(murmur2) mod N', () => {
        expect(toPositive(-1)).toBe(0x7fffffff);
        expect(kafkaPartition('foobar', 12)).toBe(toPositive(-790332482) % 12);
    });

    it('cannot fix a hot key by adding partitions, and salting spreads it', () => {
        const plain = partitionLoad({ partitions: 12, skew: 1.1 });
        const salted = partitionLoad({ partitions: 12, skew: 1.1, salt: true });
        const wider = partitionLoad({ partitions: 48, skew: 1.1 });
        expect(plain.topKeyShare).toBeGreaterThan(plain.fairShare);
        expect(wider.hottestShare).toBeGreaterThanOrEqual(plain.topKeyShare);
        expect(salted.hottestShare).toBeLessThan(plain.hottestShare);
        expect(plain.share.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    });

    it('remaps about N / (N + 1) of keys when a partition is added', () => {
        const { keysMoved } = addPartition({ partitions: 12, skew: 1 });
        expect(keysMoved).toBeGreaterThan(0.85);
        expect(keysMoved).toBeLessThan(0.97);
    });
});

describe('resharding', () => {
    const { ideal, schemes } = reshard({ nodes: 4, logicalShards: 32 });
    const [mod, ring, logical] = schemes;

    it('hash mod N moves most rows, the ring moves about 1 / (N + 1)', () => {
        expect(ideal).toBeCloseTo(0.2, 10);
        expect(mod.moved).toBeGreaterThan(0.75);
        expect(ring.moved).toBeGreaterThan(0.12);
        expect(ring.moved).toBeLessThan(0.3);
        expect(ring.shuffledBetweenOld).toBe(0);
    });

    it('moves whole logical shards, and only onto the new node', () => {
        expect(logical.shardsMoved).toBe(Math.floor(32 / 5));
        expect(logical.moved).toBeCloseTo(6 / 32, 1);
        expect(logical.load.reduce((a, b) => a + b, 0)).toBe(20000);
    });
});

describe('serving arithmetic', () => {
    it('sizes KV per token from the config: 128 KiB for Llama 3 8B, 800 KiB for Llama 2 13B', () => {
        expect(kvBytesPerToken(SERVING_MODELS.l8)).toBe(128 * 1024);
        expect(kvBytesPerToken(SERVING_MODELS.l13)).toBe(800 * 1024);
        expect(kvBytesPerToken(SERVING_MODELS.l13) / kvBytesPerToken(SERVING_MODELS.l8)).toBe(6.25);
    });

    it('fits about 467,000 tokens, 29,200 blocks, next to Llama 3 8B on one H100', () => {
        const { tokens, blocks } = kvGeometry();
        expect(tokens).toBe(467295);
        expect(blocks).toBe(29205);
    });

    it('splits 70B across GPUs and keeps 8B on one', () => {
        expect(serving(SERVING_MODELS.l8, SERVING_GPUS.h100, 1000).tp).toBe(1);
        expect(serving(SERVING_MODELS.l70, SERVING_GPUS.h100, 1000).tp).toBe(4);
    });

    it("applies Little's law from users to GPUs", () => {
        const est = estimateFleet({
            model: SERVING_MODELS.l8,
            gpu: SERVING_GPUS.h100,
            users: 1e6,
            requestsPerUser: 10,
            peakFactor: 3,
            promptTokens: 1000,
            outputTokens: 300,
            tokensPerSecond: 30,
        });
        expect(est.peakRate).toBeCloseTo((1e7 / 86400) * 3, 6);
        expect(est.concurrency).toBeCloseTo(est.peakRate * est.timeInSystem, 6);
        expect(est.ok).toBe(true);
        expect(est.gpus).toBe(est.replicas * est.tp);
        expect(est.replicas).toBe(Math.ceil(est.concurrency / est.perReplica));
    });

    it('rides memory bandwidth at small batches', () => {
        const one = batchPoint(SERVING_MODELS.l8, SERVING_GPUS.h100, 2000, 1);
        const many = batchPoint(SERVING_MODELS.l8, SERVING_GPUS.h100, 2000, 64);
        expect(one.bound).toBe('memory bandwidth');
        expect(many.total).toBeGreaterThan(30 * one.total);
        expect(many.perStream).toBeLessThan(one.perStream);
    });
});

describe('PagedAttention layouts', () => {
    const L = kvLayouts();
    it('pages hold more requests than reservations, and a shared prefix holds more still', () => {
        expect(L.reserve.requests).toBe(Math.floor(L.blocks / 128));
        expect(L.paged.requests).toBeGreaterThan(1.25 * L.reserve.requests);
        expect(L.shared.requests).toBeGreaterThan(2 * L.paged.requests);
        expect(L.paged.utilization).toBeGreaterThan(0.96);
        expect(L.reserve.utilization).toBeLessThan(0.8);
        expect(L.sharedFull).toBe(62);
        expect(L.sharedTail).toBe(8);
    });
});

describe('quorums, ladder, clock', () => {
    it('overlaps reads and writes exactly when R + W > N', () => {
        expect(quorum(3, 2, 2).readsSeeLatestWrite).toBe(true);
        expect(quorum(3, 1, 1).readsSeeLatestWrite).toBe(false);
        expect(quorum(3, 3, 1)).toMatchObject({ overlap: 1, writesSurviveDown: 0, readsSurviveDown: 2 });
    });

    it('keeps the ladder ratios the text quotes', () => {
        expect(ladderRatio('Main memory reference', 'Round trip within one datacenter')).toBeCloseTo(5000, 6);
        expect(ladderRatio('Round trip within one datacenter', 'California to Netherlands and back')).toBeCloseTo(300, 6);
    });

    it('runs out of depth as breadth grows', () => {
        expect(breadthClock(4)).toMatchObject({ remaining: 24, perDive: 12, depth: 5 });
        expect(breadthClock(12).depth).toBe(3);
        expect(breadthClock(20)).toMatchObject({ remaining: 0, depth: 1 });
    });
});

describe('inference stack numbers', () => {
    it('puts the H100 ridge point near 295 FLOPs per byte', () => {
        expect(Math.round(ridgePoint())).toBe(295);
        expect(roofline(1).memoryBound).toBe(true);
        expect(roofline(400).memoryBound).toBe(false);
    });

    it('caps one user of an 8B model at 209 tokens/s after a 4.8 ms step', () => {
        expect(minDecodeStep() * 1000).toBeCloseTo(4.776, 3);
                expect(Math.round(singleUserTokensPerSecond())).toBe(209);
    });

    it('computes KV per token from model shape, matching the published table', () => {
        expect(kvModel('l8').bytes).toBe(131072);
        expect(kvModel('l70').bytes).toBe(327680);
        expect(kvModel('q72').bytes).toBe(327680);
        expect(kvModel('l405').bytes).toBe(516096);
        expect(kvModel('dsv3').bytes).toBe(70272);
        expect(KV_MODELS.length).toBe(5);
        expect(kvFootprint('l70', 32768, 16).gpus).toBeCloseTo((327680 * 32768 * 16) / 80e9, 9);
    });

    it('adds TPOT for every token after the first', () => {
        expect(endToEnd(500, 30, 300)).toBe(500 + 299 * 30);
    });

    it('prices a decode step from the datasheet', () => {
        const r = decodeStep(DECODE_SETUPS[0], { batch: 1, ctx: 2048 });
        expect(r.memoryBound).toBe(true);
        expect(r.fits).toBe(true);
        const big = decodeStep(DECODE_SETUPS[0], { batch: 512, ctx: 32768 });
        expect(big.fits).toBe(false);
        expect(selfHostedCostPerMillion(2, 1, r.tps)).toBeCloseTo(r.costPerMillion, 9);
    });

    it('matches the cache only up to the first changing part', () => {
        const worst = promptCacheMatch(PROMPT_START);
        const best = promptCacheMatch(PROMPT_BEST);
        expect(worst.hit).toBe(0);
        expect(worst.cost).toBe(1);
        expect(best.broken.id).toBe('time');
        expect(best.share).toBeCloseTo(13400 / 13540, 10);
        expect(prefixMatch('ts').hit).toBe(0);
        expect(prefixMatch('a4').hit).toBe(3000 + 20000 + 400 + 400);
    });

    it('applies the three bill levers in order', () => {
        const r = billCut({ bill: 1000, inputShare: 0.5, cacheHit: 1, routed: 0, batchable: 0 });
        expect(r.afterBatch).toBeCloseTo(550, 9);
        const all = billCut({ bill: 1000, inputShare: 0.5, cacheHit: 0, routed: 1, batchable: 1 });
        expect(all.afterBatch).toBeCloseTo((1000 / 12) * 0.5, 9);
    });

    it("reproduces DeepSeek's published day", () => {
        const d = deepseekDay();
        expect(Math.round(d.cost)).toBe(87072);
        expect(Math.round(d.margin * 100)).toBe(545);
        expect((d.cacheHitShare * 100).toFixed(1)).toBe('56.3');
        expect(d.inputPerOutput.toFixed(1)).toBe('3.6');
        expect(Math.round(DEEPSEEK_V3.totalParams / DEEPSEEK_V3.activeParams)).toBe(18);
        expect((kvModel('l405').bytes / kvModel('dsv3').bytes).toFixed(1)).toBe('7.3');
    });
});

describe('mechanism simulations', () => {
    it('finishes more requests with continuous batching', () => {
        const [stat, cont] = batchRace(240);
        expect(cont.done).toBeGreaterThan(stat.done);
        expect(cont.utilization).toBeGreaterThan(stat.utilization);
    });

    it('shortens the longest token pause with chunked prefill and split pools', () => {
        const one = prefillDecode('one-pool');
        const chunked = prefillDecode('chunked');
        const split = prefillDecode('split');
        expect(one.longestGap).toBeGreaterThanOrEqual(7);
        expect(chunked.longestGap).toBeLessThan(2);
        expect(split.longestGap).toBe(1);
        expect(split.pools).toBe(2);
    });

    it('removes launch gaps with fusion and graphs', () => {
        const eager = launchTimeline('eager');
        const graph = launchTimeline('graph');
        expect(eager.busy).toBeLessThan(0.4);
        expect(graph.busy).toBeGreaterThan(0.7);
        expect(graph.end).toBeLessThan(eager.end);
    });

    it('grows standard attention traffic with the square of the prompt', () => {
        expect(attentionTraffic(8).standard / attentionTraffic(4).standard).toBe(4);
        expect(attentionTraffic(8).flash).toBe(0);
    });

    it('bills retries when the large model is down, and routing cuts spend', () => {
        const base = gatewaySim({ rate: 5, smallShare: 30, largeDown: false });
        const down = gatewaySim({ rate: 5, smallShare: 30, largeDown: true });
        const routed = gatewaySim({ rate: 5, smallShare: 80, largeDown: false });
        expect(base.retries).toBe(0);
        expect(down.retries).toBeGreaterThan(0);
        expect(down.spendPerMinute).toBeGreaterThan(base.spendPerMinute);
        expect(routed.spendPerMinute).toBeLessThan(base.spendPerMinute);
        const flood = gatewaySim({ rate: 12, smallShare: 0, largeDown: false });
        expect(flood.maxWaiting).toBeGreaterThan(base.maxWaiting);
    });

    it('moves only cache hits and first-token latency on a template deploy', () => {
        const s = deploySeries([[10, 'deploy'], [40, 'rollback']]);
        const at = (t) => s.find((p) => p.t === t);
        expect(at(35).hit).toBeLessThan(0.2);
        expect(at(35).ttft).toBeGreaterThan(0.6);
        expect(at(60).hit).toBeGreaterThan(0.7);
        expect(s.every((p) => p.errors === 0)).toBe(true);
    });
});
