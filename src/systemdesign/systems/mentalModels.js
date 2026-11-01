import { defineSystem } from '../model';
import { breadthClock, ladderRatio } from '../models/fundamentals';
import { formatBytes, kvBytesPerToken, SERVING_MODELS } from '../models/serving';
import { ANTI_PATTERNS, ESCAPE_HATCHES, PRIMITIVE_FAMILIES, REQUIREMENT_QUESTIONS, SIGNALS } from './fundamentalsData';

const PRIMITIVES = PRIMITIVE_FAMILIES.reduce((n, [, items]) => n + items.length, 0);
const NET_OVER_MEM = ladderRatio('Main memory reference', 'Round trip within one datacenter');
const WAN_OVER_NET = ladderRatio('Round trip within one datacenter', 'California to Netherlands and back');
const KV8 = formatBytes(kvBytesPerToken(SERVING_MODELS.l8));
const KV13 = formatBytes(kvBytesPerToken(SERVING_MODELS.l13));
const KV_RATIO = kvBytesPerToken(SERVING_MODELS.l13) / kvBytesPerToken(SERVING_MODELS.l8);
const WIDE = breadthClock(12);
const NARROW = breadthClock(5);
const fmt = (n) => n.toLocaleString('en-US');

export default defineSystem({
    id: 'mental-models',
    category: 'fundamentals',
    name: 'Four Mental Models',
    kicker: 'Method',
    summary: 'A method for any open-ended design prompt: understand the question, pick building blocks for stated reasons, go deep where it counts, and correct course while you talk.',
    intro: 'A design prompt has no test cases. What gets judged is the reasoning: why each part is there, what it costs, and how it fails. These four models give that reasoning an order, laid out against a 45-minute design round.',
    direction: { label: 'A 45-minute round', top: 'minute 0', bottom: 'minute 45' },
    overview: {
        title: 'Four models that work on any prompt',
        lede: 'Most weak design answers come from a missing method, with the knowledge already in place. Each model below is a set of tools for one stage of the conversation.',
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
                            { value: String(REQUIREMENT_QUESTIONS.length), label: 'requirement questions before drawing' },
                            { value: '1', label: 'consumer question that reshapes the design' },
                            { value: String(PRIMITIVES), label: 'primitives to know cold' },
                            { value: String(ANTI_PATTERNS.length), label: 'anti-patterns to avoid' },
                            { value: '5', label: 'layers of depth, taken on purpose' },
                            { value: '3', label: 'tests for where depth goes' },
                            { value: String(SIGNALS.length), label: 'interviewer signals to read' },
                            { value: String(ESCAPE_HATCHES.length), label: 'escape hatches, phrased in advance' },
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
                        kind: 'prose',
                        paras: ['The third model takes three components five layers down. Each one has its own page here, and the [chat-serving design](/systems/chat-serving) puts all of them in one system.'],
                    },
                    {
                        kind: 'links',
                        items: [
                            { to: '/systems/kafka-log', label: 'Kafka log', text: 'Partitions, keys, replication and the settings that decide what survives.' },
                            { to: '/systems/paged-kv-cache', label: 'PagedAttention KV cache', text: 'Why GPU memory sets the batch size, and how block tables remove waste.' },
                            { to: '/systems/sharded-postgres', label: 'Sharded Postgres', text: 'Shard keys, routing, and how much data moves when a node joins.' },
                            { to: '/systems/chat-serving', label: 'Chat serving, end to end', text: 'One design that uses all three, walked layer by layer and failed one box at a time.' },
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
            products: 'minutes 0 to 8',
            title: 'Understand the question',
            lede: 'A design prompt is underspecified on purpose. Four tools pull out the missing constraints before anything is drawn: a requirements checklist, the consumer question, a naive design offered first, and a direct request for a hint.',
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
                            sub: 'One version of the eight. Tick each question once you have an answer. Each answer decides something on the board.',
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
                                'The answers only help once they become arithmetic. Users and requests per day give an arrival rate. Little’s law turns the rate into concurrency: requests in flight equal the arrival rate times the time each spends in the system, **L = λW**.',
                                `For an LLM service, concurrency turns into memory, because every live stream keeps its attention keys and values on the GPU. Llama 3 8B needs ${KV8} per token. Llama 2 13B, without grouped-query attention, needs ${KV13}: ${KV_RATIO.toFixed(2)} times as much. That ratio is a design decision you can say out loud.`,
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'capacity-estimator',
                            title: 'From requirements to GPUs',
                            sub: 'Set the answers to the checklist. The figure shows one 8-GPU server at peak: dark fill is model weights, green is KV cache.',
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'NVIDIA_A100' }],
                        text: 'The GPU figures come from vendor spec sheets, so the estimate gives the order of magnitude. Benchmark the real model on real traffic before you size a fleet.',
                    },
                },
                {
                    id: 'consumer',
                    label: 'Who consumes it',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['One question gets its own line: who consumes the output, and what do they do with it? The figure runs it on one prompt, “design an LLM inference service”, for three consumers. The design follows from the answer, and so do the numbers written next to it.'],
                        },
                        { kind: 'lab', lab: 'consumer-question', title: 'Same prompt, three consumers' },
                    ],
                },
                {
                    id: 'naive',
                    label: 'Naive design first',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['Put a deliberately simple design on the board early, then watch where the interviewer pushes. Each push shows which direction they care about, before you spend twenty minutes on the wrong one.'],
                        },
                        {
                            kind: 'lab',
                            lab: 'poke-test',
                            title: 'The poke test',
                            sub: 'A two-minute naive design. Tap a red mark to read what the push signals.',
                        },
                    ],
                },
                {
                    id: 'hint',
                    label: 'Ask for the hint',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['A senior engineer asks stakeholders what matters before spending a week on the wrong part. The same question in a design round costs one sentence and reads as seniority.'],
                        },
                        { kind: 'quote', text: 'I can go deeper on the write path or on failure handling. Which matters more for your team?' },
                    ],
                },
            ],
        },
        {
            id: 'm2',
            code: 'M2',
            name: 'Building blocks',
            products: 'minutes 8 to 18',
            title: 'Pick the right building blocks',
            lede: `Know ${PRIMITIVES} primitives, and choose in a fixed order: start from the access pattern, pick the primitive that serves it, and name a vendor last. A candidate who says “Kafka” before saying what the data looks like has skipped two steps.`,
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
                            sub: 'Pick an access pattern first. The primitives that serve it light up. Vendors stay hidden until you ask for them.',
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
                                `Knowing a primitive includes knowing its price in time. A cache hit in the same process costs about a memory reference. The same hit over the network costs a datacenter round trip, about ${fmt(NET_OVER_MEM)} times longer. Synchronous replication to another continent costs a round trip ${fmt(WAN_OVER_NET)} times longer again.`,
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'latency-ladder',
                            title: 'The latency ladder',
                            sub: 'Each bar is one operation on a log scale. Stretch to human time to feel the gaps between rungs.',
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
                            kind: 'prose',
                            paras: ['Judgment shows up as tradeoffs. A tradeoff is two primitives that serve the same access pattern at different prices. Say which one you picked, what it costs, and when you would switch.'],
                        },
                        { kind: 'lab', lab: 'tradeoffs', title: 'Six tradeoffs worth having ready', sub: 'Pick a pair. Compare what each side gives, what it costs, and the number to say out loud.' },
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
                                'Leaderless stores replicate each key to N nodes. A write waits for W acknowledgements and a read asks R nodes. With strict quorums, **R + W > N** makes every read set overlap every write set, so a read reaches at least one node holding the latest acknowledged write. Dynamo’s common setting is N = 3, W = 2, R = 2.',
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
            products: 'minutes 18 to 36',
            title: 'Go deeper, on purpose',
            lede: 'The third model decides how far down to go, and where. Every component has five layers of depth. Know which layer you are on, choose to go down, and spend the depth where it counts.',
            sections: [
                {
                    id: 'layers',
                    label: 'Five layers',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }, { key: 'KAFKA_DOCS' }, { key: 'KWON2023' }, { key: 'CITUS2021' }],
                    blocks: [
                        { kind: 'lab', lab: 'depth-strata', title: 'Five layers, three components', sub: 'Pick a component, then go down a layer at a time.' },
                        {
                            kind: 'prose',
                            paras: ['Knowing a component usually covers layers 1 to 3. Layers 4 and 5 hold the numbers and the failures, which is where depth is judged. Say out loud which layer you are on and why you are going down.'],
                        },
                        { kind: 'quote', text: 'That is its role. What matters for this design is how it fails, so let me go there.' },
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
                            paras: ['Depth costs minutes, so it needs a budget. Spend it on components that pass three tests: load-bearing, novel, and close to the interviewer’s own team. Drawn as circles, the deepest dive goes where all three overlap.'],
                        },
                        { kind: 'lab', lab: 'depth-budget', title: 'Where the depth goes', sub: 'Example prompt: chat serving for a public LLM API. Change the interviewer’s team and watch the center change.' },
                    ],
                },
                {
                    id: 'breadth',
                    label: 'Breadth costs depth',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `Covering more components does not read as more senior. The clock explains part of it. In the toy model below, naming 12 components leaves ${WIDE.remaining} minutes and reaches layer ${WIDE.depth} on two dives. Naming 5 leaves ${NARROW.remaining} minutes and reaches layer ${NARROW.depth}.`,
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'breadth-clock',
                            title: 'A toy model of the clock',
                            sub: '30 minutes of design time. Placing and justifying a component costs 1.5 minutes. Each layer of depth past the first costs 3 more. What is left goes to two deep dives.',
                        },
                    ],
                },
            ],
        },
        {
            id: 'm4',
            code: 'M4',
            name: 'Discuss',
            products: 'the whole round, and minutes 36 to 45',
            title: 'Discuss, and correct course',
            lede: 'A design round is a dialogue, and the interviewer gives information away all the way through it. Read the signals, check direction after each reaction, keep escape hatches ready, and end with a summary built for judgment and depth.',
            sections: [
                {
                    id: 'signals',
                    label: 'Six signals',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [{ kind: 'lab', lab: 'signals', title: 'Six signals', sub: 'Each one is something an interviewer does, and what it usually means.' }],
                },
                {
                    id: 'check',
                    label: 'Three-second check',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['After each reaction from the interviewer, take three seconds to decide whether you are still on their path. The game gives you six reactions and three seconds for each.'],
                        },
                        { kind: 'lab', lab: 'three-second-check', title: 'Keep going, or re-anchor?' },
                    ],
                },
                {
                    id: 'hatches',
                    label: 'Escape hatches',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['Five phrasings worth memorizing for the moments a design goes sideways. Copy them, then rewrite them in your own voice.'],
                        },
                        { kind: 'lab', lab: 'escape-hatches', title: 'Five escape hatches' },
                    ],
                },
                {
                    id: 'failures',
                    label: 'Fail one box',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KWON2023' }, { key: 'POSTGRES_HA' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['A strong ending names the biggest risk and how you would see it coming. To find it, fail each box in turn and ask three questions. What do users see? Which metric moves first? What limits the damage?'],
                        },
                        { kind: 'lab', lab: 'failure-drill', title: 'Failure drill: chat serving', sub: 'Tap a box, or pick a failure. The failed part turns red and everything that depends on it dims.' },
                    ],
                },
                {
                    id: 'end',
                    label: 'End strong',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['One ending that works is a four-line summary in the final two minutes: the requirement you designed for, the two tradeoffs you made, the biggest risk and how you would see it, and what you would build next.'],
                        },
                        { kind: 'lab', lab: 'end-strong', title: 'The last two minutes', sub: 'Worked example for the chat-serving design. Step through it, or copy the blank template.' },
                    ],
                },
            ],
        },
    ],
});
