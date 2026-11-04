import { defineSystem } from '../model';
import { ladderRatio } from '../models/fundamentals';
import { formatBytes, kvBytesPerToken, SERVING_MODELS } from '../models/serving';
import { ANTI_PATTERNS, DEPTH_LAYERS, PRIMITIVE_FAMILIES, REQUIREMENT_QUESTIONS, TRADEOFFS } from './fundamentalsData';

const PRIMITIVES = PRIMITIVE_FAMILIES.reduce((n, [, items]) => n + items.length, 0);
const NET_OVER_MEM = ladderRatio('Main memory reference', 'Round trip within one datacenter');
const WAN_OVER_NET = ladderRatio('Round trip within one datacenter', 'California to Netherlands and back');
const KV8 = formatBytes(kvBytesPerToken(SERVING_MODELS.l8));
const KV13 = formatBytes(kvBytesPerToken(SERVING_MODELS.l13));
const KV_RATIO = kvBytesPerToken(SERVING_MODELS.l13) / kvBytesPerToken(SERVING_MODELS.l8);
const fmt = (n) => n.toLocaleString('en-US');

export default defineSystem({
    id: 'mental-models',
    category: 'fundamentals',
    name: 'Four Mental Models',
    kicker: 'Method',
    summary: 'Requirements into numbers, pattern before product, depth where it counts, then fail each box.',
    intro: 'Four steps from an open design question to numbers, choices and named risks.',
    overview: {
        title: 'Four steps for any design',
        sections: [
            {
                id: 'start',
                label: 'Start here',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_MODELS' }],
                blocks: [
                    { kind: 'layers' },
                    {
                        kind: 'stats',
                        items: [
                            { value: String(REQUIREMENT_QUESTIONS.length), label: 'requirement questions' },
                            { value: String(PRIMITIVES), label: `primitives in ${PRIMITIVE_FAMILIES.length} families` },
                            { value: String(TRADEOFFS.length), label: 'tradeoff pairs' },
                            { value: String(DEPTH_LAYERS.length), label: 'layers of depth per component' },
                        ],
                    },
                ],
            },
            {
                id: 'components',
                label: 'Go deeper',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_MODELS' }],
                blocks: [
                    {
                        kind: 'links',
                        items: [
                            { to: '/systems/kafka-log', label: 'Kafka log', text: 'Partitions, keys, replication and what survives a broker failure.' },
                            { to: '/systems/paged-kv-cache', label: 'PagedAttention KV cache', text: 'Why GPU memory sets the batch size.' },
                            { to: '/systems/sharded-postgres', label: 'Sharded Postgres', text: 'Shard keys, routing, and how much data moves when a node joins.' },
                            { to: '/systems/chat-serving', label: 'Chat serving, end to end', text: 'One design that uses all three, failed one box at a time.' },
                        ],
                    },
                ],
            },
        ],
    },
    layers: [
        {
            id: 'm1',
            code: 'M1',
            name: 'Understand',
            title: 'Turn requirements into numbers',
            lede: 'Pin down the missing constraints, then convert them into rates, concurrency and memory.',
            sections: [
                {
                    id: 'checklist',
                    label: 'Eight questions',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'requirements-checklist',
                            title: 'Eight questions before the first box',
                            sub: 'Tick a question to see what its answer decides.',
                        },
                    ],
                },
                {
                    id: 'numbers',
                    label: 'Into numbers',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'LITTLE1961' }, { key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }, { key: 'NVIDIA_A100' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Little’s law turns an arrival rate into concurrency: requests in flight equal arrival rate times time in the system, **L = λW**.',
                                `On an LLM, every live stream keeps its keys and values on the GPU. Llama 3 8B needs ${KV8} per token, and Llama 2 13B needs ${KV13}, ${KV_RATIO.toFixed(2)} times as much.`,
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'capacity-estimator',
                            title: 'From requirements to GPUs',
                            sub: 'Set the answers. The figure shows one 8-GPU server at peak: weights dark, KV cache green.',
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'NVIDIA_A100' }],
                        text: 'Spec-sheet GPU figures give an order of magnitude. Benchmark the real model on real traffic before sizing a fleet.',
                    },
                },
                {
                    id: 'consumer',
                    label: 'Who consumes it',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'consumer-question',
                            title: 'One service, three consumers',
                            sub: 'Switch the consumer. The target, the boxes and the numbers change with it.',
                        },
                    ],
                },
                {
                    id: 'naive',
                    label: 'Naive design first',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'poke-test',
                            title: 'Stress a naive design',
                            sub: 'Three boxes, four questions. Tap a red question to see which part of the design it tests.',
                        },
                    ],
                },
            ],
        },
        {
            id: 'm2',
            code: 'M2',
            name: 'Building blocks',
            title: 'Pattern, then primitive, then product',
            lede: `Start from the access pattern, pick one of ${PRIMITIVES} primitives that serves it, and name a product last.`,
            sections: [
                {
                    id: 'primitives',
                    label: `${PRIMITIVES} primitives`,
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'primitives',
                            title: `${PRIMITIVES} primitives, grouped by job`,
                            sub: 'Pick an access pattern. The primitives that serve it light up.',
                        },
                    ],
                },
                {
                    id: 'costs',
                    label: 'What each costs',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'DEAN_LATENCY' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `A cache hit over the network costs a datacenter round trip, about ${fmt(NET_OVER_MEM)} times a memory reference. Synchronous replication to another continent costs ${fmt(WAN_OVER_NET)} times that again.`,
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'latency-ladder',
                            title: 'The latency ladder',
                            sub: 'One bar per operation, on a log scale. Stretch to human time to compare the gaps.',
                        },
                    ],
                },
                {
                    id: 'tradeoffs',
                    label: 'Tradeoff pairs',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }, { key: 'YU2022' }, { key: 'KAFKA_DESIGN' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'tradeoffs',
                            title: `${TRADEOFFS.length} tradeoff pairs`,
                            sub: 'Two primitives, one access pattern. Pick a pair to compare gains, costs and the deciding number.',
                        },
                    ],
                },
                {
                    id: 'quorum',
                    label: 'Quorums',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'DECANDIA2007' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'A leaderless store copies each key to N nodes, waits for W acknowledgements on a write and asks R nodes on a read. With strict quorums, **R + W > N** makes every read overlap the latest acknowledged write. Dynamo’s common setting is N = 3, W = 2, R = 2.',
                            ],
                        },
                        { kind: 'lab', lab: 'quorum', title: 'Quorums: R + W > N' },
                    ],
                    caveat: {
                        provenance: 'paper',
                        sourceRefs: [{ key: 'DECANDIA2007' }],
                        text: 'During failures Dynamo uses sloppy quorums and hinted handoff, which relax this guarantee in exchange for availability.',
                    },
                },
                {
                    id: 'anti',
                    label: 'Anti-patterns',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [{ kind: 'list', style: 'cards', items: ANTI_PATTERNS }],
                },
            ],
        },
        {
            id: 'm3',
            code: 'M3',
            name: 'Go deeper',
            title: 'Spend depth where it counts',
            lede: 'Each component has five layers of depth, and the design decides which of them matter.',
            sections: [
                {
                    id: 'layers',
                    label: 'Five layers',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }, { key: 'KAFKA_DOCS' }, { key: 'KWON2023' }, { key: 'CITUS2021' }],
                    blocks: [
                        { kind: 'lab', lab: 'depth-strata', title: 'Five layers, three components', sub: 'Pick a component, then step down one layer at a time.' },
                        {
                            kind: 'prose',
                            paras: ['Layers 1 to 3 describe a component. Layers 4 and 5 hold its numbers and failures, where most design decisions sit.'],
                        },
                    ],
                },
                {
                    id: 'budget',
                    label: 'Depth budget',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['Spend depth on components that are load-bearing, novel and owned by your team. The deepest dive goes where all three overlap.'],
                        },
                        { kind: 'lab', lab: 'depth-budget', title: 'Where the depth goes', sub: 'Example: chat serving for a public LLM API. Change the team and watch the center move.' },
                    ],
                },
            ],
        },
        {
            id: 'm4',
            code: 'M4',
            name: 'Review',
            title: 'Fail each box, then write it down',
            lede: 'Break one component at a time, then record the requirement, the tradeoffs and the biggest risk.',
            sections: [
                {
                    id: 'failures',
                    label: 'Fail one box',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KWON2023' }, { key: 'POSTGRES_HA' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'failure-drill',
                            title: 'Failure drill: chat serving',
                            sub: 'Tap a box. Read what users see, the first metric to move, and what limits the damage.',
                        },
                    ],
                },
                {
                    id: 'summary',
                    label: 'Design summary',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'design-summary',
                            title: 'The design in four lines',
                            sub: 'Worked example for chat serving. Step through it, or copy the blank template.',
                        },
                    ],
                },
            ],
        },
    ],
});
