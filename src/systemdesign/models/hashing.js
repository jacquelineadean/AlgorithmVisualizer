// Key placement for the Kafka and sharded-Postgres layers: Kafka's own
// murmur2 (a port of org.apache.kafka.common.utils.Utils.murmur2, held to
// Kafka's published test vectors in hashing.test.js), a Zipf-skewed key
// population, and three ways to map rows to nodes when one node is added.

const encoder = new TextEncoder();

export function murmur2(input) {
    const data = typeof input === 'string' ? encoder.encode(input) : input;
    const length = data.length;
    const m = 0x5bd1e995;
    const r = 24;
    let h = (0x9747b28c ^ length) | 0;
    const length4 = length >> 2;
    for (let i = 0; i < length4; i++) {
        const i4 = i * 4;
        let k = (data[i4] & 0xff) | ((data[i4 + 1] & 0xff) << 8) | ((data[i4 + 2] & 0xff) << 16) | ((data[i4 + 3] & 0xff) << 24);
        k = Math.imul(k, m);
        k ^= k >>> r;
        k = Math.imul(k, m);
        h = Math.imul(h, m);
        h ^= k;
    }
    const tail = length & ~3;
    switch (length & 3) {
        case 3:
            h ^= (data[tail + 2] & 0xff) << 16;
        // falls through
        case 2:
            h ^= (data[tail + 1] & 0xff) << 8;
        // falls through
        case 1:
            h ^= data[tail] & 0xff;
            h = Math.imul(h, m);
        // no default
    }
    h ^= h >>> 13;
    h = Math.imul(h, m);
    h ^= h >>> 15;
    return h | 0;
}

// Kafka's Utils.toPositive: mask the sign bit, then modulo.
export const toPositive = (h) => h & 0x7fffffff;
export const kafkaPartition = (key, partitions) => toPositive(murmur2(key)) % partitions;

/* --- Kafka hot-partition lab ------------------------------------------------ */

export const KAFKA_KEYS = 5000;
const keyName = (i) => `user-${i}`;
let keyHashes = null;
const hashesOfKeys = () => (keyHashes ??= Array.from({ length: KAFKA_KEYS }, (_, i) => toPositive(murmur2(keyName(i)))));
let saltHashes = null;
const hashesOfSalt = () => (saltHashes ??= Array.from({ length: 8 }, (_, j) => toPositive(murmur2(`user-0#${j}`))));

export const zipfWeights = (n, s) => Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, s));

// Share of traffic per partition when key k has popularity 1 / k^s.
export function partitionLoad({ partitions, skew, salt = false }) {
    const w = zipfWeights(KAFKA_KEYS, skew);
    const total = w.reduce((a, b) => a + b, 0);
    const load = new Array(partitions).fill(0);
    hashesOfKeys().forEach((h, i) => {
        if (i === 0 && salt) hashesOfSalt().forEach((hs) => (load[hs % partitions] += w[0] / 8));
        else load[h % partitions] += w[i];
    });
    const share = load.map((l) => l / total);
    const hottestShare = Math.max(...share);
    return {
        share,
        hottest: share.indexOf(hottestShare),
        hottestShare,
        fairShare: 1 / partitions,
        topKeyShare: w[0] / total,
        // The topic runs at the speed of its busiest consumer.
        effectivePartitions: 1 / hottestShare,
    };
}

// Going from N to N + 1 partitions: which keys change partition, and how
// much traffic they carry.
export function addPartition({ partitions, skew }) {
    const w = zipfWeights(KAFKA_KEYS, skew);
    const total = w.reduce((a, b) => a + b, 0);
    let keys = 0;
    let traffic = 0;
    hashesOfKeys().forEach((h, i) => {
        if (h % partitions !== h % (partitions + 1)) {
            keys++;
            traffic += w[i];
        }
    });
    return { keysMoved: keys / KAFKA_KEYS, trafficMoved: traffic / total };
}

/* --- Resharding lab ---------------------------------------------------------- */

export const RESHARD_ROWS = 20000;
let rowHashes = null;
const hashesOfRows = () => (rowHashes ??= Array.from({ length: RESHARD_ROWS }, (_, i) => murmur2(`row-${i}`)));

// A consistent-hashing ring with 100 virtual nodes per server.
export function ringOf(nodes, vnodes = 100) {
    const points = [];
    for (let j = 0; j < nodes; j++) {
        for (let v = 0; v < vnodes; v++) points.push([murmur2(`node-${j}-v${v}`) >>> 0, j]);
    }
    points.sort((a, b) => a[0] - b[0]);
    const pos = points.map((p) => p[0]);
    const owner = points.map((p) => p[1]);
    return (hash) => {
        let lo = 0;
        let hi = pos.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (pos[mid] < hash) lo = mid + 1;
            else hi = mid;
        }
        return owner[lo === pos.length ? 0 : lo];
    };
}

const ringCache = new Map();
const cachedRing = (n) => {
    if (!ringCache.has(n)) ringCache.set(n, ringOf(n));
    return ringCache.get(n);
};

// Add node N + 1 to an N-node cluster under three placement schemes.
export function reshard({ nodes, logicalShards }) {
    const N = nodes;
    const rows = hashesOfRows();
    const results = [];

    {
        const load = new Array(N + 1).fill(0);
        let moved = 0;
        let shuffled = 0;
        rows.forEach((h) => {
            const p = toPositive(h);
            if (p % N !== p % (N + 1)) {
                moved++;
                if (p % (N + 1) !== N) shuffled++;
            }
            load[p % (N + 1)]++;
        });
        results.push({ id: 'mod', name: 'Hash mod N', moved: moved / RESHARD_ROWS, shuffledBetweenOld: shuffled / RESHARD_ROWS, load });
    }
    {
        const before = cachedRing(N);
        const after = cachedRing(N + 1);
        const load = new Array(N + 1).fill(0);
        let moved = 0;
        let notToNew = 0;
        rows.forEach((h) => {
            const u = h >>> 0;
            const a = before(u);
            const b = after(u);
            if (a !== b) {
                moved++;
                if (b !== N) notToNew++;
            }
            load[b]++;
        });
        results.push({ id: 'ring', name: 'Consistent hashing ring', moved: moved / RESHARD_ROWS, shuffledBetweenOld: notToNew / RESHARD_ROWS, load });
    }
    {
        const S = logicalShards;
        const owner = Array.from({ length: S }, (_, i) => i % N);
        const count = new Array(N + 1).fill(0);
        owner.forEach((o) => count[o]++);
        const target = Math.floor(S / (N + 1));
        const movedShards = new Set();
        while (count[N] < target) {
            let busiest = 0;
            for (let j = 1; j < N; j++) if (count[j] > count[busiest]) busiest = j;
            let shard = -1;
            for (let i = S - 1; i >= 0; i--) {
                if (owner[i] === busiest && !movedShards.has(i)) {
                    shard = i;
                    break;
                }
            }
            owner[shard] = N;
            movedShards.add(shard);
            count[busiest]--;
            count[N]++;
        }
        const load = new Array(N + 1).fill(0);
        let moved = 0;
        rows.forEach((h) => {
            const shard = toPositive(h) % S;
            if (movedShards.has(shard)) moved++;
            load[owner[shard]]++;
        });
        results.push({ id: 'logical', name: `${S} logical shards, moved whole`, moved: moved / RESHARD_ROWS, shuffledBetweenOld: 0, load, shardsMoved: movedShards.size });
    }
    const mean = RESHARD_ROWS / (N + 1);
    return {
        ideal: 1 / (N + 1),
        schemes: results.map((r) => ({ ...r, busiestOverMean: Math.max(...r.load) / mean })),
    };
}
