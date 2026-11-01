import { defineSystem } from '../model';
import { addPartition, KAFKA_KEYS, partitionLoad } from '../models/hashing';
import { pct } from '../labs/kit';
import { DEPTH_LAYERS, DEPTH_TEXT } from './fundamentalsData';

// Numbers quoted in the text, computed from the same model the lab runs.
const HOT = partitionLoad({ partitions: 12, skew: 1.1 });
const GROW = addPartition({ partitions: 12, skew: 1.1 });
const T = DEPTH_TEXT['kafka-log'];

const DEPTH = { label: 'Depth', top: 'what it is for', bottom: 'how it runs' };

export default defineSystem({
    id: 'kafka-log',
    category: 'fundamentals',
    name: 'Kafka log',
    kicker: 'Component, five layers deep',
    summary: 'A partitioned, replicated, append-only log. Followed from its role down to the settings that decide what survives a broker failure.',
    intro: 'Most designs that need replay or fan-out draw one box labelled Kafka. These five layers are what sits under that box, in the order an interviewer usually asks about them.',
    direction: DEPTH,
    overview: {
        title: 'One box, five layers down',
        lede: 'Each layer answers the question the one above it raises. Layers 1 to 3 describe the component. Layers 4 and 5 hold the numbers and the failures.',
        sections: [
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
                            'The same five layers apply to any component: role, interface and data model, mechanism, limits and failure, operations. [Four Mental Models](/systems/mental-models/m3) explains when to go down them and how far.',
                            'In a design discussion, say which layer you are on before you go down one. “That is its role. What matters here is how it fails, so let me go to layer 4.”',
                        ],
                    },
                ],
            },
            {
                id: 'where',
                label: 'Where it sits',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'KAFKA_DESIGN' }],
                blocks: [
                    {
                        kind: 'prose',
                        paras: [
                            'In the [chat-serving design](/systems/chat-serving/usage), the gateway writes one usage record per request to a Kafka topic. Billing, analytics and abuse detection each read that topic at their own pace, and a new consumer can replay last week.',
                        ],
                    },
                    {
                        kind: 'lab',
                        lab: 'depth-strata',
                        props: { only: ['kafka-log'] },
                        title: 'Step through the layers',
                        sub: 'Each layer in one paragraph. The link under each opens that layer here.',
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
                    id: 'spec',
                    label: 'Spec sheet',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'spec',
                            owns: 'Ordered, durable, replayable history for each topic, kept for a set time or size.',
                            neighbors: 'Producers append records. Consumer groups read from their own offsets. Stream processors read one topic and write another.',
                            pattern: 'A database write-ahead log, offered as a service: every reader replays the same sequence of records.',
                            metrics: ['Consumer lag per partition', 'Under-replicated partitions', 'Produce latency at p99', 'Bytes in and out per broker'],
                            knobs: ['Partition count', 'Replication factor and `min.insync.replicas`', 'Producer `acks`', 'Retention by time or size, or log compaction'],
                            failures: ['A hot partition from a skewed key', 'Lag that grows until records age out of retention', 'Writes rejected when too few replicas are in sync'],
                            boundary: 'Choose a log when several consumers need the same events, or when you need replay. Choose a queue when each job runs once and then disappears.',
                        },
                    ],
                },
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
                            title: 'The tradeoff behind the box',
                            sub: 'Both move messages from producers to consumers. They differ in who may read a message, and for how long.',
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
                                ['Partition', 'One ordered, append-only slice of a topic. The unit of parallelism and of ordering.', 'Set when the topic is created. It can grow, never shrink.'],
                                ['Key', 'Bytes attached to a record. Records with the same key go to the same partition.', 'The producer, on every record.'],
                                ['Offset', 'A record’s position in its partition, counting up from 0.', 'The broker assigns it on append.'],
                                ['Consumer group', 'Consumers that share a topic’s partitions. Each group keeps its own committed offsets.', 'Each consuming service.'],
                                ['Retention', 'How long, or how many bytes, a partition keeps. Compaction keeps the latest record per key instead.', 'Per topic, in its config.'],
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
                                'The producer’s built-in partitioner sends a keyed record to partition `murmur2(key) mod N`, after clearing the sign bit. A record without a key goes to a “sticky” partition that changes once per batch, so unkeyed traffic spreads out without tiny batches.',
                                'The key therefore decides two things at once: which records stay in order relative to each other, and how evenly load spreads. `user_id` keeps each user’s events in order. A constant key, such as a tenant with most of the traffic, puts that traffic on one partition.',
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
                                '`acks=all` and idempotence are the producer defaults since Kafka 3.0. Retries then cannot write a record twice.',
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
                                'A partition is a directory of segment files. Appends go to the end of the newest segment, and old segments are deleted whole when retention expires. Writes and reads are both sequential, which disks and SSDs handle far better than random access.',
                                'Kafka leans on the operating system’s page cache instead of its own cache, and sends file bytes to consumers with the `sendfile` system call, so data goes from page cache to socket without a copy through the application.',
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
                                'Each partition has one leader and some followers. The in-sync replica set (ISR) is the leader plus every follower that has kept up recently. When a leader fails, the controller picks a new leader from the ISR, so no acknowledged record is lost.',
                                'If every in-sync replica is gone, the partition stays offline by default. `unclean.leader.election.enable=true` would let an out-of-date replica take over, trading lost records for availability.',
                                'Since Kafka 4.0, cluster metadata and leader election run on a KRaft controller quorum. ZooKeeper is no longer used.',
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
                                'Consumers commit their offsets to an internal topic. Replay is a matter of moving a group’s offset back, and a new group can start from the oldest retained record.',
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
                                `With 12 partitions and key popularity on a Zipf curve (skew 1.1, ${KAFKA_KEYS.toLocaleString('en-US')} keys), the hottest partition carries **${pct(HOT.hottestShare, 1)}** of the traffic. An even split would give each ${pct(HOT.fairShare, 1)}. Adding consumers does not help, because one partition has one reader in a group.`,
                                'Two fixes work. Salt the hottest key into sub-keys and merge downstream, or give the heavy tenant its own topic.',
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'kafka-partitions',
                            title: 'Hash 5,000 keys with Kafka’s own murmur2',
                            sub: 'Change the partition count and the skew. Salt the hottest key, or add a partition and see how many keys move.',
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'KAFKA_PARTITIONER' }],
                        text: 'The hash is Kafka’s. The Zipf popularity curve is an assumption standing in for real traffic.',
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
                                ['`acks=all`, `min.insync.replicas=2`, replication factor 3', 'At least two replicas have it.', 'Two brokers fail at once. With one broker down, writes continue. With two down, writes are rejected and reads continue.'],
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
                                'Kafka orders records within a partition and nowhere else. Two events for the same user arrive in order only if they share a key.',
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
                                `Going from 12 to 13 partitions moves **${pct(GROW.keysMoved)}** of keys to a different partition, because the partition is the hash modulo the count. Existing records stay where they are, so for a while a key’s older records sit in one partition and its newer records in another.`,
                                'Plan the partition count for the peak you expect in a year or two. If you must change it, create a new topic and move producers and consumers over, or accept a brief window without per-key order.',
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
                                { title: 'Consumer lag.', text: 'Log end offset minus committed offset, per partition. Lag that grows for hours means the consumer will fall off the end of retention.' },
                                { title: 'Under-replicated partitions.', text: 'Any value above zero means a follower has fallen out of the ISR. One more failure and writes may stop.' },
                                { title: 'Offline partitions.', text: 'No leader. Producers to that partition fail.' },
                                { title: 'Produce latency at p99.', text: 'With `acks=all`, a slow follower shows up here first.' },
                            ],
                        },
                        {
                            kind: 'quote',
                            text: 'Replication factor 3, min.insync.replicas 2, acks all. One broker can fail with no lost write and no stalled producer. I would alert on consumer lag in time, not in records.',
                        },
                    ],
                },
            ],
        },
    ],
});
