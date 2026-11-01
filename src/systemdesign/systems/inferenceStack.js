import { defineSystem } from '../model';
import {
    BATCH_DISCOUNT,
    CACHE_READ_SHARE,
    CACHE_TTL_MINUTES,
    CACHE_WRITE_SURCHARGE,
    DEEPSEEK_DAY,
    DEEPSEEK_V3,
    deepseekDay,
    formatUSD,
    H100,
    KV_MODELS,
    kvModel,
    LARGE_SMALL_PRICE_RATIO,
    LLAMA3_8B_WEIGHTS,
    minDecodeStep,
    ridgePoint,
    singleUserTokensPerSecond,
} from '../models/inference';
import { CROSS_DRILLS, GLOSSARY, LAYER_DRILLS, PHASES, QUIZZES, TIMELINE } from './inferenceData';

// Every number in the text is computed from the inference model, so the
// prose and the labs cannot disagree.
const TPS = Math.floor(singleUserTokensPerSecond());
const STEP_MS = (minDecodeStep() * 1e3).toFixed(1);
const RIDGE = Math.round(ridgePoint());
const TB_S = H100.bandwidth / 1e12;
const TFLOPS = Math.round(H100.bf16 / 1e12);
const NVLINK = Math.round(H100.nvlink / 1e9);
const WEIGHTS_GB = Math.round(LLAMA3_8B_WEIGHTS / 1e9);
const DAY = deepseekDay();
const pct = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
const kb = (id) => +(kvModel(id).bytes / 1000).toFixed(3);
const KV_405_OVER_DS = kvModel('l405').bytes / kvModel('dsv3').bytes;
const ACTIVE_ONE_IN = Math.round(DEEPSEEK_V3.totalParams / DEEPSEEK_V3.activeParams);

const LAYER_SPEC = (id, spec, sourceRefs) => ({ id: 'spec', label: 'Spec', provenance: 'modern', sourceRefs, blocks: [{ kind: 'spec', ...spec }] });

const PRACTICE = (id, sourceRefs) => ({
    id: 'practice',
    label: 'Practice',
    provenance: 'pedagogical',
    sourceRefs,
    blocks: [
        { kind: 'quiz', ...QUIZZES[id] },
        { kind: 'drill', title: 'Design drill', ...LAYER_DRILLS[id] },
    ],
});

const STACK_BOXES = [
    ['Your app', 'OpenAI-style SDKs'],
    ['AI gateway', 'LiteLLM, Portkey'],
    ['Inference platform', 'NVIDIA Dynamo, llm-d'],
    ['Inference engine', 'vLLM, SGLang, TensorRT-LLM'],
    ['Framework', 'PyTorch, torch.compile, CUDA graphs'],
    ['Kernels', 'FlashAttention, FlashMLA, DeepGEMM, Triton'],
    ['GPU', 'H100, HBM, NVLink, CUDA driver'],
];

export default defineSystem({
    id: 'ai-inference-stack',
    category: 'ai',
    name: 'The AI Inference Stack',
    kicker: 'Seven layers, call to GPU',
    summary: 'Every LLM request crosses seven layers of software before a GPU multiplies anything. What each layer owns, the pattern it reuses, the numbers that bound it and how it fails.',
    intro: 'Most of these layers are plumbing you already know how to build: gateways, schedulers, caches, load balancers and compilers. The payload is new, and so are the limits it hits. Each layer has the same tabs: what it does, a lab that runs its mechanism, a spec sheet, and practice.',
    direction: { label: 'Request path', top: 'call', bottom: 'GPU' },
    topicsLabel: 'Concepts and practice',
    trace: {
        down: 'request',
        up: 'tokens',
        goingLabel: 'request going down',
        returningLabel: 'tokens coming back',
        intro: 'A request leaves your code as one SDK call. Press Play to watch it fall through the seven layers, then watch the answer stream back up one token at a time.',
        outro: 'Prefill ran once and built the KV cache. Decode now adds one token per step, and each token travels back up through every layer to your app.',
        steps: {
            l1: { head: 'Build the prompt, open the stream', does: 'Your code assembles tools, the system prompt, documents and the conversation, then calls the SDK. The order of those parts decides how much of the prompt a cache can reuse.', owner: 'you' },
            l2: { head: 'Check the key, count the tokens, pick a provider', does: 'The gateway maps a virtual key to a real provider key, checks the token budget, routes by model and price, and writes the cost of the call to a log.', owner: 'your platform team' },
            l3: { head: 'Pick the replica that already holds the prefix', does: 'The platform sees the whole fleet. It routes the request to a replica with this prompt’s KV cache in memory, and it can send prefill and decode to separate GPU pools.', owner: 'NVIDIA, Red Hat and your team' },
            l4: { head: 'Join the running batch at the next step', does: 'The engine slots the request into its batch at the next forward pass, keeps its KV cache in paged blocks and reuses any cached prefix.', owner: 'open-source engine projects' },
            l5: { head: 'Run the forward pass', does: 'PyTorch defines the model’s layers and runs the forward pass. Compilation and CUDA graphs cut the CPU time spent launching GPU work each step.', owner: 'PyTorch' },
            l6: { head: 'Do the attention and the matrix math', does: 'Hand-tuned GPU programs run the hot operations. FlashAttention keeps attention scores in on-chip memory so they never round-trip through HBM.', owner: 'kernel authors' },
            l7: { head: 'Stream weights from memory, do the math', does: 'The GPU reads every weight and the batch’s KV cache from HBM, multiplies, and hands back one new token per request.', owner: 'NVIDIA' },
        },
    },
    overview: {
        title: 'Seven layers between your API call and a GPU',
        lede: 'The stack drawn as a rack, one tray per layer. A request goes down; tokens come back up. Pick a tray in the rack to open that layer.',
        sections: [
            {
                id: 'start',
                label: 'Start',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'META2024' }, { key: 'ANTHROPIC_CACHE' }, { key: 'SDDD_STACK' }],
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: `${TPS} tokens/s`, label: 'One user, one H100', note: `Best case for an 8B model at batch one: ${WEIGHTS_GB} GB of weights ÷ ${TB_S} TB/s.` },
                            { value: '7 layers', label: 'From the SDK call to the GPU' },
                            { value: `${TB_S} TB/s`, label: 'HBM bandwidth', note: 'Every decode step pulls all the weights through this pipe.' },
                            { value: pct(CACHE_READ_SHARE), label: 'Price of a cached input token', note: 'Share of the list input price, on Anthropic’s API.' },
                        ],
                    },
                    {
                        kind: 'links',
                        items: [
                            { to: '/systems/ai-inference-stack/concepts', label: 'New to LLM serving', text: 'Start with the physics in Concepts, then the engine (L4) and the chip (L7).' },
                            { to: '/systems/ai-inference-stack/l1', label: 'Building on model APIs', text: 'The layers you control without owning a GPU: your app (L1), the gateway (L2), caching and cost.' },
                            { to: '/systems/ai-inference-stack/l3', label: 'Running your own fleet', text: 'Platforms (L3) and engines (L4), the DeepSeek case study and the failures to watch.' },
                            { to: '/systems/ai-inference-stack/drills', label: 'Preparing for system design rounds', text: 'Concepts, then the spec sheets, the drills and the quiz.' },
                        ],
                    },
                    { kind: 'layers' },
                ],
            },
            {
                id: 'trace',
                label: 'Follow a request',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_STACK' }, { key: 'DYNAMO2025' }, { key: 'VLLM2023' }],
                blocks: [{ kind: 'lab', lab: 'request-trace', title: 'One request, down and back' }],
            },
            {
                id: 'history',
                label: 'History',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_STACK' }, { key: 'YU2022' }, { key: 'KWON2023' }, { key: 'ZHONG2024' }, { key: 'DYNAMO2025' }, { key: 'LLMD2025' }],
                blocks: [
                    {
                        kind: 'prose',
                        paras: [
                            'Two things pushed the stack apart. Engines got smart enough that one engine stopped being the whole story: continuous batching and paged memory made a single replica efficient. Then the work outgrew one replica.',
                            'Splitting prefill from decode, sharing KV cache across machines and routing by cache all need a layer that sees the whole fleet. In 2025 that layer shipped as products: NVIDIA Dynamo and llm-d.',
                        ],
                    },
                    {
                        kind: 'lab',
                        lab: 'stack-morph',
                        title: 'How the stack grew',
                        sub: 'Switch between the two pictures.',
                        props: {
                            before: {
                                label: '2023 picture',
                                boxes: [
                                    { name: 'Your code', sub: 'calls the engine directly' },
                                    { name: 'vLLM', sub: 'the engine' },
                                    { name: '“The model”', sub: 'framework, kernels and GPU as one box', grow: 3 },
                                ],
                                note: '**A common 2023 picture:** your code, vLLM and “the model”. Everything below the engine was one box, and nothing sat between your code and the engine.',
                            },
                            after: {
                                label: '2026 stack',
                                boxes: STACK_BOXES.map(([name, sub], i) => ({ name: `L${i + 1} ${name}`, sub, color: i + 1 })),
                                note: '**The 2026 stack:** seven layers. A gateway and a platform sit above the engine, and PyTorch, the kernels and the GPU each have their own owner.',
                            },
                        },
                    },
                ],
            },
            {
                id: 'ownership',
                label: 'Ownership',
                provenance: 'modern',
                sourceRefs: [{ key: 'LITELLM' }, { key: 'PORTKEY' }, { key: 'DYNAMO2025' }, { key: 'LLMD2025' }, { key: 'VLLM2023' }, { key: 'SHAH2024' }, { key: 'NVIDIA_H100' }],
                blocks: [
                    {
                        kind: 'table',
                        layerColumn: true,
                        columns: ['Layer', 'Its job', 'Who owns it', 'Marquee products'],
                        rows: [
                            ['l1', 'Your app: the SDK call', 'You', 'OpenAI-style SDKs, `chat.completions.create()`'],
                            ['l2', 'AI gateway: keys, budgets, routing', 'Your platform team', 'LiteLLM, Portkey'],
                            ['l3', 'Inference platform: the fleet, routing, prefill and decode split, KV movement', 'NVIDIA, Red Hat, you', 'NVIDIA Dynamo, llm-d, NIXL, Mooncake KV pool'],
                            ['l4', 'Inference engine: one replica, the batch, KV pages', 'Open-source projects', 'vLLM, SGLang, TensorRT-LLM'],
                            ['l5', 'Framework: the model’s forward pass', 'PyTorch', 'PyTorch, torch.compile, CUDA graphs'],
                            ['l6', 'Kernels: attention and matrix multiply', 'Kernel authors', 'FlashAttention, FlashMLA, DeepGEMM, Triton kernels'],
                            ['l7', 'GPU: compute, HBM, NVLink', 'NVIDIA', 'H100, B200, GB200, CUDA driver'],
                        ],
                    },
                    {
                        kind: 'note',
                        text: 'One name, two layers: “Triton” from OpenAI is a kernel language (L6). “Triton” from NVIDIA was an inference server and is now Dynamo-Triton (L3).',
                    },
                ],
            },
            {
                id: 'timeline',
                label: 'Timeline',
                provenance: 'paper',
                sourceRefs: [{ key: 'YU2022' }, { key: 'KWON2023' }, { key: 'ZHENG2024' }, { key: 'ZHONG2024' }, { key: 'QIN2024' }, { key: 'SHAH2024' }, { key: 'ANTHROPIC_CACHE' }, { key: 'DEEPSEEK_V3' }, { key: 'VLLM_V1' }, { key: 'DEEPSEEK_INFER' }, { key: 'DYNAMO2025' }, { key: 'LMSYS2025' }, { key: 'LLMD2025' }],
                blocks: [
                    { kind: 'prose', paras: ['From smart engines to a fleet layer above them. Papers first, then the products that shipped their ideas.'] },
                    { kind: 'timeline', events: TIMELINE },
                ],
            },
        ],
    },
    layers: [
        {
            id: 'l1',
            code: 'L1',
            name: 'Your app',
            products: 'OpenAI-style SDKs',
            title: 'Your code decides what reaches the GPU',
            lede: 'The cheapest token is one that never needs computing. Prompt length, answer length and prompt order are all set here, before any infrastructure sees the request.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Every request starts as one SDK call. Your code builds the prompt from parts: tool definitions, the system prompt, documents, the conversation so far and the newest user message. Then it asks for a model, a token limit and a stream.',
                                'Three choices here move cost and latency more than most infrastructure work. The order of the parts decides how much of the prompt a cache can reuse. The token limit caps the most expensive tokens. Streaming shapes what the user feels as latency.',
                                'Anthropic’s cache follows the order tools, then system, then messages. A change at one level invalidates that level and everything after it. Prompts shorter than a model’s minimum cacheable length are not cached at all, and no error says so.',
                            ],
                        },
                        {
                            kind: 'code',
                            code: 'response = client.chat.completions.create(\n    model="...",\n    messages=[tools, system, docs, *history, user],  # 1\n    max_tokens=1024,                                 # 2\n    stream=True,                                     # 3\n)',
                            notes: [
                                '**Order.** Caches match from the first token. Parts that never change go first.',
                                '**Length.** Output tokens cost more than input tokens, and an answer cut off at the limit still returns success.',
                                '**Streaming.** Tokens reach the user as decode makes them, so the wait feels like time to first token.',
                            ],
                        },
                    ],
                },
                {
                    id: 'prompt-lab',
                    label: 'Prompt lab',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'prompt-order',
                            title: 'Order the prompt for the cache',
                            sub: 'This prompt opens with a timestamp. Fix the order and watch the cached prefix run further.',
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                        text: 'Block sizes are example token counts. The prices follow Anthropic’s published cache read share.',
                    },
                },
                LAYER_SPEC(
                    'l1',
                    {
                        owns: 'Prompt assembly, model choice, token limits, streaming, and the latency your user feels.',
                        neighbors: 'Sends one request (`messages`, `model`, `max_tokens`, `stream`). Receives a stream of tokens and a usage record.',
                        pattern: 'Cache-key design. A prompt prefix is a cache key, so it needs deterministic serialization, the way an HTTP cache needs stable URLs.',
                        metrics: ['Input and output tokens per request', 'Share of input read from cache (`cache_read_input_tokens`)', 'Share of answers ending with `finish_reason = length`', 'Time to first token as the client sees it'],
                        knobs: ['Order of prompt parts', '`max_tokens` and stop sequences', 'Streaming on or off', 'Model per task', 'Batch API for work that can wait'],
                        failures: ['Timestamps, request IDs or unsorted JSON keys at the front of the prompt make every request miss the cache', 'Unbounded conversation history grows cost and eventually overflows the context window', 'Non-streaming calls hit client timeouts on long answers'],
                        boundary: 'Put retrieved documents before the conversation when they stay fixed for a session. Put them after when they change every turn, so the history stays cacheable.',
                    },
                    [{ key: 'ANTHROPIC_CACHE' }, { key: 'ANTHROPIC_BATCH' }]
                ),
                PRACTICE('l1', [{ key: 'ANTHROPIC_CACHE' }]),
            ],
        },
        {
            id: 'l2',
            code: 'L2',
            name: 'AI gateway',
            products: 'LiteLLM, Portkey',
            title: 'The front door counts tokens',
            lede: 'An AI gateway looks like the API gateways web teams have run for decades. The unit of cost changed from the request to the token, and that changes every policy.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'LITELLM' }, { key: 'PORTKEY' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'The gateway sits between your code and every model provider. LiteLLM puts more than 100 providers behind one OpenAI-style interface. Portkey adds retries, fallbacks, load balancing and guardrails.',
                                'A token stopped here never reaches a GPU, which makes the gateway the second-cheapest place to save money after your own code. It is also the only place that sees every call’s cost, so it doubles as the system of record for spend.',
                            ],
                        },
                        {
                            kind: 'compare',
                            a: 'Web API gateway',
                            b: 'AI gateway',
                            rows: [
                                { label: 'Rate-limit unit', a: 'Requests per second', b: 'Tokens per minute, dollars per month', note: 'One long prompt can cost as much as thousands of short ones.' },
                                { label: 'Cost of one call', a: 'About the same for every call', b: 'Set by prompt and answer length' },
                                { label: 'Cost known at admission', a: 'Yes', b: 'No: output length arrives with the answer' },
                                { label: 'A retry', a: 'Cheap and idempotent', b: 'Bills every token again', note: 'Portkey caps retries at 5 attempts, with backoff.' },
                                { label: 'Routing', a: 'Round robin over identical replicas', b: 'By model, price, region and provider health' },
                                { label: 'What gets logged', a: 'Status code and latency', b: 'Tokens in, tokens out, cache hits, dollars' },
                            ],
                        },
                    ],
                },
                {
                    id: 'simulator',
                    label: 'Simulator',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'LITELLM' }, { key: 'PORTKEY' }],
                    blocks: [
                        {
                            kind: 'lab',
                            lab: 'gateway-sim',
                            title: 'Run traffic through the gateway',
                            sub: 'Raise the traffic until the token budget runs dry, route requests to the small model, or take the large model down.',
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'PORTKEY' }],
                        text: 'Traffic, token counts and prices in the simulator are illustrative. The mechanisms (token buckets, capped retries, fallbacks) follow the gateway projects.',
                    },
                },
                LAYER_SPEC(
                    'l2',
                    {
                        owns: 'Authentication with virtual keys, quotas in tokens and dollars, routing across models and providers, retries and fallbacks, guardrails and the cost log.',
                        neighbors: 'Accepts OpenAI-style requests from many apps. Sends provider-specific requests out. Emits one cost record per call.',
                        pattern: 'API gateway plus token-bucket rate limiter plus circuit breaker. The twist: the cost of a request is unknown until the answer finishes, so admission reserves an estimate and reconciles the real usage afterward.',
                        metrics: ['Tokens per minute per key and per team', 'Spend per team against budget', 'Error, retry and fallback rate per provider', 'Latency the gateway adds'],
                        knobs: ['Limits in tokens per minute and requests per minute', 'Monthly budgets per key', 'Routing rules by model, price and health', 'Retry caps, backoff and timeouts', 'Fallback chains'],
                        failures: ['A retry storm re-bills every input token', 'A fallback model answers differently, so quality drifts silently', 'Limits counted in requests let one tenant with long prompts burn the shared budget', 'A buffering proxy breaks streaming'],
                        boundary: 'Run a central proxy when many teams share providers and you need one budget and one log. Use the library inside the app when there is one app and the extra hop costs more than the governance is worth. LiteLLM ships both forms.',
                    },
                    [{ key: 'LITELLM' }, { key: 'PORTKEY' }]
                ),
                PRACTICE('l2', [{ key: 'LITELLM' }, { key: 'PORTKEY' }]),
            ],
        },
        {
            id: 'l3',
            code: 'L3',
            name: 'Inference platform',
            products: 'NVIDIA Dynamo, llm-d',
            title: 'A scheduler for the fleet',
            lede: 'An engine runs one copy of a model on one machine. A platform runs many copies and decides which one gets each request, which GPUs do prefill and which do decode.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'DYNAMO2025' }, { key: 'LLMD2025' }, { key: 'ZHONG2024' }, { key: 'QIN2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Scope is the cleanest test. A decision that needs to know about more than one replica belongs to the platform.',
                                'NVIDIA Dynamo sits above vLLM, SGLang and TensorRT-LLM with a planner that resizes GPU pools, a router that sends requests where their KV cache already lives, a memory manager that offloads KV cache to cheaper storage, and NIXL, a library that moves KV cache between GPUs. llm-d builds the same ideas on Kubernetes, with vLLM as the engine and LMCache for offload.',
                            ],
                        },
                        {
                            kind: 'compare',
                            a: 'Inference engine',
                            b: 'Inference platform',
                            rows: [
                                { label: 'Scope', a: 'One model replica on one node', b: 'A fleet of replicas across nodes' },
                                { label: 'Decides', a: 'Which requests run in the next step', b: 'Which replica gets the request' },
                                { label: 'KV cache', a: 'Paged blocks in one GPU’s memory', b: 'Moved between GPUs, CPU memory and SSD' },
                                { label: 'Prefill and decode', a: 'Mixed in one batch by chunked prefill', b: 'Split onto separate GPU pools' },
                                { label: 'Scaling', a: 'A fixed set of GPUs', b: 'A planner adds and removes GPUs per pool' },
                                { label: 'Examples', a: 'vLLM, SGLang, TensorRT-LLM', b: 'NVIDIA Dynamo, llm-d' },
                            ],
                        },
                        {
                            kind: 'stats',
                            items: [
                                { value: '7.4×', label: 'more requests within latency targets', note: 'DistServe' },
                                { value: '75%', label: 'more requests under real load', note: 'Mooncake, serving Kimi' },
                                { value: '30×', label: 'more requests served, DeepSeek-R1 on GB200 NVL72', note: 'NVIDIA Dynamo' },
                            ],
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ZHONG2024' }, { key: 'QIN2024' }, { key: 'DYNAMO2025' }],
                        text: 'Each figure is its authors’ own benchmark against their own baseline. Compare the mechanisms, and treat the multiples as upper bounds.',
                    },
                },
                {
                    id: 'phase-split',
                    label: 'Phase split',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ZHONG2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Prefill and decode show up at two layers, and both copies earn their place. Inside one engine, the scheduler mixes the phases in each step so neither starves. Across a fleet, the platform can give each phase its own GPUs, sized and parallelized for its own bottleneck.',
                            ],
                        },
                        { kind: 'lab', lab: 'pd-split', title: 'Watch one user’s tokens', sub: 'Switch modes and compare the longest pause between tokens.' },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ZHONG2024' }],
                        text: 'Step timings are illustrative. The mechanism, a long prefill stalling every decode that shares its step, follows DistServe.',
                    },
                },
                {
                    id: 'architecture',
                    label: 'Architecture',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ZHONG2024' }, { key: 'DYNAMO2025' }, { key: 'QIN2024' }, { key: 'LLMD2025' }, { key: 'DEEPSEEK_INFER' }],
                    blocks: [
                        {
                            kind: 'list',
                            style: 'cards',
                            items: [
                                { title: 'KV-aware router.', text: 'Picks a replica by cached prefix, weighed against load.' },
                                { title: 'Prefill pool.', text: 'Compute-bound. Sets time to first token.' },
                                { title: 'KV transfer.', text: 'NIXL or RDMA moves the finished KV cache from the prefill GPU to a decode GPU.' },
                                { title: 'Decode pool.', text: 'Memory-bound. Sets time per output token.' },
                                { title: 'Shared KV pool.', text: 'CPU memory and SSD: Mooncake, LMCache, DeepSeek’s 3FS.' },
                                { title: 'Planner.', text: 'Resizes each pool as the mix of long prompts and long answers shifts.' },
                            ],
                        },
                    ],
                },
                LAYER_SPEC(
                    'l3',
                    {
                        owns: 'Replica selection across the fleet, KV-aware routing, prefill and decode disaggregation, KV transfer between GPUs, KV offload tiers and autoscaling per pool.',
                        neighbors: 'Receives requests from the gateway. Dispatches them to engine workers and moves KV cache between them.',
                        pattern: 'A layer-7 load balancer with session affinity, plus a cluster scheduler, plus a distributed cache tier. Prefix affinity works like consistent hashing on the prompt’s first blocks.',
                        metrics: ['Prefix hit rate per replica', 'Queue depth and utilization per pool', 'KV transfer time between pools', 'Time to first token and time per output token per pool', 'Goodput: requests that met their latency target'],
                        knobs: ['Routing score: cache overlap against current load', 'Ratio of prefill GPUs to decode GPUs', 'KV offload tiers: GPU, CPU memory, SSD', 'Scale-up and scale-down thresholds per pool'],
                        failures: ['One popular system prompt pins traffic to one replica and creates a hot spot', 'Slow interconnect makes KV transfer cost more than it saves', 'Scaling down evicts warm caches and hit rate falls'],
                        boundary: 'Split prefill from decode when prompts are long and both latency targets are tight. Keep them on one pool when prompts are short or the fleet is small, because the KV transfer then costs more than the interference it removes.',
                    },
                    [{ key: 'DYNAMO2025' }, { key: 'LLMD2025' }, { key: 'ZHONG2024' }]
                ),
                PRACTICE('l3', [{ key: 'ZHONG2024' }, { key: 'DYNAMO2025' }]),
            ],
        },
        {
            id: 'l4',
            code: 'L4',
            name: 'Inference engine',
            products: 'vLLM, SGLang, TensorRT-LLM',
            title: 'Keep the batch full',
            lede: 'A GPU makes tokens cheaply only when it makes many at once, because each decode step reads every weight from memory whether the batch holds one request or two hundred.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'YU2022' }, { key: 'KWON2023' }, { key: 'VLLM_V1' }, { key: 'ZHENG2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Two papers built the modern engine. Orca scheduled one iteration at a time instead of one request at a time: a finished request leaves the batch at the next step, and a waiting one takes its seat. PagedAttention fixed the memory side. Engines had reserved one contiguous slab of KV cache per request, sized for the longest possible answer, and most of it sat empty. vLLM keeps the cache in small fixed-size blocks instead, allocated as the answer grows.',
                                'vLLM’s V1 core, released in January 2025, folded these ideas into one scheduler. It treats prompt tokens and output tokens alike, gives each step a token budget and keeps prefix caching on by default. SGLang pushed prefix reuse further with RadixAttention.',
                                'Read the engine as an operating system for one model: a scheduler that time-slices every step, a virtual memory system for the KV cache, and an LRU cache for prefixes.',
                            ],
                        },
                        {
                            kind: 'stats',
                            items: [
                                { value: '36.9×', label: 'Orca: throughput at equal latency', note: 'against FasterTransformer, GPT-3 175B' },
                                { value: '2× to 4×', label: 'PagedAttention: throughput', note: 'against FasterTransformer and Orca' },
                                { value: 'up to 6.4×', label: 'SGLang: throughput', note: 'against earlier systems' },
                                { value: '1.7×', label: 'vLLM V1: throughput over the V0 core' },
                            ],
                        },
                    ],
                },
                {
                    id: 'batching',
                    label: 'Batching',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'YU2022' }],
                    blocks: [{ kind: 'lab', lab: 'batching-race', title: 'Static against continuous batching', sub: 'Same queue, same six slots. Dashed outlines show each request’s full length.' }],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'YU2022' }],
                        text: 'Request lengths are generated for the lab. The scheduling rule, admit and retire at every step, is Orca’s.',
                    },
                },
                {
                    id: 'paging',
                    label: 'Paging',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }],
                    blocks: [
                        { kind: 'lab', lab: 'kv-layout', title: 'Watch GPU memory fill', sub: 'Each cell is one block of KV cache. Switch between slabs and pages.' },
                        {
                            kind: 'links',
                            items: [{ to: '/systems/paged-kv-cache', label: 'PagedAttention KV cache, five layers deep', text: 'Block tables, prefix sharing, preemption and what to watch.' }],
                        },
                    ],
                },
                LAYER_SPEC(
                    'l4',
                    {
                        owns: 'The per-step schedule (continuous batching, chunked prefill), KV memory (paged blocks, prefix cache, eviction), preemption, sampling and speculative decoding for one model replica.',
                        neighbors: 'Takes prompts and sampling parameters. Streams tokens back. Runs one replica, which may span several GPUs through tensor parallelism.',
                        pattern: 'An operating system: a scheduler that time-slices every step, virtual memory with page tables and copy-on-write, and an LRU cache for prefixes.',
                        metrics: ['Running and waiting requests', 'KV cache usage', 'Preemptions and recomputed requests', 'Tokens in each step’s batch', 'Prefix cache hit rate'],
                        knobs: ['Token budget per step (max batched tokens)', 'Maximum concurrent sequences', 'GPU memory fraction for KV cache', 'Chunked prefill size', 'Tensor parallel size and quantization'],
                        failures: ['KV cache fills up, the engine preempts requests and throughput collapses', 'A large step budget lets long prefills raise time per output token', 'A small budget leaves the GPU underused'],
                        boundary: 'Raise the batch until time per output token hits its target or the KV cache fills, whichever comes first. Past that point, add replicas.',
                    },
                    [{ key: 'VLLM_V1' }, { key: 'KWON2023' }, { key: 'YU2022' }]
                ),
                PRACTICE('l4', [{ key: 'KWON2023' }, { key: 'YU2022' }]),
            ],
        },
        {
            id: 'l5',
            code: 'L5',
            name: 'Framework',
            products: 'PyTorch, torch.compile, CUDA graphs',
            title: 'Where CPU overhead hides',
            lede: 'PyTorch defines the forward pass. Below a certain batch size, the time the CPU spends launching GPU work can rival the work itself.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'VLLM_V1' }, { key: 'META2024' }, { key: 'DEEPSEEK_V3' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'The framework holds the model: its layers, its attention variant, its mixture-of-experts routing, its weights. The engine calls the forward pass once per step. In eager mode PyTorch launches each operation from Python, one GPU kernel at a time, and decode kernels are small enough that the launches show.',
                                'Two tools cut that overhead. `torch.compile` fuses many small operations into fewer, larger kernels. CUDA graphs record a whole step once and replay it with a single launch. vLLM’s V1 core uses both, including piecewise CUDA graphs, and credits lower CPU overhead for its 1.7× throughput gain over V0.',
                                `Model architecture choices also live here, and they ripple down the stack. Grouped-query attention gives every Llama 3 size 8 KV heads, which shrinks the KV cache. DeepSeek’s latent attention shrinks it further, and its mixture of experts activates ${DEEPSEEK_V3.activeParams / 1e9} billion of ${DEEPSEEK_V3.totalParams / 1e9} billion parameters per token.`,
                            ],
                        },
                    ],
                },
                {
                    id: 'launches',
                    label: 'Launches',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'VLLM_V1' }],
                    blocks: [{ kind: 'lab', lab: 'launch-overhead', title: 'Where a decode step’s time goes', sub: 'Two lanes: the CPU launching work, and the GPU doing it. Hatched stretches are GPU idle time.' }],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'VLLM_V1' }],
                        text: 'Kernel counts and timings are illustrative. The effect, fewer launches leaving fewer idle gaps, is what vLLM V1 reports.',
                    },
                },
                LAYER_SPEC(
                    'l5',
                    {
                        owns: 'The model definition (attention variant, mixture-of-experts routing), weight loading, compilation, CUDA graph capture and the collective communication calls between GPUs.',
                        neighbors: 'Takes token IDs, positions and KV block tables as tensors. Returns logits for the next token.',
                        pattern: 'A JIT compiler and runtime. Graph capture removes interpreter overhead the way a JIT removes the cost of dispatching each bytecode.',
                        metrics: ['CPU time per step', 'Kernel launches per step', 'GPU idle gaps in a profiler trace', 'Compile and warm-up time at startup'],
                        knobs: ['`torch.compile` on or off', 'Batch sizes captured as CUDA graphs', 'Data type: BF16, FP8', 'Attention backend'],
                        failures: ['A new input shape triggers recompilation and a latency spike', 'Each captured CUDA graph holds GPU memory', 'A shape outside the captured set falls back to slower eager mode'],
                        boundary: 'Capture CUDA graphs for the batch sizes you actually serve and pad to the nearest one. Capturing every size costs memory and startup time.',
                    },
                    [{ key: 'VLLM_V1' }]
                ),
                PRACTICE('l5', [{ key: 'VLLM_V1' }]),
            ],
        },
        {
            id: 'l6',
            code: 'L6',
            name: 'Kernels',
            products: 'FlashAttention, FlashMLA, DeepGEMM, Triton',
            title: 'Kernels turn model tricks into speed',
            lede: 'A kernel is a hand-tuned GPU program for one hot operation. Attention and matrix multiply take most of a forward pass, so their kernels set how close a model gets to the hardware’s peak.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'SHAH2024' }, { key: 'DEEPSEEK_INFER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'FlashAttention computes attention in tiles that fit in the GPU’s on-chip memory, so the full matrix of attention scores never travels to HBM and back. FlashAttention-3, written for Hopper GPUs, reaches 740 TFLOPS in FP16, 75% of the H100’s peak, and runs 1.5× to 2× faster than FlashAttention-2. Its FP8 path has 2.6× lower numerical error than a baseline FP8 attention method.',
                                'Model-specific kernels matter as much. DeepSeek’s FlashMLA decodes its latent attention on Hopper GPUs, and DeepGEMM runs its FP8 matrix multiplies. Many newer kernels are written in Triton, OpenAI’s Python-like language for GPU programs. The technique underneath is old: tile the work so it fits in fast memory, and fuse steps so intermediates never leave it.',
                            ],
                        },
                    ],
                },
                {
                    id: 'flash',
                    label: 'FlashAttention',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'SHAH2024' }],
                    blocks: [{ kind: 'lab', lab: 'flash-traffic', title: 'Standard attention against FlashAttention', sub: 'Drag the prompt length and watch the HBM traffic for scores.' }],
                },
                {
                    id: 'tritons',
                    label: 'Two Tritons',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'DYNAMO2025' }],
                    blocks: [
                        {
                            kind: 'compare',
                            a: 'Triton (OpenAI)',
                            b: 'Triton (NVIDIA)',
                            rows: [
                                { label: 'What it is', a: 'A Python-like language for writing GPU kernels', b: 'A model-serving server, now Dynamo-Triton' },
                                { label: 'Layer', a: 'L6, kernels', b: 'L3, serving and orchestration' },
                                { label: 'You use it to', a: 'Write a fused kernel without raw CUDA', b: 'Deploy models behind an inference endpoint' },
                                { label: 'Since 2025', a: 'Used across engines for custom kernels', b: 'Part of the NVIDIA Dynamo platform' },
                            ],
                        },
                    ],
                },
                LAYER_SPEC(
                    'l6',
                    {
                        owns: 'The hot loops: attention (FlashAttention, paged attention, FlashMLA), matrix multiply (cuBLAS, CUTLASS, DeepGEMM), expert dispatch, quantized matmuls and fused small operations.',
                        neighbors: 'Reads tensors from HBM, computes, writes results back, and tries to move as few bytes as possible.',
                        pattern: 'Cache blocking and loop fusion from classic high-performance computing: work on tiles that fit in fast memory, and never write an intermediate you can recompute.',
                        metrics: ['Achieved TFLOPS against peak', 'Achieved memory bandwidth against peak', 'Kernel time share in a profile'],
                        knobs: ['Kernel choice per shape', 'Tile sizes', 'Precision: FP16, BF16, FP8', 'CUDA, CUTLASS or Triton'],
                        failures: ['A new model shape has no tuned kernel and falls back to a slow path', 'Low precision loses accuracy without careful scaling', 'A kernel tuned for one GPU generation runs poorly on the next'],
                        boundary: 'Write a kernel in Triton to get a fused operation working quickly. Move to CUDA or CUTLASS when the profile says that kernel dominates the step and the last stretch of speed pays for itself.',
                    },
                    [{ key: 'SHAH2024' }, { key: 'DEEPSEEK_INFER' }]
                ),
                PRACTICE('l6', [{ key: 'SHAH2024' }, { key: 'DYNAMO2025' }]),
            ],
        },
        {
            id: 'l7',
            code: 'L7',
            name: 'GPU',
            products: 'H100, HBM, NVLink',
            title: 'Decode is a memory-bandwidth problem',
            lede: 'An H100 can do far more math than its memory can feed during decode. Every layer above exists to keep this chip busy.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'META2024' }, { key: 'ZHAO2025' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `An H100 can do ${TFLOPS} TFLOPS of dense BF16 math but reads only ${TB_S} TB/s from its memory. To keep its tensor cores busy, a kernel must do about **${RIDGE} FLOPs per byte** it reads. Decode at batch size one does about one: each weight is read to make one token.`,
                                `Llama 3 8B is ${WEIGHTS_GB} GB of BF16 weights. One decode step takes at least ${STEP_MS} ms however fast the math is, so a lone user gets at most **${TPS} tokens/s**.`,
                                `Between GPUs, NVLink carries ${NVLINK} GB/s inside a node; across nodes the network becomes the limit. DeepSeek’s hardware paper estimates its model’s decode ceiling at 67 tokens/s over 400 Gbps InfiniBand and 1,200 tokens/s on a GB200 NVL72.`,
                            ],
                        },
                        {
                            kind: 'stats',
                            items: [
                                { value: `${TFLOPS} TFLOPS`, label: 'dense BF16 math' },
                                { value: `${TB_S} TB/s`, label: 'HBM bandwidth' },
                                { value: `${H100.memory / 1e9} GB`, label: 'HBM capacity' },
                                { value: `${NVLINK} GB/s`, label: 'NVLink, GPU to GPU' },
                            ],
                        },
                    ],
                    caveat: {
                        provenance: 'paper',
                        sourceRefs: [{ key: 'NVIDIA_H100' }],
                        text: 'NVIDIA lists 1,979 BF16 TFLOPS with sparsity. Dense matrix math runs at half that, the figure used here.',
                    },
                },
                {
                    id: 'batch-lab',
                    label: 'Batch lab',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'META2024' }],
                    blocks: [{ kind: 'lab', lab: 'decode-batch', title: 'Fill the batch', sub: 'One decode step on H100 datasheet numbers, priced at $2 per GPU-hour. Peaks only: real engines land below these numbers.' }],
                },
                {
                    id: 'roofline',
                    label: 'Roofline',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'NVIDIA_H100' }],
                    blocks: [{ kind: 'lab', lab: 'roofline', title: 'The H100 roofline', sub: 'Move the workload and watch which ceiling it hits.' }],
                },
                LAYER_SPEC(
                    'l7',
                    {
                        owns: 'Compute (tensor cores), memory (HBM capacity and bandwidth), and the links between GPUs (NVLink inside a node, InfiniBand or RDMA across nodes).',
                        neighbors: 'Runs kernels. Its physical limits set the ceiling for every layer above.',
                        pattern: 'A memory hierarchy and the roofline model, the same reasoning as CPU caches against DRAM bandwidth.',
                        metrics: ['Memory bandwidth utilization', 'HBM in use', 'NVLink and network traffic', 'Power and clocks'],
                        knobs: ['GPU model and count', 'Parallelism: tensor, pipeline, expert', 'Precision the hardware supports', 'Node and network topology'],
                        failures: ['Out of memory when weights plus KV cache exceed HBM', 'Expert-parallel all-to-all traffic saturates the network', 'Uneven expert load leaves one GPU as the straggler'],
                        boundary: 'Split a replica across more GPUs when the model does not fit or one user’s latency matters most. Add replicas when total throughput matters most, because every extra GPU per replica adds communication.',
                    },
                    [{ key: 'NVIDIA_H100' }, { key: 'ZHAO2025' }]
                ),
                PRACTICE('l7', [{ key: 'NVIDIA_H100' }]),
            ],
        },
    ],
    topics: [
        {
            id: 'concepts',
            code: 'C',
            name: 'Concepts',
            products: 'read this first',
            title: 'Five ideas explain most of the stack',
            lede: 'Tokens, the two phases of a request, the KV cache, the latency metrics and the roofline. Each layer’s design follows from these.',
            sections: [
                {
                    id: 'phases',
                    label: 'Phases',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'ZHONG2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'A request runs in two phases. **Prefill** reads the whole prompt in one forward pass. Every prompt token is processed in parallel, and each one writes its attention keys and values to the KV cache. **Decode** then produces the answer one token per forward pass. Each new token reads every cached key and value, then adds its own.',
                                'The phases stress different hardware. Prefill does a lot of math per weight it reads, so compute limits it. Decode does one token of math per request for every weight it reads, so memory bandwidth limits it. Almost every design choice in the stack is about one of these two facts.',
                            ],
                        },
                        { kind: 'lab', lab: 'phases', props: PHASES, title: 'One request, pass by pass', sub: 'Step through it. Count the forward passes and the cache entries read.' },
                    ],
                },
                {
                    id: 'kv',
                    label: 'KV cache',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'META2024' }, { key: 'LLAMA_CONFIGS' }, { key: 'ZHAO2025' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'The KV cache holds, for every token so far, the attention keys and values of every layer. Its size per token is fixed by the model’s shape: 2 (keys and values) × layers × KV heads × head dimension × bytes per value. It grows linearly with prompt length and with the number of requests in memory.',
                                'That makes it the resource most layers fight over. The engine pages it. The platform routes by it and moves it between machines. Model designers shrink it with grouped-query attention and latent attention.',
                            ],
                        },
                        { kind: 'lab', lab: 'kv-sizer', title: 'Size the KV cache', sub: 'Pick a model, a context length and a number of requests held in memory at once.' },
                    ],
                },
                {
                    id: 'latency',
                    label: 'Latency',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'ZHONG2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Four numbers describe an inference service. **Time to first token** (TTFT) is queueing plus prefill. **Time per output token** (TPOT), also called inter-token latency, is the decode step time one user sees. **Throughput** is tokens per second across every request. **Goodput** counts only the requests that met their latency targets, which is the number DistServe optimizes.',
                                'End-to-end latency for one answer is TTFT + (output tokens − 1) × TPOT. Long answers are dominated by TPOT; short answers by TTFT.',
                            ],
                        },
                        { kind: 'lab', lab: 'latency-feel', title: 'Feel the latency', sub: 'Set the two speeds and the answer length, then stream a sample answer at that pace.' },
                    ],
                },
                {
                    id: 'roofline',
                    label: 'Roofline',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'NVIDIA_H100' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `A GPU has two speeds: how fast it does math and how fast it reads memory. An H100 does ${TFLOPS} TFLOPS of dense BF16 math and reads ${TB_S} TB/s. Divide one by the other and you get the **ridge point**: a kernel must do about ${RIDGE} FLOPs per byte it reads before the math, and not the memory, becomes the limit.`,
                                'Decode reuses each weight once per request in the batch, so its intensity is roughly the batch size. Prefill reuses each weight once per prompt token, so its intensity is roughly the prompt length. That one fact explains batching, chunked prefill, disaggregation and FP8.',
                            ],
                        },
                        { kind: 'lab', lab: 'roofline', title: 'The H100 roofline', sub: 'Pick a workload. Left of the ridge, memory bandwidth sets the speed; right of it, math does.' },
                    ],
                },
                {
                    id: 'glossary',
                    label: 'Glossary',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'YU2022' }, { key: 'KWON2023' }, { key: 'ZHENG2024' }, { key: 'ZHONG2024' }, { key: 'QIN2024' }, { key: 'DEEPSEEK_V3' }],
                    blocks: [{ kind: 'lab', lab: 'glossary', props: { terms: GLOSSARY }, title: 'Terms you will meet', sub: 'Each term links to the layer where it lives.' }],
                },
            ],
        },
        {
            id: 'caching',
            code: '$',
            name: 'Caching',
            products: 'across L1, L3 and L4',
            title: 'A cached token costs a tenth',
            lede: 'Prefix caching is the same primitive at three layers: a provider’s prompt cache, an engine’s block cache and a platform’s KV pool.',
            sections: [
                {
                    id: 'overview',
                    label: 'Overview',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }, { key: 'VLLM_V1' }, { key: 'ZHENG2024' }, { key: 'QIN2024' }, { key: 'DEEPSEEK_INFER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `Anthropic launched prompt caching in August 2024. A prompt prefix marked for caching is written once at a ${pct(CACHE_WRITE_SURCHARGE)} surcharge, then read back at ${pct(CACHE_READ_SHARE)} of the base input price for the next ${CACHE_TTL_MINUTES} minutes, a window that resets with each hit. Open-source engines give the same primitive away: vLLM’s V1 keeps prefix caching on by default.`,
                                'Under the hood it is PagedAttention’s shared block, made findable. vLLM hashes each full KV block together with the hash of the block before it, so one hash names a block’s entire prefix. A new request walks its own block hashes and reuses every block already in memory. SGLang keeps the same thing as a radix tree. Mooncake and LMCache extend it across machines, into CPU memory and SSD.',
                            ],
                        },
                        {
                            kind: 'stats',
                            items: [
                                { value: pct(CACHE_READ_SHARE), label: 'cache read price', note: 'share of the base input price' },
                                { value: pct(CACHE_WRITE_SURCHARGE), label: 'cache write surcharge', note: 'once per entry' },
                                { value: pct(DAY.cacheHitShare, 1), label: 'of DeepSeek’s input tokens hit cache', note: 'in one published day' },
                            ],
                        },
                    ],
                },
                {
                    id: 'tree',
                    label: 'Prefix tree',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ZHENG2024' }, { key: 'VLLM_V1' }],
                    blocks: [{ kind: 'lab', lab: 'prefix-tree', title: 'How a prompt finds its cache', sub: 'Send a request into the tree and see which blocks it reuses.' }],
                },
                {
                    id: 'latency',
                    label: 'Latency',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                    blocks: [
                        {
                            kind: 'bars',
                            title: 'Seconds to the first token, without and with prompt caching',
                            unit: 's',
                            categories: ['Chat with a book', 'Many-shot prompt', 'Multi-turn chat'],
                            series: [
                                { name: 'Without caching', values: [11.5, 1.6, 10] },
                                { name: 'With caching', values: [2.4, 1.1, 2.5] },
                            ],
                            note: `The book example caches 100,000 tokens of prompt: time to first token fell from 11.5 s to 2.4 s, a change of −${Math.round((1 - 2.4 / 11.5) * 100)}%.`,
                        },
                    ],
                },
                {
                    id: 'monitoring',
                    label: 'Monitoring',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Every Anthropic response reports `cache_read_input_tokens` and `cache_creation_input_tokens`. If both are zero, the prompt was not cached, and nothing else will tell you.',
                                'A cache that silently misses costs the same as no cache. Track the share of input tokens read from cache, per route, before and after every prompt-template change.',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'deepseek',
            code: 'DS',
            name: 'DeepSeek',
            products: 'case study',
            title: 'Cheap tokens from every layer',
            lede: `DeepSeek serves a model with ${DEEPSEEK_V3.totalParams / 1e9} billion parameters and published how, with one day of real cost and traffic numbers. It is the best public worked example of the whole stack tuned together.`,
            sections: [
                {
                    id: 'recipe',
                    label: 'Recipe',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'DEEPSEEK_V3' }, { key: 'ZHAO2025' }, { key: 'DEEPSEEK_INFER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `The model is a mixture of experts: each token activates ${DEEPSEEK_V3.activeExperts} of ${DEEPSEEK_V3.routedExperts} routed experts per layer, so only ${DEEPSEEK_V3.activeParams / 1e9} billion parameters work on it, one in ${ACTIVE_ONE_IN}. Its multi-head latent attention compresses the KV cache to ${kb('dsv3')} KB per token. The serving system splits prefill from decode and spreads the experts across many GPUs, so each GPU holds few experts and every batch stays large.`,
                                'Read it layer by layer: model shape ([L5](/systems/ai-inference-stack/l5)) shrinks the cache, kernels ([L6](/systems/ai-inference-stack/l6)) make the shape fast, the platform ([L3](/systems/ai-inference-stack/l3)) splits phases and balances experts, and a disk-backed KV cache serves repeated prefixes.',
                            ],
                        },
                        {
                            kind: 'bars',
                            title: `Llama 3.1 405B needs ${KV_405_OVER_DS.toFixed(2)}× DeepSeek-V3’s KV cache per token`,
                            unit: 'KB',
                            categories: ['DeepSeek-V3', 'Qwen-2.5 72B', 'Llama 3.1 405B'],
                            series: [{ name: 'KV cache per token, BF16', values: [kb('dsv3'), kb('q72'), kb('l405')] }],
                            note: `Computed from each model’s shape: ${KV_MODELS.filter((m) => ['dsv3', 'l405'].includes(m.id))
                                .map((m) => `${m.name}, ${m.formula}`)
                                .join('; ')}. DeepSeek-V3 uses latent attention; the others use grouped-query attention.`,
                        },
                    ],
                },
                {
                    id: 'day',
                    label: 'One day',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'DEEPSEEK_INFER' }],
                    blocks: [
                        {
                            kind: 'stats',
                            items: [
                                { value: pct(DAY.cacheHitShare, 1), label: 'of input tokens came from the KV cache', note: `${DEEPSEEK_DAY.cachedInputTokens / 1e9} billion of ${DEEPSEEK_DAY.inputTokens / 1e9} billion in one day` },
                                { value: formatUSD(DAY.cost), label: 'GPU cost for the day', note: `at $${DEEPSEEK_DAY.gpuHourPrice} per H800 hour` },
                                { value: formatUSD(DEEPSEEK_DAY.theoreticalRevenue), label: 'revenue if every token paid R1 prices', note: 'theoretical' },
                                { value: pct(DAY.margin), label: 'theoretical cost profit margin' },
                                { value: `${DAY.inputPerOutput.toFixed(1)}×`, label: 'input tokens per output token' },
                            ],
                        },
                        {
                            kind: 'prose',
                            paras: [
                                `One serving unit of each kind: prefill runs on ${DEEPSEEK_DAY.prefillNodes} nodes with experts spread across ${DEEPSEEK_DAY.prefillGpus} GPUs; decode runs on ${DEEPSEEK_DAY.decodeNodes} nodes across ${DEEPSEEK_DAY.decodeGpus} GPUs. Each decode node produced about ${DEEPSEEK_DAY.decodeTokensPerNodeSecond.toLocaleString('en-US')} output tokens per second.`,
                            ],
                        },
                    ],
                    caveat: {
                        provenance: 'paper',
                        sourceRefs: [{ key: 'DEEPSEEK_INFER' }],
                        text: 'DeepSeek calls the revenue figure theoretical: some traffic was free, and V3 is priced below R1.',
                    },
                },
                {
                    id: 'open-source',
                    label: 'Open source',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'DEEPSEEK_INFER' }, { key: 'LMSYS2025' }],
                    blocks: [
                        {
                            kind: 'table',
                            layerColumn: true,
                            caption: 'What DeepSeek open-sourced, placed on the map',
                            columns: ['Layer', 'Release', 'What it does'],
                            rows: [
                                ['l6', 'FlashMLA', 'Decoding kernel for multi-head latent attention on Hopper GPUs'],
                                ['l6', 'DeepGEMM', 'FP8 matrix multiplies for dense and expert layers'],
                                ['l3', 'DeepEP', 'All-to-all communication for expert parallelism across nodes'],
                                ['l3', 'EPLB', 'Balances expert load so no GPU becomes the straggler'],
                                ['l3', '3FS', 'Parallel file system on SSD and RDMA that holds the KV cache'],
                            ],
                        },
                        {
                            kind: 'prose',
                            paras: [
                                'Outsiders could check the recipe. In May 2025 the LMSYS team rebuilt it on 96 H100 GPUs with SGLang, splitting prefill from decode and spreading experts wide. They reached 22,300 output tokens per second per node with 2,000 tokens of input, and estimated $0.2 per million output tokens, about a fifth of DeepSeek’s own API price.',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'failures',
            code: '!',
            name: 'Failures',
            products: 'what the dashboard misses',
            title: 'The worst failures return 200 OK',
            lede: 'A cold cache, a full KV cache or a truncated answer still returns a success code. The dashboards web teams already run stay green through all of it.',
            sections: [
                {
                    id: 'simulator',
                    label: 'Simulator',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                    blocks: [{ kind: 'lab', lab: 'template-deploy', title: 'Ship a template change', sub: 'Deploy it, watch for a minute, then roll back.' }],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                        text: 'Hit rates and latencies in the simulator are illustrative. The mechanism, a template edit ahead of the cached prefix, is the one Anthropic’s docs describe.',
                    },
                },
                {
                    id: 'modes',
                    label: 'Failure modes',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }, { key: 'KWON2023' }],
                    blocks: [
                        { kind: 'prose', paras: ['These failures share a mechanism: something changes the shape of the work without changing whether it succeeds.'] },
                        {
                            kind: 'list',
                            style: 'cards',
                            items: [
                                { title: 'The cache goes cold.', text: 'A template edit puts a timestamp or a user name ahead of the system prompt. Prompts under a model’s minimum cacheable length skip caching with no error.' },
                                { title: 'Memory runs out.', text: 'Longer conversations fill the KV cache. The engine queues new requests, or preempts running ones and recomputes them later. Throughput falls; nothing errors.' },
                                { title: 'Answers get cut off.', text: 'A low `max_tokens` truncates responses with a success status.' },
                                { title: 'Quality drifts.', text: 'A new quantization, a chat-template mismatch or a model update changes the answers. Only an evaluation set catches it.' },
                            ],
                        },
                    ],
                },
                {
                    id: 'checklist',
                    label: 'Checklist',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ZHONG2024' }, { key: 'ANTHROPIC_CACHE' }],
                    blocks: [
                        {
                            kind: 'checklist',
                            groups: [
                                { title: 'Latency the user feels', items: ['Time to first token, p50 and p95', 'Time per output token', 'Time queued before prefill'] },
                                { title: 'Engine capacity', items: ['KV cache usage', 'Preemptions and recomputed requests', 'Running and waiting requests'] },
                                { title: 'Cache health', items: ['Prefix-cache hit rate', '`cache_read_input_tokens` against `cache_creation_input_tokens`', 'Hit rate before and after every template deploy'] },
                                { title: 'Correctness', items: ['Share of answers with `finish_reason = length`', 'Scores on a fixed evaluation set after every model, quantization or template change'] },
                                { title: 'Cost', items: ['Input and output tokens per request', 'Dollars per thousand requests', 'Requests that met their latency target (goodput)'] },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'cost',
            code: '¢',
            name: 'Cost',
            products: 'what a token costs',
            title: 'Cut the bill before buying a GPU',
            lede: 'Enter your own bill and token mix, pull the levers each layer owns, and see the arithmetic behind every step.',
            sections: [
                {
                    id: 'calculator',
                    label: 'Calculator',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }, { key: 'ANTHROPIC_BATCH' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `Cached input tokens bill at ${pct(CACHE_READ_SHARE)} of the input price, a smaller model can cost a ${LARGE_SMALL_PRICE_RATIO === 12 ? 'twelfth' : `1/${LARGE_SMALL_PRICE_RATIO}`} as much per token, and batch jobs bill at ${pct(1 - BATCH_DISCOUNT)} of list.`,
                            ],
                        },
                        { kind: 'lab', lab: 'bill-cut', title: 'Your bill, three levers', sub: 'Type your monthly bill, set your token mix, then pull the levers.' },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                        text: 'The price ratios come from published list prices. Negotiated rates, output-heavy traffic and cache misses after a deploy all move the real bill.',
                    },
                },
                {
                    id: 'self-hosted',
                    label: 'Self-hosted',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'DEEPSEEK_INFER' }, { key: 'LMSYS2025' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'On your own GPUs the bill is GPU-hours, and the cost of a token is the hourly price divided by the tokens that hour produced:',
                                '**cost per million tokens = GPU price per hour × GPUs ÷ (tokens per second × 3,600) × 1,000,000**',
                                `Everything that raises tokens per second per GPU lowers the cost of a token: bigger batches until memory runs out, FP8, prefix reuse, disaggregation. DeepSeek’s published day makes it concrete: ${formatUSD(DAY.cost)} of GPU time at $${DEEPSEEK_DAY.gpuHourPrice} per GPU-hour served ${DEEPSEEK_DAY.inputTokens / 1e9} billion input tokens and ${DEEPSEEK_DAY.outputTokens / 1e9} billion output tokens.`,
                            ],
                        },
                        {
                            kind: 'links',
                            items: [
                                { to: '/systems/ai-inference-stack/l7?tab=batch-lab', label: 'Open the batch lab on L7', text: 'Fill the batch and watch the cost per million tokens fall.' },
                                { to: '/systems/ai-inference-stack/concepts?tab=roofline', label: 'Open the roofline', text: 'Why batching moves decode toward the compute ceiling.' },
                            ],
                        },
                    ],
                },
                {
                    id: 'levers',
                    label: 'Levers',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }, { key: 'ANTHROPIC_BATCH' }, { key: 'ZHONG2024' }, { key: 'YU2022' }, { key: 'KWON2023' }, { key: 'SHAH2024' }],
                    blocks: [
                        {
                            kind: 'table',
                            layerColumn: true,
                            caption: 'Every lever, by layer',
                            columns: ['Layer', 'Lever', 'Why it works'],
                            rows: [
                                ['l1', 'Stable prefix first, shorter answers', `Cached input bills at ${pct(CACHE_READ_SHARE)} of list`],
                                ['l2', 'Route easy requests to a small model', `Claude 3.5 Sonnet’s input price was ${LARGE_SMALL_PRICE_RATIO}× Claude 3 Haiku’s`],
                                ['l2', 'Send work that can wait to a batch API', `${pct(BATCH_DISCOUNT)} off, results within 24 hours`],
                                ['l3', 'Route by cache, split prefill and decode', 'DistServe: 7.4× more requests within targets'],
                                ['l4', 'Continuous batching, paged KV cache', 'Orca: 36.9×; PagedAttention: up to 4×'],
                                ['l6', 'FP8 weights, fused kernels', 'Half the bytes per weight read; FlashAttention-3 at 75% of peak'],
                                ['l7', 'More GPUs', 'Cost grows with every hour they run'],
                            ],
                        },
                        { kind: 'prose', paras: ['Pull the levers from the top down. Each layer down costs more engineering per dollar saved. Start with the prompt and the gateway, then the engine’s settings, then the fleet, and buy GPUs last.'] },
                    ],
                },
            ],
        },
        {
            id: 'drills',
            code: 'D',
            name: 'Drills',
            products: 'system design practice',
            title: 'One scarce resource at a time',
            lede: 'Each drill starts the same way: name the scarce resource, then walk the stack from your code down to the GPU, then say what would change your mind.',
            sections: Object.entries(CROSS_DRILLS).map(([id, d]) => ({
                id,
                label: d.title,
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'ZHONG2024' }, { key: 'KWON2023' }, { key: 'ANTHROPIC_CACHE' }],
                blocks: [{ kind: 'drill', ...d, title: null }],
            })),
        },
        {
            id: 'quiz',
            code: '?',
            name: 'Quiz',
            products: 'check yourself',
            title: 'Put each piece on the map',
            lede: 'Ten questions across the concepts and all seven layers.',
            sections: [
                {
                    id: 'questions',
                    label: 'Questions',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'ZHONG2024' }, { key: 'DYNAMO2025' }, { key: 'ANTHROPIC_CACHE' }, { key: 'NVIDIA_H100' }],
                    blocks: [{ kind: 'quiz', ...QUIZZES.all }],
                },
            ],
        },
    ],
});
