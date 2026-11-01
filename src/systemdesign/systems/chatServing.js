import { defineSystem } from '../model';
import { estimateFleet, formatBytes, kvBytesPerToken, SERVING_GPUS, SERVING_MODELS } from '../models/serving';
import { FAILURES } from './fundamentalsData';

// A worked capacity estimate, computed by the same model the lab runs.
const INPUTS = { users: 1_000_000, requestsPerUser: 10, peakFactor: 3, promptTokens: 1000, outputTokens: 500, tokensPerSecond: 30 };
const FLEET = estimateFleet({ model: SERVING_MODELS.l8, gpu: SERVING_GPUS.h100, ...INPUTS });
const fmt = (n, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });

const drill = (keys) => ({
    kind: 'lab',
    lab: 'failure-drill',
    props: { start: keys[0], only: keys },
    title: keys.length === 1 ? FAILURES[keys[0]].title : 'Fail this layer',
    sub: 'What users see, the first metric to move, and what limits the damage.',
});

export default defineSystem({
    id: 'chat-serving',
    category: 'fundamentals',
    name: 'Chat serving, end to end',
    kicker: 'Worked design',
    summary: 'A public LLM chat API, from client to KV cache, with the stores beside it.',
    intro: 'Chat for a public LLM API, where time to first token is the target every layer serves.',
    direction: { label: 'The request path', top: 'user', bottom: 'GPU memory' },
    topicsLabel: 'Beside the request path',
    trace: {
        down: 'request',
        up: 'tokens',
        goingLabel: 'request going down',
        returningLabel: 'tokens coming back',
        intro: 'Press Play to send one chat message down the stack and stream the answer back. Tap any layer to open it.',
        outro: 'On the way out, the gateway appends one usage record to Kafka and the new messages to the conversation store. Neither write holds up the stream.',
        steps: {
            clients: {
                head: 'The user sends a message',
                does: 'The app sends the conversation id and the new message over HTTPS and keeps the connection open for server-sent events. Going up, it renders each token as it arrives.',
                owner: 'the client teams',
            },
            gateway: {
                head: 'Authenticate, limit, assemble the prompt',
                does: 'The gateway checks the API key, takes a token from the organization’s rate-limit bucket, loads the conversation history, and builds the prompt. Going up, it relays each token as an event.',
                owner: 'the API platform team',
            },
            router: {
                head: 'Pick the GPU that already holds the prefix',
                does: 'The router sends the conversation back to the replica that served its last turn, so the history is already in KV cache. A new conversation goes to the least-loaded replica.',
                owner: 'the inference team',
            },
            gpus: {
                head: 'Join the running batch',
                does: 'The continuous batcher admits the request between decode steps. One prefill pass covers the new tokens, then each decode step adds one token for every request in the batch.',
                owner: 'the inference team',
            },
            kv: {
                head: 'Find cached blocks, allocate new ones',
                does: 'Blocks for the system prompt and history are found by hash and shared. New 16-token blocks are allocated as the answer grows, and freed when it ends.',
                owner: 'the inference team',
            },
        },
    },
    overview: {
        title: 'One design, five layers on the request path',
        sections: [
            {
                id: 'trace',
                label: 'Follow a request',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'KWON2023' }, { key: 'YU2022' }],
                blocks: [{ kind: 'lab', lab: 'request-trace', title: 'One message, down and back' }],
            },
            {
                id: 'requirements',
                label: 'Requirements',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_MODELS' }, { key: 'LITTLE1961' }],
                blocks: [
                    {
                        kind: 'table',
                        columns: ['Question', 'Answer for this design', 'What it decides'],
                        rows: [
                            ['Who consumes the output?', 'People watching a chat window.', 'Stream tokens; target time to first token.'],
                            ['How many?', `${fmt(INPUTS.users)} daily users, ${INPUTS.requestsPerUser} messages each, peak ${INPUTS.peakFactor}× the average.`, `${fmt(FLEET.peakRate)} requests per second at peak.`],
                            ['How long are requests?', `${fmt(INPUTS.promptTokens)} prompt tokens, ${fmt(INPUTS.outputTokens)} output tokens.`, 'KV cache per stream, and so GPUs.'],
                            ['How fast must tokens arrive?', `${INPUTS.tokensPerSecond} tokens per second per stream, faster than people read.`, 'How many streams one replica may batch.'],
                            ['What happens on failure?', 'A stream may restart. A message may never be billed twice.', 'Idempotency keys; usage log with replication.'],
                        ],
                    },
                    { kind: 'layers' },
                ],
            },
        ],
    },
    layers: [
        {
            id: 'clients',
            code: 'C1',
            name: 'Clients',
            products: 'web app, SDKs, agents',
            title: 'People waiting on a screen',
            lede: 'A person in a chat window feels the first token and the steady stream after it, more than total time.',
            sections: [
                {
                    id: 'consumer',
                    label: 'The consumer',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        { kind: 'lab', lab: 'consumer-question', title: 'One service, three consumers', sub: 'This design serves chat users. Switch consumers to see which boxes change.' },
                    ],
                },
                {
                    id: 'stream',
                    label: 'Streaming',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'The client opens one HTTP request and reads server-sent events: one per token, then a final usage event. A dropped connection retries with the same idempotency key, so nothing is billed twice.',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'gateway',
            code: 'C2',
            name: 'Gateway',
            products: 'auth, rate limits, streaming',
            title: 'Authenticate, limit, assemble, relay',
            lede: 'Stateless instances behind a load balancer check, count, assemble and stream every request.',
            sections: [
                {
                    id: 'spec',
                    label: 'Spec sheet',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'spec',
                            owns: 'API keys, per-organization quotas, prompt assembly and the token stream back to the client.',
                            neighbors: 'Reads history from the conversation store, asks the rate limiter for a token, sends the prompt to the router, writes a usage record to Kafka.',
                            pattern: 'Any API gateway: auth and quotas at the edge, business logic behind it.',
                            metrics: ['Requests per second and 5xx rate per instance', 'Rate-limit rejections per organization', 'Open streams per instance'],
                            knobs: ['Bucket size and refill rate per tier', 'Maximum output tokens per request', 'Stream idle timeout'],
                            failures: ['An instance dies and its open streams are cut', 'The rate limiter’s store goes down'],
                            boundary: 'Keep it stateless. Anything it must remember goes in the conversation store or the usage log.',
                        },
                    ],
                },
                {
                    id: 'limits',
                    label: 'Rate limits',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Each organization gets a token bucket with a capacity and a refill rate. A request takes tokens in proportion to its size, from a shared store that every gateway instance reads.',
                            ],
                        },
                    ],
                },
                { id: 'fail', label: 'Fail it', provenance: 'pedagogical', sourceRefs: [{ key: 'SDDD_MODELS' }], blocks: [drill(['gw', 'rl'])] },
            ],
        },
        {
            id: 'router',
            code: 'C3',
            name: 'Router',
            products: 'KV-aware routing',
            title: 'Send each conversation back to its cache',
            lede: 'A follow-up repeats the whole history, so sending it to the last replica turns most of its prefill into a cache hit.',
            sections: [
                {
                    id: 'why',
                    label: 'Why it is here',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ZHENG2024' }, { key: 'VLLM_V1' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Prefill sets time to first token and grows with the prompt. Deep in a conversation, that means thousands of history tokens.',
                                'The router maps each conversation or prefix hash to a replica, rebuilt from replica reports. It weighs that map against load, so one popular prefix cannot overload a replica.',
                            ],
                        },
                    ],
                },
                {
                    id: 'depth',
                    label: 'Go deep here',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: ['The router is load-bearing and specific to LLM serving. For an inference team, it sits in the center of the depth budget.'],
                        },
                        { kind: 'lab', lab: 'depth-budget', title: 'Where the depth goes' },
                    ],
                },
                { id: 'fail', label: 'Fail it', provenance: 'pedagogical', sourceRefs: [{ key: 'ZHENG2024' }], blocks: [drill(['router'])] },
            ],
        },
        {
            id: 'gpus',
            code: 'C4',
            name: 'GPU replicas',
            products: 'continuous batching',
            title: 'Keep every GPU’s batch full',
            lede: 'Each replica runs Llama 3 8B on one H100, and the batcher swaps requests in and out between decode steps.',
            sections: [
                {
                    id: 'batching',
                    label: 'Batching',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'YU2022' }, { key: 'KWON2023' }],
                    blocks: [
                        { kind: 'lab', lab: 'tradeoffs', props: { only: ['static-continuous'] }, title: 'Static or continuous batching' },
                        { kind: 'lab', lab: 'batching-curve', title: 'One decode step, many streams', sub: 'Throughput per GPU grows with batch size until compute or KV memory runs out.' },
                    ],
                },
                {
                    id: 'capacity',
                    label: 'How many',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'LITTLE1961' }, { key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }, { key: 'NVIDIA_A100' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `At ${fmt(FLEET.peakRate)} requests per second and about ${fmt(FLEET.timeInSystem, 1)} seconds each, Little’s law gives **${fmt(FLEET.concurrency)}** streams in flight. One replica holds ${FLEET.perReplica}, limited by ${FLEET.limiter}, so the fleet needs **${FLEET.replicas} replicas** on ${FLEET.gpus} GPUs (${FLEET.servers} eight-GPU servers) before headroom.`,
                            ],
                        },
                        { kind: 'lab', lab: 'capacity-estimator', title: 'From requirements to GPUs', sub: 'Change the answers and watch the fleet change.' },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'NVIDIA_H100' }],
                        text: 'Upper bounds from a simplified model. Real fleets add headroom for failures, deploys and traffic spikes.',
                    },
                },
                { id: 'fail', label: 'Fail it', provenance: 'pedagogical', sourceRefs: [{ key: 'YU2022' }], blocks: [drill(['gpu'])] },
            ],
        },
        {
            id: 'kv',
            code: 'C5',
            name: 'KV cache',
            products: 'paged, 16-token blocks',
            title: 'GPU memory decides the batch',
            lede: `At ${formatBytes(kvBytesPerToken(SERVING_MODELS.l8))} of keys and values per token, paging and a shared system prompt fit hundreds of streams on one replica.`,
            sections: [
                {
                    id: 'layout',
                    label: 'Memory layout',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }],
                    blocks: [
                        { kind: 'lab', lab: 'kv-layout', title: 'Where the KV cache memory goes' },
                        { kind: 'links', items: [{ to: '/systems/paged-kv-cache', label: 'PagedAttention KV cache, five layers deep', text: 'Block tables, prefix sharing, preemption and what to watch.' }] },
                    ],
                },
                { id: 'fail', label: 'Fail it', provenance: 'pedagogical', sourceRefs: [{ key: 'KWON2023' }], blocks: [drill(['kvfull'])] },
            ],
        },
    ],
    topics: [
        {
            id: 'store',
            code: 'S1',
            name: 'Conversation store',
            products: 'sharded Postgres',
            title: 'History, one shard per conversation',
            lede: 'Every request reads its conversation’s history and appends to it, so sharding by conversation id keeps both on one shard.',
            sections: [
                {
                    id: 'design',
                    label: 'Design',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'CITUS2021' }, { key: 'POSTGRES_HA' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Messages and conversations are distributed on `conversation_id` and co-located, so loading a conversation is one single-shard query. A separate table keyed by `user_id` lists each user’s conversations.',
                                'Each shard has a synchronous standby in the same region. A failed primary costs only its own users their history, for the length of a failover.',
                            ],
                        },
                        { kind: 'links', items: [{ to: '/systems/sharded-postgres', label: 'Sharded Postgres, five layers deep', text: 'Shard keys, routing, resharding and failover.' }] },
                    ],
                },
                { id: 'fail', label: 'Fail it', provenance: 'pedagogical', sourceRefs: [{ key: 'POSTGRES_HA' }], blocks: [drill(['pg'])] },
            ],
        },
        {
            id: 'usage',
            code: 'S2',
            name: 'Usage log',
            products: 'Kafka',
            title: 'Every request, recorded once, read many times',
            lede: 'Billing, analytics and abuse detection each read the same usage records from their own offset.',
            sections: [
                {
                    id: 'design',
                    label: 'Design',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KAFKA_PARTITIONER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'The gateway writes one record per request, keyed by organization so each customer’s records stay in order, with replication factor 3, `min.insync.replicas=2` and `acks=all`.',
                                'The write is asynchronous and buffered, so a slow broker delays billing by seconds and never delays a token.',
                            ],
                        },
                        { kind: 'lab', lab: 'kafka-partitions', title: 'Keys, partitions and the hot partition', sub: 'Keying by organization means the largest customer sets the hottest partition.' },
                        { kind: 'links', items: [{ to: '/systems/kafka-log', label: 'Kafka log, five layers deep', text: 'Partitions, replication, ordering and operations.' }] },
                    ],
                },
                { id: 'fail', label: 'Fail it', provenance: 'pedagogical', sourceRefs: [{ key: 'KAFKA_DOCS' }], blocks: [drill(['broker'])] },
            ],
        },
        {
            id: 'failures',
            code: 'F',
            name: 'Failure drill',
            title: 'Fail one box at a time',
            lede: 'For each box: what users see, which metric moves first, and what limits the damage.',
            sections: [
                {
                    id: 'drill',
                    label: 'Every failure',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KAFKA_DOCS' }, { key: 'KWON2023' }, { key: 'POSTGRES_HA' }],
                    blocks: [{ kind: 'lab', lab: 'failure-drill', title: 'Failure drill: chat serving', sub: 'Tap a box or pick a failure. The failed part turns red and its dependents dim.' }],
                },
                {
                    id: 'summary',
                    label: 'Design summary',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'SDDD_MODELS' }],
                    blocks: [{ kind: 'lab', lab: 'design-summary', title: 'The design in four lines' }],
                },
            ],
        },
    ],
});
