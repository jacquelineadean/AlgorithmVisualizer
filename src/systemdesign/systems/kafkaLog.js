import { defineSystem } from '../model';
import { addPartition, KAFKA_KEYS, partitionLoad } from '../models/hashing';
import { pct } from '../labs/kit';
import { DEPTH_LAYERS, DEPTH_TEXT } from './fundamentalsData';

// Numbers quoted in the text, computed from the same model the lab runs.
const HOT = partitionLoad({ partitions: 12, skew: 1.1 });
const GROW = addPartition({ partitions: 12, skew: 1.1 });
const T = DEPTH_TEXT['kafka-log'];


export default defineSystem({
    id: 'kafka-log',
    category: 'fundamentals',
    name: 'Kafka log',
    kicker: 'Component, five layers deep',
    summary: 'A partitioned, replicated, append-only log, and how to choose its partition count, key and acks.',
    intro: 'The log a design adds for replay and fan-out, from its role down to broker settings.',
    overview: {
        title: 'One box, five layers down',
        sections: [
            {
                id: 'where',
                label: 'Where it sits',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'KAFKA_DESIGN' }],
                blocks: [
                    {
                        kind: 'prose',
                        paras: [
                            'In the [chat-serving design](/systems/chat-serving/usage), billing, analytics and abuse detection each read the gateway’s per-request usage records at their own pace.',
                        ],
                    },
                    {
                        kind: 'lab',
                        lab: 'depth-strata',
                        props: { only: ['kafka-log'] },
                        title: 'Step through the layers',
                        sub: 'Press a layer to read its one-paragraph summary, then follow the link to open it.',
                    },
                ],
            },
            {
                id: 'layers',
                label: 'The five layers',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_MODELS' }, { key: 'KAFKA_DOCS' }],
                blocks: [
                    { kind: 'layers' },
                    {
                        kind: 'prose',
                        paras: [
                            'The same five layers apply to any component in a design. [Four Mental Models](/systems/mental-models/m3) explains when to go down them and how far.',
                        ],
                    },
                ],
            },
        ],
    },
    layers: [
        {
            id: 'd1',
            code: 'D1',
            name: DEPTH_LAYERS[0],
            title: 'A durable, ordered log between producers and every consumer',
            lede: T[0],
            sections: [
                {
                    id: 'versus',
                    label: 'Log or queue',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'tradeoffs',
                            props: { only: ['queue-log'] },
                            title: 'Queue or append-only log',
                            sub: 'Compare a queue and a log for who may read each message and for how long.',
                        },
                    ],
                },
                {
                    id: 'spec',
                    label: 'Spec sheet',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'spec',
                            owns: 'Ordered, durable, replayable history for each topic, kept for a set time or size.',
                            neighbors: 'Producers append records, and consumer groups read from their own offsets. Stream processors read one topic and write another.',
                            pattern: 'A database write-ahead log, offered as a service: every reader replays the same sequence of records.',
                            metrics: ['Consumer lag per partition', 'Under-replicated partitions', 'Produce latency at p99', 'Bytes in and out per broker'],
                            knobs: ['Partition count', 'Replication factor and `min.insync.replicas`', 'Producer `acks`', 'Retention by time or size, or log compaction'],
                            failures: ['A hot partition from a skewed key', 'Lag that grows until records age out of retention', 'Writes rejected when too few replicas are in sync'],
                            boundary: 'Choose a log when several consumers need the same events, or when you need replay. Choose a queue when each job runs once and then disappears.',
                        },
                    ],
                },
            ],
        },
        {
            id: 'd2',
            code: 'D2',
            name: DEPTH_LAYERS[1],
            title: 'Topics, partitions, keys and offsets',
            lede: T[1],
            sections: [
                {
                    id: 'model',
                    label: 'Data model',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'table',
                            columns: ['Concept', 'What it is', 'Who chooses it'],
                            rows: [
                                ['Topic', 'A named stream of records, such as `usage-events`.', 'The team that owns the data.'],
                                ['Partition', 'One ordered, append-only slice of a topic, and the unit of parallelism and ordering.', 'Set when the topic is created, and it can grow but never shrink.'],
                                ['Key', 'Bytes attached to a record, and records with the same key go to the same partition.', 'The producer, on every record.'],
                                ['Offset', 'A record’s position in its partition, counting up from 0.', 'The broker assigns it on append.'],
                                ['Consumer group', 'Consumers that share a topic’s partitions, with one set of committed offsets per group.', 'Each consuming service.'],
                                ['Retention', 'How long, or how many bytes, a partition keeps, unless compaction keeps the latest record per key.', 'Per topic, in its config.'],
                            ],
                        },
                    ],
                },
                {
                    id: 'keys',
                    label: 'Choosing the key',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KAFKA_PARTITIONER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'The producer’s built-in partitioner sends a keyed record to partition `murmur2(key) mod N`, after clearing the sign bit. An unkeyed record goes to a sticky partition that changes once per batch, so load spreads without tiny batches.',
                                'The key decides which records stay in order and how evenly load spreads. `user_id` keeps each user’s events in order, while a tenant key sends a heavy tenant’s traffic to one partition.',
                            ],
                        },
                    ],
                },
                {
                    id: 'config',
                    label: 'Config that matters',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }],
                    blocks: [
                        {
                            kind: 'code',
                            code: '# topic\nreplication.factor=3\nmin.insync.replicas=2\nretention.ms=604800000\n\n# producer\nacks=all\nenable.idempotence=true',
                            notes: [
                                '`replication.factor=3` keeps three copies of every partition on three brokers.',
                                '`min.insync.replicas=2` makes an `acks=all` write fail unless at least two copies are in sync.',
                                '`retention.ms=604800000` is the default: seven days.',
                                '`acks=all` and idempotence are producer defaults since Kafka 3.0, so retries cannot write a record twice.',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'd3',
            code: 'D3',
            name: DEPTH_LAYERS[2],
            title: 'An append-only file per partition, copied to followers',
            lede: T[2],
            sections: [
                {
                    id: 'storage',
                    label: 'On disk',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'A partition is a directory of segment files, and retention deletes old segments whole. Reads and writes are sequential, which disks and SSDs handle far faster than random access.',
                                'Kafka uses the operating system’s page cache in place of its own cache. It serves consumers with the `sendfile` system call, which moves bytes from page cache to socket without an application copy.',
                            ],
                        },
                        {
                            kind: 'list',
                            ordered: true,
                            items: [
                                { title: 'Producer sends a batch', text: 'to the partition’s leader broker.' },
                                { title: 'Leader appends', text: 'to its newest segment file and assigns offsets.' },
                                { title: 'Followers fetch', text: 'the new records and append them to their own copy.' },
                                { title: 'High watermark advances', text: 'once every in-sync replica has the records. Consumers read only up to it.' },
                                { title: 'Leader acknowledges', text: 'an `acks=all` write once the high watermark covers it.' },
                            ],
                        },
                    ],
                },
                {
                    id: 'replication',
                    label: 'Replication',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KAFKA_DESIGN' }, { key: 'KAFKA_DOCS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'The in-sync replica set (ISR) is the leader plus every follower that has kept up recently. When a leader fails, the controller picks a new leader from the ISR, so no acknowledged record is lost.',
                                'With every in-sync replica gone, the partition stays offline unless `unclean.leader.election.enable=true` lets a stale replica take over and lose records. Since Kafka 4.0, a KRaft controller quorum runs cluster metadata and leader election in place of ZooKeeper.',
                            ],
                        },
                    ],
                },
                {
                    id: 'consumers',
                    label: 'Consumers',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'In a classic consumer group, each partition is assigned to exactly one consumer. A group with more consumers than partitions leaves the extra consumers idle.',
                                'Consumers commit their offsets to an internal topic. A new group can start from the oldest retained record.',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'd4',
            code: 'D4',
            name: DEPTH_LAYERS[3],
            title: 'Order per partition, hot keys, and the in-sync replica floor',
            lede: T[3],
            sections: [
                {
                    id: 'hot',
                    label: 'Hot partitions',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_PARTITIONER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `At Zipf skew 1.1, the hottest of 12 partitions carries **${pct(HOT.hottestShare, 1)}** of traffic, against a fair share of ${pct(HOT.fairShare, 1)}.`,
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'kafka-partitions',
                            title: `Hash ${KAFKA_KEYS.toLocaleString('en-US')} keys with Kafka’s murmur2`,
                            sub: 'Drag partitions and skew, salt the hottest key or add a partition, and watch the tallest bar.',
                        },
                        {
                            kind: 'prose',
                            paras: [
                                'Extra consumers cannot help, because a group gives each partition one reader. Salt the hottest key into sub-keys and merge them downstream, or move the heavy tenant to its own topic.',
                            ],
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'KAFKA_PARTITIONER' }],
                        text: 'The hash is Kafka’s murmur2, and the Zipf popularity curve stands in for real traffic.',
                    },
                },
                {
                    id: 'durability',
                    label: 'What survives',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'table',
                            columns: ['Producer and topic settings', 'Acknowledged when', 'How a record is lost'],
                            rows: [
                                ['`acks=0`', 'The producer has sent it.', 'Any failure in flight.'],
                                ['`acks=1`', 'The leader has written it.', 'The leader dies before a follower copies it.'],
                                ['`acks=all`, `min.insync.replicas=1`', 'Every in-sync replica has it, which may be only the leader.', 'The ISR shrinks to the leader, then the leader dies.'],
                                ['`acks=all`, `min.insync.replicas=2`, replication factor 3', 'At least two replicas have it.', 'Two brokers fail at once, while one down still accepts writes and two down rejects writes but serves reads.'],
                            ],
                        },
                    ],
                },
                {
                    id: 'ordering',
                    label: 'Ordering',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Two events for the same user arrive in order only when they share a key, and so a partition.',
                                'Retries could reorder a partition, because a later batch can land before a retried earlier one. The idempotent producer numbers its batches, so the broker rejects duplicates and keeps the order.',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'd5',
            code: 'D5',
            name: DEPTH_LAYERS[4],
            title: 'Partitions only go up, and lag is the number to watch',
            lede: T[4],
            sections: [
                {
                    id: 'grow',
                    label: 'Adding partitions',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KAFKA_PARTITIONER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `Going from 12 to 13 partitions remaps **${pct(GROW.keysMoved)}** of keys, because a key’s partition is its hash modulo the count. Existing records do not move, so a moved key’s older records sit in one partition and newer ones in another.`,
                                'Plan the partition count for the peak expected in a year or two. To change it, move producers and consumers to a new topic, or accept a brief window without per-key order.',
                            ],
                        },
                    ],
                },
                {
                    id: 'watch',
                    label: 'What to watch',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }],
                    blocks: [
                        {
                            kind: 'list',
                            style: 'cards',
                            items: [
                                { title: 'Consumer lag.', text: 'Log end offset minus committed offset per partition, and hours of growth mean records expire unread.' },
                                { title: 'Under-replicated partitions.', text: 'Any value above zero means a follower fell out of the ISR, so one more failure may stop writes.' },
                                { title: 'Offline partitions.', text: 'With no leader, producers to that partition fail.' },
                                { title: 'Produce latency at p99.', text: 'With `acks=all`, a slow follower shows up here first.' },
                            ],
                        },
                        {
                            kind: 'quote',
                            text: 'Replication factor 3, min.insync.replicas 2, acks all: one broker can fail with no lost write and no stalled producer. Alert on consumer lag measured in time, because retention deletes records by age.',
                        },
                    ],
                },
            ],
        },
    ],
});
