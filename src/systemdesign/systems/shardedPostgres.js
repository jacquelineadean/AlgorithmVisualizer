import { defineSystem } from '../model';
import { RESHARD_ROWS, reshard } from '../models/hashing';
import { pct } from '../labs/kit';
import { DEPTH_LAYERS, DEPTH_TEXT } from './fundamentalsData';

// Adding a fifth node to four, with Citus's default 32 shards: the same
// numbers the resharding lab shows at its starting position.
const ADD = reshard({ nodes: 4, logicalShards: 32 });
const scheme = (id) => ADD.schemes.find((s) => s.id === id);
const T = DEPTH_TEXT['sharded-postgres'];

export default defineSystem({
    id: 'sharded-postgres',
    category: 'fundamentals',
    name: 'Sharded Postgres',
    kicker: 'Component, five layers deep',
    summary: 'Relational data split across many primaries by a shard key. Followed from when to shard down to moving data while it serves traffic.',
    intro: 'Sharding buys write capacity and storage past one machine, and charges for it in every query that crosses shards. These five layers use Citus, the Postgres extension, as the worked example.',
    direction: { label: 'Depth', top: 'what it is for', bottom: 'how it runs' },
    overview: {
        title: 'One database, many primaries',
        lede: 'The shard key decides which primary owns a row. Almost every hard question about a sharded database comes back to that choice.',
        sections: [
            {
                id: 'layers',
                label: 'The five layers',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_MODELS' }, { key: 'CITUS2021' }],
                blocks: [
                    { kind: 'layers' },
                    {
                        kind: 'lab',
                        lab: 'depth-strata',
                        props: { only: ['sharded-postgres'] },
                        title: 'Step through the layers',
                        sub: 'Each layer in one paragraph. The link under each opens that layer here.',
                    },
                ],
            },
            {
                id: 'where',
                label: 'Where it sits',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'CITUS2021' }],
                blocks: [
                    {
                        kind: 'prose',
                        paras: [
                            'In the [chat-serving design](/systems/chat-serving/store), conversation history lives in Postgres sharded by conversation. Every request reads one conversation, so every read hits one shard.',
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
            title: 'Relational data past the limits of one primary',
            lede: T[0],
            sections: [
                {
                    id: 'spec',
                    label: 'Spec sheet',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'CITUS2021' }, { key: 'CITUS_GUC' }],
                    blocks: [
                        {
                            kind: 'spec',
                            owns: 'Rows that are too many, or written too often, for one Postgres primary.',
                            neighbors: 'Application servers send SQL to a coordinator, which routes it to shards. Each shard streams its write-ahead log to its own replicas.',
                            pattern: 'A hash map whose buckets are databases. The shard key is the hash key.',
                            metrics: ['CPU and queries per second per shard', 'Size of the largest shard', 'Share of queries that touch more than one shard', 'Replication lag per replica'],
                            knobs: ['Shard key', 'Shard count (Citus defaults to 32)', 'Placement of shards on nodes', 'Synchronous or asynchronous replicas'],
                            failures: ['A hot shard from a skewed key', 'Slow fan-out queries that wait for the slowest shard', 'A shard key that no longer fits the queries'],
                            boundary: 'Shard when one primary cannot keep up with writes or hold the working set, after a bigger machine and read replicas. Before that, one primary is simpler in every way.',
                        },
                    ],
                },
                {
                    id: 'versus',
                    label: 'Hash or range',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'CITUS2021' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'tradeoffs',
                            props: { only: ['hash-range'] },
                            title: 'The first choice after the key',
                            sub: 'Both split rows by the shard key. They differ in which queries stay on one shard.',
                        },
                    ],
                },
            ],
        },
        {
            id: 'd2',
            code: 'D2',
            name: DEPTH_LAYERS[1],
            title: 'A shard key, a routing map, one schema everywhere',
            lede: T[1],
            sections: [
                {
                    id: 'key',
                    label: 'Choosing the key',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'CITUS2021' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'A good shard key appears in the `WHERE` clause of the hot queries, has many distinct values, and spreads writes evenly. Tables that are joined should share it, so the join runs inside one shard.',
                            ],
                        },
                        {
                            kind: 'table',
                            caption: 'Candidate keys for a chat product’s messages table',
                            columns: ['Shard key', 'Hot queries', 'Risk'],
                            rows: [
                                ['`conversation_id`', 'Load one conversation: one shard.', 'Listing a user’s conversations fans out, unless that list lives in its own table keyed by user.'],
                                ['`user_id`', 'Load a user’s conversations and messages: one shard.', 'A heavy user or a shared bot account becomes a hot shard.'],
                                ['`org_id`', 'Everything for one customer: one shard, easy per-tenant export.', 'The largest customer may not fit on one node.'],
                                ['`created_at`', 'Time-range scans.', 'Every new write goes to the newest range: one hot shard.'],
                            ],
                        },
                    ],
                },
                {
                    id: 'ddl',
                    label: 'In SQL',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'CITUS_GUC' }, { key: 'CITUS2021' }],
                    blocks: [
                        {
                            kind: 'code',
                            code: "SET citus.shard_count = 32;\n\nSELECT create_distributed_table('conversations', 'conversation_id');\nSELECT create_distributed_table('messages', 'conversation_id',\n                                colocate_with => 'conversations');\nSELECT create_reference_table('models');",
                            notes: [
                                '`citus.shard_count` sets how many shards a new distributed table gets. 32 is the default.',
                                '`create_distributed_table` splits a table by the named column.',
                                '`colocate_with` puts matching shards of both tables on the same node, so a join on `conversation_id` stays local.',
                                '`create_reference_table` copies a small table to every node, so any shard can join with it.',
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
            title: 'Hash ranges, query routing and replicas per shard',
            lede: T[2],
            sections: [
                {
                    id: 'route',
                    label: 'Routing a query',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'CITUS2021' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Citus hashes the shard key into a 32-bit range and gives each shard an equal slice of it. A coordinator node holds the map from slice to shard to node.',
                                'A query that names one shard key value is routed whole to one shard and runs at single-node speed. A query without the key is split into one query per shard, run in parallel, and merged on the coordinator. It finishes when the slowest shard answers.',
                            ],
                        },
                        {
                            kind: 'list',
                            items: [
                                { title: 'Router query:', text: '`SELECT … WHERE conversation_id = 42` goes to one shard.' },
                                { title: 'Fan-out query:', text: '`SELECT count(*) FROM messages WHERE created_at > now() - interval \'1 day\'` asks all 32 shards.' },
                                { title: 'Co-located join:', text: 'messages joined to conversations on `conversation_id` runs inside each shard.' },
                            ],
                        },
                    ],
                },
                {
                    id: 'replicas',
                    label: 'Replicas',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'POSTGRES_HA' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Each shard’s node is an ordinary Postgres primary. It streams its write-ahead log to one or more standbys. A standby named in `synchronous_standby_names` must confirm each commit before the primary reports it, so a failover to it loses nothing.',
                                'Postgres itself does not detect a failed primary or promote a standby. That job belongs to a separate tool or a managed service.',
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
            title: 'Hot shards, cross-shard work, and the cost of moving rows',
            lede: T[3],
            sections: [
                {
                    id: 'reshard',
                    label: 'Adding a node',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_PARTITIONER' }, { key: 'KARGER1997' }, { key: 'DECANDIA2007' }, { key: 'CITUS_GUC' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `Going from 4 nodes to 5, at best ${pct(ADD.ideal)} of rows move, all onto the new node. Placing rows by hash modulo the node count moves **${pct(scheme('mod').moved)}**. A consistent-hash ring with 100 virtual nodes per server moves ${pct(scheme('ring').moved)}. A fixed set of 32 logical shards, moved whole, moves ${pct(scheme('logical').moved)}.`,
                                'Fixed logical shards are why Citus asks for a shard count up front. Data moves in whole shards, and the routing map changes by one entry per moved shard.',
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'resharding',
                            title: 'Add one node: how much data moves?',
                            sub: `${RESHARD_ROWS.toLocaleString('en-US')} rows hashed with murmur2, placed three ways, before and after one node joins.`,
                        },
                    ],
                },
                {
                    id: 'cross',
                    label: 'Crossing shards',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'CITUS2021' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'A transaction that writes to two shards on different nodes needs two-phase commit, which Citus runs for you. It costs extra round trips and holds locks longer.',
                                'A join on a column other than the shard key must move rows between nodes. Design the key so the hot joins never need that.',
                            ],
                        },
                    ],
                },
                {
                    id: 'hot',
                    label: 'Hot shards',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'CITUS2021' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Hashing spreads keys evenly, but not traffic. One huge tenant, or one viral conversation, lands on one shard. Options, from least to most work: give that shard a node of its own, cache its reads, or move that tenant to a dedicated cluster.',
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
            title: 'Resharding, migrations and failover, rehearsed',
            lede: T[4],
            sections: [
                {
                    id: 'run',
                    label: 'Runbook',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'CITUS2021' }, { key: 'POSTGRES_HA' }],
                    blocks: [
                        {
                            kind: 'list',
                            style: 'cards',
                            items: [
                                { title: 'Rebalance online.', text: 'Citus’s shard rebalancer copies a shard to its new node with logical replication, then switches the routing map. Writes pause only for the switch.' },
                                { title: 'Migrate shard by shard.', text: 'Schema changes run on every shard. Make them backward compatible so old and new code both work while they roll out.' },
                                { title: 'Back up per shard.', text: 'A restore must bring every shard to the same point in time, or cross-shard data disagrees.' },
                                { title: 'Drill failover.', text: 'Promote a standby on a schedule, so the first real failover is not the first one.' },
                            ],
                        },
                    ],
                },
                {
                    id: 'sync',
                    label: 'Sync or async',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'POSTGRES_HA' }, { key: 'DEAN_LATENCY' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'tradeoffs',
                            props: { only: ['sync-async'] },
                            title: 'What a failover may lose',
                            sub: 'Synchronous standbys lose nothing on failover and add a round trip to every commit.',
                        },
                        {
                            kind: 'quote',
                            text: 'I would shard messages by conversation id with 32 logical shards, co-locate the tables that join on it, and keep one synchronous standby per shard in the same region.',
                        },
                    ],
                },
            ],
        },
    ],
});
