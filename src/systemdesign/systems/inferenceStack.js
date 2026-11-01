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

const EXERCISES = (id, sourceRefs) => ({
    id: 'exercises',
    label: 'Exercises',
    provenance: 'pedagogical',
    sourceRefs,
    blocks: [
        { kind: 'quiz', ...QUIZZES[id] },
        { kind: 'drill', title: 'Design scenario', ...LAYER_DRILLS[id] },
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
    summary: 'Every LLM request crosses seven software layers before a GPU multiplies anything.',
    intro: 'Each layer has a lab that runs its mechanism and a spec sheet with the numbers that limit it.',
    direction: { label: 'Request path', top: 'call', bottom: 'GPU' },
    topicsLabel: 'Across the layers',
    trace: {
        down: 'request',
        up: 'tokens',
        goingLabel: 'request going down',
        returningLabel: 'tokens coming back',
        intro: 'Press Play to send one SDK call down the seven layers and stream the answer back up.',
        outro: 'Prefill ran once and built the KV cache. Decode adds one token per step, and each token travels back up every layer to your app.',
        steps: {
            l1: { head: 'Build the prompt, open the stream', does: 'Your code assembles tools, the system prompt, documents and the conversation, then calls the SDK. The order of those parts decides how much of the prompt a cache can reuse.', owner: 'you' },
            l2: { head: 'Check the key, count the tokens, pick a provider', does: 'The gateway maps a virtual key to a real provider key and checks the token budget. It routes by model and price, then logs what the call cost.', owner: 'your platform team' },
            l3: { head: 'Pick the replica that already holds the prefix', does: 'The platform routes the request to a replica that already holds this prompt’s KV cache. It can send prefill and decode to separate GPU pools.', owner: 'NVIDIA, Red Hat and your team' },
            l4: { head: 'Join the running batch at the next step', does: 'The engine adds the request to its running batch at the next forward pass. It keeps the KV cache in paged blocks and reuses any cached prefix.', owner: 'open-source engine projects' },
            l5: { head: 'Run the forward pass', does: 'PyTorch defines the model’s layers and runs the forward pass. Compilation and CUDA graphs cut the CPU time spent launching GPU work each step.', owner: 'PyTorch' },
            l6: { head: 'Do the attention and the matrix math', does: 'Hand-tuned GPU programs called kernels run the hot operations. FlashAttention keeps attention scores in on-chip memory, so they never travel to HBM and back.', owner: 'kernel authors' },
            l7: { head: 'Stream weights from memory, do the math', does: 'The GPU reads every weight and the batch’s KV cache from HBM. It multiplies and returns one new token per request.', owner: 'NVIDIA' },
        },
    },
    overview: {
        title: 'Seven layers between your API call and a GPU',
        sections: [
            {
                id: 'trace',
                label: 'Follow a request',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_STACK' }, { key: 'DYNAMO2025' }, { key: 'VLLM2023' }],
                blocks: [{ kind: 'lab', lab: 'request-trace', title: 'One request, down and back' }],
            },
            {
                id: 'start',
                label: 'Paths',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'META2024' }, { key: 'ANTHROPIC_CACHE' }, { key: 'SDDD_STACK' }],
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: `${TPS} tokens/s`, label: 'One user, 8B model, one H100', note: `Batch one: ${WEIGHTS_GB} GB of weights ÷ ${TB_S} TB/s.` },
                            { value: '7 layers', label: 'From the SDK call to the GPU' },
                            { value: `${TB_S} TB/s`, label: 'HBM bandwidth', note: 'Every decode step reads all the weights at this rate.' },
                            { value: pct(CACHE_READ_SHARE), label: 'Price of a cached input token', note: 'Share of list input price, on Anthropic’s API.' },
                        ],
                    },
                    {
                        kind: 'links',
                        items: [
                            { to: '/systems/ai-inference-stack/concepts', label: 'New to LLM serving', text: 'Start with Concepts, then the engine (L4) and the GPU (L7).' },
                            { to: '/systems/ai-inference-stack/l1', label: 'Building on model APIs', text: 'The layers you control without owning a GPU: your app (L1), the gateway (L2), caching and cost.' },
                            { to: '/systems/ai-inference-stack/l3', label: 'Running your own fleet', text: 'Platforms (L3) and engines (L4), the DeepSeek case study and the failures to watch.' },
                            { to: '/systems/ai-inference-stack/drills', label: 'Working through scenarios', text: 'Spec sheets, scenarios and the quiz.' },
                        ],
                    },
                    { kind: 'layers' },
                ],
            },
            {
                id: 'history',
                label: 'History',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_STACK' }, { key: 'YU2022' }, { key: 'KWON2023' }, { key: 'ZHONG2024' }, { key: 'DYNAMO2025' }, { key: 'LLMD2025' }],
                blocks: [
                    { kind: 'prose', paras: ['Continuous batching and paged memory made one replica efficient, and then the work outgrew one replica.'] },
                    {
                        kind: 'lab',
                        lab: 'stack-morph',
                        title: 'How the stack grew',
                        sub: 'Switch between 2023 and 2026 and watch the gateway and platform appear above the engine.',
                        props: {
                            before: {
                                label: '2023 picture',
                                boxes: [
                                    { name: 'Your code', sub: 'calls the engine directly' },
                                    { name: 'vLLM', sub: 'the engine' },
                                    { name: '“The model”', sub: 'framework, kernels and GPU as one box', grow: 3 },
                                ],
                                note: '**A common 2023 picture:** your code, vLLM and “the model”, with nothing between your code and the engine.',
                            },
                            after: {
                                label: '2026 stack',
                                boxes: STACK_BOXES.map(([name, sub], i) => ({ name: `L${i + 1} ${name}`, sub, color: i + 1 })),
                                note: '**The 2026 stack:** seven layers. A platform that sees the whole fleet splits prefill from decode, shares KV cache and routes by cache. NVIDIA Dynamo and llm-d shipped it in 2025.',
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
                blocks: [{ kind: 'timeline', events: TIMELINE }],
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
            lede: 'Prompt length, answer length and prompt order are set here, before any infrastructure sees the request.',
            sections: [
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
                            sub: 'Move the timestamp below the stable parts and watch the share of input read from cache rise.',
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                        text: 'Block sizes are example token counts, and prices follow Anthropic’s published cache read share.',
                    },
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                    blocks: [
                        {
                            kind: 'code',
                            code: 'response = client.chat.completions.create(\n    model="...",\n    messages=[tools, system, docs, *history, user],  # 1\n    max_tokens=1024,                                 # 2\n    stream=True,                                     # 3\n)',
                            notes: [
                                '**Order.** Caches match from the first token. Parts that never change go first.',
                                '**Length.** Output tokens cost more than input tokens, and an answer cut off at the limit still returns success.',
                                '**Streaming.** Tokens reach the user as decode makes them, so the wait feels like time to first token.',
                            ],
                        },
                        {
                            kind: 'prose',
                            paras: [
                                'Anthropic’s cache follows the order tools, then system, then messages. A change at one level invalidates that level and every level after it.',
                                'Prompts shorter than a model’s minimum cacheable length are not cached, and no error says so.',
                            ],
                        },
                    ],
                },
                LAYER_SPEC(
                    'l1',
                    {
                        owns: 'Prompt assembly, model choice, token limits, streaming, and the latency your user feels.',
                        neighbors: 'Sends one request (`messages`, `model`, `max_tokens`, `stream`). Receives a stream of tokens and a usage record.',
                        pattern: 'Cache-key design. A prompt prefix is a cache key, so it needs deterministic serialization, the way an HTTP cache needs stable URLs.',
                        metrics: ['Input and output tokens per request', 'Share of input read from cache (`cache_read_input_tokens`)', 'Share of answers ending with `finish_reason = length`', 'Time to first token as the client sees it'],
                        knobs: ['Order of prompt parts', '`max_tokens` and stop sequences', 'Streaming on or off', 'Model per task, and the Batch API for work that can wait'],
                        failures: ['Timestamps, request IDs or unsorted JSON keys first: every request misses the cache', 'Unbounded conversation history grows cost and eventually overflows the context window', 'Non-streaming calls hit client timeouts on long answers'],
                        boundary: 'Put retrieved documents before the conversation when they stay fixed for a session. Put them after when they change every turn, so the history stays cacheable.',
                    },
                    [{ key: 'ANTHROPIC_CACHE' }, { key: 'ANTHROPIC_BATCH' }]
                ),
                EXERCISES('l1', [{ key: 'ANTHROPIC_CACHE' }]),
            ],
        },
        {
            id: 'l2',
            code: 'L2',
            name: 'AI gateway',
            products: 'LiteLLM, Portkey',
            title: 'The front door counts tokens',
            lede: 'An AI gateway is an API gateway that meters tokens instead of requests, so limits, retries and logs all change.',
            sections: [
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
                            sub: 'Drag the traffic and routing sliders, take the large model down, and watch the queue and spend.',
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'PORTKEY' }],
                        text: 'Traffic, token counts and prices are illustrative, and the token buckets, capped retries and fallbacks follow the gateway projects.',
                    },
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'LITELLM' }, { key: 'PORTKEY' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'LiteLLM puts more than 100 providers behind one OpenAI-style interface. Portkey adds retries, fallbacks, load balancing and guardrails on top.',
                                'A token stopped here never reaches a GPU, which makes the gateway the cheapest place to save after your code. It is also the only place that sees every call’s cost, so it is the system of record for spend.',
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
                LAYER_SPEC(
                    'l2',
                    {
                        owns: 'Virtual keys, quotas in tokens and dollars, routing across models and providers, retries, fallbacks, guardrails and the cost log.',
                        neighbors: 'Accepts OpenAI-style requests from many apps and sends provider-specific requests out. Emits one cost record per call.',
                        pattern: 'API gateway plus token-bucket rate limiter plus circuit breaker. Cost is unknown until the answer ends, so admission reserves an estimate and reconciles real usage after.',
                        metrics: ['Tokens per minute per key and per team', 'Spend per team against budget', 'Error, retry and fallback rate per provider', 'Latency the gateway adds'],
                        knobs: ['Limits in tokens per minute and requests per minute', 'Monthly budgets per key', 'Routing rules by model, price and health', 'Retry caps, backoff, timeouts and fallback chains'],
                        failures: ['A retry storm re-bills every input token', 'A fallback model answers differently, so quality drifts silently', 'Limits counted in requests let one tenant with long prompts spend the shared budget', 'A buffering proxy breaks streaming'],
                        boundary: 'Run LiteLLM as a central proxy when many teams share providers and need one budget and one log. With one app, call it as a library and skip the extra hop.',
                    },
                    [{ key: 'LITELLM' }, { key: 'PORTKEY' }]
                ),
                EXERCISES('l2', [{ key: 'LITELLM' }, { key: 'PORTKEY' }]),
            ],
        },
        {
            id: 'l3',
            code: 'L3',
            name: 'Inference platform',
            products: 'NVIDIA Dynamo, llm-d',
            title: 'A scheduler for the fleet',
            lede: 'A platform runs many engine replicas and decides which replica gets each request and which GPUs do prefill or decode.',
            sections: [
                {
                    id: 'phase-split',
                    label: 'Phase split',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ZHONG2024' }],
                    blocks: [
                        { kind: 'prose', paras: ['The engine mixes prefill and decode in each step, and the platform can give each phase its own GPUs.'] },
                        { kind: 'lab', lab: 'pd-split', title: 'Watch one user’s tokens', sub: 'Switch between one pool, chunked prefill and split pools, and watch the longest pause between tokens.' },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ZHONG2024' }],
                        text: 'Step timings are illustrative, while DistServe describes the stall: a long prefill delays every decode in its step.',
                    },
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'DYNAMO2025' }, { key: 'LLMD2025' }, { key: 'ZHONG2024' }, { key: 'QIN2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'A decision that needs to know about more than one replica belongs to the platform.',
                                'NVIDIA Dynamo runs above vLLM, SGLang and TensorRT-LLM and moves KV cache between GPUs with NIXL. llm-d builds the same ideas on Kubernetes, with vLLM as the engine and LMCache for offload.',
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
                        text: 'Each figure is its authors’ benchmark against their own baseline, so treat the multiples as upper bounds.',
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
                        metrics: ['Prefix hit rate per replica, queue depth and utilization per pool', 'KV transfer time between pools', 'Time to first token and time per output token per pool', 'Goodput: requests that met their latency target'],
                        knobs: ['Routing score: cache overlap against current load', 'Ratio of prefill GPUs to decode GPUs', 'KV offload tiers: GPU, CPU memory, SSD', 'Scale-up and scale-down thresholds per pool'],
                        failures: ['One popular system prompt pins traffic to one replica and creates a hot spot', 'Slow interconnect makes KV transfer cost more than it saves', 'Scaling down evicts warm caches and hit rate falls'],
                        boundary: 'Split prefill from decode when prompts are long and both latency targets are tight. With short prompts or a small fleet, keep one pool: the KV transfer costs more than the interference it removes.',
                    },
                    [{ key: 'DYNAMO2025' }, { key: 'LLMD2025' }, { key: 'ZHONG2024' }]
                ),
                EXERCISES('l3', [{ key: 'ZHONG2024' }, { key: 'DYNAMO2025' }]),
            ],
        },
        {
            id: 'l4',
            code: 'L4',
            name: 'Inference engine',
            products: 'vLLM, SGLang, TensorRT-LLM',
            title: 'Keep the batch full',
            lede: 'Each decode step reads every weight whether the batch holds one request or two hundred, so a full batch makes tokens cheap.',
            sections: [
                {
                    id: 'batching',
                    label: 'Batching',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'YU2022' }],
                    blocks: [{ kind: 'lab', lab: 'batching-race', title: 'Static against continuous batching', sub: 'Press Play and watch each slot fill to its dashed outline, the request’s full length.' }],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'YU2022' }],
                        text: 'Request lengths are generated for the lab, and the rule to admit and retire at every step is Orca’s.',
                    },
                },
                {
                    id: 'paging',
                    label: 'Paging',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }],
                    blocks: [
                        { kind: 'lab', lab: 'kv-layout', title: 'Watch GPU memory fill', sub: 'Switch between slabs, pages and a shared prefix, and count how many requests fit.' },
                        {
                            kind: 'links',
                            items: [{ to: '/systems/paged-kv-cache', label: 'PagedAttention KV cache, five layers deep', text: 'Block tables, prefix sharing, preemption and what to watch.' }],
                        },
                    ],
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'YU2022' }, { key: 'KWON2023' }, { key: 'VLLM_V1' }, { key: 'ZHENG2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Orca scheduled one iteration at a time instead of one request at a time. PagedAttention replaced one slab per request, sized for the longest answer, with small fixed-size blocks allocated as the answer grows.',
                                'vLLM’s V1 core, from January 2025, runs one scheduler that treats prompt and output tokens alike. Each step gets a token budget, prefix caching stays on by default, and SGLang extends prefix reuse with RadixAttention.',
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
                LAYER_SPEC(
                    'l4',
                    {
                        owns: 'The per-step schedule (continuous batching, chunked prefill), KV memory (paged blocks, prefix cache, eviction), preemption, sampling and speculative decoding for one model replica.',
                        neighbors: 'Takes prompts and sampling parameters and streams tokens back. Runs one replica, which may span several GPUs through tensor parallelism.',
                        pattern: 'An operating system: a scheduler that time-slices every step, virtual memory with page tables and copy-on-write, and an LRU cache for prefixes.',
                        metrics: ['Running and waiting requests', 'KV cache usage and prefix cache hit rate', 'Preemptions and recomputed requests', 'Tokens in each step’s batch'],
                        knobs: ['Token budget per step (max batched tokens) and chunked prefill size', 'Maximum concurrent sequences', 'GPU memory fraction for KV cache', 'Tensor parallel size and quantization'],
                        failures: ['KV cache fills up, the engine preempts requests and throughput collapses', 'A large step budget lets long prefills raise time per output token', 'A small budget leaves the GPU underused'],
                        boundary: 'Raise the batch until time per output token hits its target or the KV cache fills, whichever comes first. Past that point, add replicas.',
                    },
                    [{ key: 'VLLM_V1' }, { key: 'KWON2023' }, { key: 'YU2022' }]
                ),
                EXERCISES('l4', [{ key: 'KWON2023' }, { key: 'YU2022' }]),
            ],
        },
        {
            id: 'l5',
            code: 'L5',
            name: 'Framework',
            products: 'PyTorch, torch.compile, CUDA graphs',
            title: 'Where CPU overhead hides',
            lede: 'PyTorch runs the forward pass, and at small batch sizes the CPU time spent launching GPU work can rival the work.',
            sections: [
                {
                    id: 'launches',
                    label: 'Launches',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'VLLM_V1' }],
                    blocks: [{ kind: 'lab', lab: 'launch-overhead', title: 'Where a decode step’s time goes', sub: 'Switch between eager, compiled and CUDA graph modes and watch the hatched GPU idle gaps shrink.' }],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'VLLM_V1' }],
                        text: 'Kernel counts and timings are illustrative, and vLLM V1 reports the effect: fewer launches, fewer idle gaps.',
                    },
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'VLLM_V1' }, { key: 'META2024' }, { key: 'DEEPSEEK_V3' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Eager PyTorch launches each operation from Python as its own GPU kernel, and small decode kernels expose every launch. vLLM’s V1 core uses `torch.compile` and piecewise CUDA graphs, and credits lower CPU overhead for its 1.7× gain over V0.',
                                `Model shape lives here too: grouped-query attention gives every Llama 3 size 8 KV heads, which shrinks the KV cache. DeepSeek’s latent attention shrinks it further, and its mixture of experts activates ${DEEPSEEK_V3.activeParams / 1e9} billion of ${DEEPSEEK_V3.totalParams / 1e9} billion parameters per token.`,
                            ],
                        },
                    ],
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
                EXERCISES('l5', [{ key: 'VLLM_V1' }]),
            ],
        },
        {
            id: 'l6',
            code: 'L6',
            name: 'Kernels',
            products: 'FlashAttention, FlashMLA, DeepGEMM, Triton',
            title: 'Kernels turn model tricks into speed',
            lede: 'Attention and matrix multiply take most of a forward pass, so their hand-tuned kernels set how close a model gets to peak.',
            sections: [
                {
                    id: 'flash',
                    label: 'FlashAttention',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'SHAH2024' }],
                    blocks: [{ kind: 'lab', lab: 'flash-traffic', title: 'Standard attention against FlashAttention', sub: 'Drag the prompt length and watch the HBM traffic for scores.' }],
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'SHAH2024' }, { key: 'DEEPSEEK_INFER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'FlashAttention computes attention in tiles held in on-chip memory, so the score matrix never travels to HBM and back.',
                                'DeepSeek’s FlashMLA decodes its latent attention on Hopper GPUs, and DeepGEMM runs its FP8 matrix multiplies. Many newer kernels are written in Triton, OpenAI’s Python-like language for GPU programs.',
                            ],
                        },
                        {
                            kind: 'stats',
                            items: [
                                { value: '740 TFLOPS', label: 'FlashAttention-3 in FP16 on an H100', note: '75% of the H100’s peak' },
                                { value: '1.5× to 2×', label: 'faster than FlashAttention-2' },
                                { value: '2.6×', label: 'lower FP8 numerical error', note: 'against a baseline FP8 attention method' },
                            ],
                        },
                    ],
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
                        failures: ['A new model shape with no tuned kernel falls back to a slow path','Low precision loses accuracy without careful scaling', 'A kernel tuned for one GPU generation runs poorly on the next'],
                        boundary: 'Write a kernel in Triton to get a fused operation working quickly. Move to CUDA or CUTLASS when that kernel dominates the profile and the last stretch of speed pays off.',
                    },
                    [{ key: 'SHAH2024' }, { key: 'DEEPSEEK_INFER' }]
                ),
                EXERCISES('l6', [{ key: 'SHAH2024' }, { key: 'DYNAMO2025' }]),
            ],
        },
        {
            id: 'l7',
            code: 'L7',
            name: 'GPU',
            products: 'H100, HBM, NVLink',
            title: 'Decode is a memory-bandwidth problem',
            lede: 'An H100 does far more math than its memory can feed during decode, so every layer above exists to keep it busy.',
            sections: [
                {
                    id: 'batch-lab',
                    label: 'Batch lab',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'META2024' }],
                    blocks: [{ kind: 'lab', lab: 'decode-batch', title: 'Fill the batch', sub: 'Drag the batch size and tokens per request, and watch tokens per second and cost per million.' }],
                },
                {
                    id: 'roofline',
                    label: 'Roofline',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'NVIDIA_H100' }],
                    blocks: [{ kind: 'lab', lab: 'roofline', title: 'The H100 roofline', sub: 'Drag the intensity or pick a workload, and watch which ceiling it hits.' }],
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'NVIDIA_H100' }, { key: 'META2024' }, { key: 'ZHAO2025' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `To keep an H100’s tensor cores busy, a kernel must do about **${RIDGE} FLOPs per byte** it reads. Decode at batch size one does about one, because it reads each weight to make one token.`,
                                `Llama 3 8B’s ${WEIGHTS_GB} GB of weights need at least ${STEP_MS} ms per step, or **${TPS} tokens/s** for one user. DeepSeek estimates its own decode ceiling at 67 tokens/s over 400 Gbps InfiniBand and 1,200 tokens/s on a GB200 NVL72.`,
                            ],
                        },
                        {
                            kind: 'stats',
                            items: [
                                { value: `${TFLOPS} TFLOPS`, label: 'dense BF16 math' },
                                { value: `${TB_S} TB/s`, label: 'HBM bandwidth' },
                                { value: `${H100.memory / 1e9} GB`, label: 'HBM capacity' },
                                { value: `${NVLINK} GB/s`, label: 'NVLink, GPU to GPU', note: 'Inside one node. Across nodes, the network is the limit.' },
                            ],
                        },
                    ],
                    caveat: {
                        provenance: 'paper',
                        sourceRefs: [{ key: 'NVIDIA_H100' }],
                        text: 'NVIDIA lists 1,979 BF16 TFLOPS with sparsity, and dense math runs at half that, the figure used here.',
                    },
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
                EXERCISES('l7', [{ key: 'NVIDIA_H100' }]),
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
            lede: 'Tokens, the two phases of a request, the KV cache, latency metrics and the roofline shape every layer’s design.',
            sections: [
                {
                    id: 'phases',
                    label: 'Phases',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'ZHONG2024' }],
                    blocks: [
                        { kind: 'lab', lab: 'phases', props: PHASES, title: 'One request, pass by pass', sub: 'Press Play or Step, and count the forward passes and the KV entries each pass reads.' },
                        {
                            kind: 'prose',
                            paras: ['**Prefill** does a lot of math per weight it reads, so compute limits it. **Decode** does one token of math per request for every weight it reads, so memory bandwidth limits it.'],
                        },
                    ],
                },
                {
                    id: 'kv',
                    label: 'KV cache',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'META2024' }, { key: 'LLAMA_CONFIGS' }, { key: 'ZHAO2025' }],
                    blocks: [
                        { kind: 'lab', lab: 'kv-sizer', title: 'Size the KV cache', sub: 'Pick a model, then drag tokens per request and requests in memory and watch the GPUs fill.' },
                        {
                            kind: 'prose',
                            paras: [
                                'The KV cache holds every layer’s attention keys and values for every token so far. Per token it takes 2 (keys and values) × layers × KV heads × head dimension × bytes per value.',
                                'It grows linearly with prompt length and with the number of requests in memory. The engine pages it, the platform routes by it and moves it, and grouped-query and latent attention shrink it.',
                            ],
                        },
                    ],
                },
                {
                    id: 'latency',
                    label: 'Latency',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'ZHONG2024' }],
                    blocks: [
                        { kind: 'lab', lab: 'latency-feel', title: 'Feel the latency', sub: 'Drag the two speeds and the answer length, then press Stream and watch the answer arrive.' },
                        {
                            kind: 'list',
                            items: [
                                { title: 'Time to first token (TTFT).', text: 'Queueing plus prefill.' },
                                { title: 'Time per output token (TPOT).', text: 'The decode step time one user sees, also called inter-token latency.' },
                                { title: 'Throughput.', text: 'Tokens per second across every request.' },
                                { title: 'Goodput.', text: 'Requests that met their latency targets, the number DistServe optimizes.' },
                            ],
                        },
                        {
                            kind: 'prose',
                            paras: ['End-to-end latency for one answer is TTFT + (output tokens − 1) × TPOT. TPOT dominates long answers, and TTFT dominates short ones.'],
                        },
                    ],
                },
                {
                    id: 'roofline',
                    label: 'Roofline',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'NVIDIA_H100' }],
                    blocks: [
                        { kind: 'lab', lab: 'roofline', title: 'The H100 roofline', sub: 'Pick a workload or drag the intensity, and watch which side of the ridge it lands on.' },
                        {
                            kind: 'prose',
                            paras: [
                                `An H100’s **ridge point** is ${TFLOPS} dense BF16 TFLOPS ÷ ${TB_S} TB/s, about ${RIDGE} FLOPs per byte read. Below it memory bandwidth sets the speed, and above it math does.`,
                                'Decode reuses each weight once per request, so its intensity is about the batch size. Prefill reuses each weight once per prompt token, so its intensity is about the prompt length.',
                            ],
                        },
                    ],
                },
                {
                    id: 'glossary',
                    label: 'Glossary',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'YU2022' }, { key: 'KWON2023' }, { key: 'ZHENG2024' }, { key: 'ZHONG2024' }, { key: 'QIN2024' }, { key: 'DEEPSEEK_V3' }],
                    blocks: [{ kind: 'lab', lab: 'glossary', props: { terms: GLOSSARY }, title: 'Terms you will meet', sub: 'Filter the terms, then press a layer code such as L4 to open that layer.' }],
                },
            ],
        },
        {
            id: 'caching',
            code: '$',
            name: 'Caching',
            products: 'L1, L3 and L4',
            title: 'A cached token costs a tenth',
            lede: 'Prefix caching is the same primitive at three layers: a provider’s prompt cache, an engine’s block cache and a platform’s KV pool.',
            sections: [
                {
                    id: 'tree',
                    label: 'Prefix tree',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ZHENG2024' }, { key: 'VLLM_V1' }],
                    blocks: [{ kind: 'lab', lab: 'prefix-tree', title: 'How a prompt finds its cache', sub: 'Send a request into the tree and watch which blocks it reuses.' }],
                },
                {
                    id: 'overview',
                    label: 'How it works',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }, { key: 'VLLM_V1' }, { key: 'ZHENG2024' }, { key: 'QIN2024' }, { key: 'DEEPSEEK_INFER' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                `Anthropic launched prompt caching in August 2024, and a cached prefix stays readable for ${CACHE_TTL_MINUTES} minutes after each hit. Open-source engines give the same primitive away, and vLLM’s V1 keeps prefix caching on by default.`,
                                'vLLM hashes each full KV block with the previous block’s hash, so one hash names the whole prefix. SGLang keeps it as a radix tree, and Mooncake and LMCache extend it across machines to CPU memory and SSD.',
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
            lede: `DeepSeek serves a model with ${DEEPSEEK_V3.totalParams / 1e9} billion parameters and published how, with one day of real cost and traffic numbers.`,
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
                                `Each token activates ${DEEPSEEK_V3.activeExperts} of ${DEEPSEEK_V3.routedExperts} routed experts per layer, only ${DEEPSEEK_V3.activeParams / 1e9} billion parameters, one in ${ACTIVE_ONE_IN}. The serving system splits prefill from decode and spreads experts across many GPUs, so every batch stays large.`,
                                'Model shape ([L5](/systems/ai-inference-stack/l5)) shrinks the cache, and kernels ([L6](/systems/ai-inference-stack/l6)) make that shape fast. The platform ([L3](/systems/ai-inference-stack/l3)) splits phases and balances experts, and a disk-backed KV cache serves repeated prefixes.',
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
                                `One prefill unit spans ${DEEPSEEK_DAY.prefillNodes} nodes and ${DEEPSEEK_DAY.prefillGpus} GPUs, and one decode unit spans ${DEEPSEEK_DAY.decodeNodes} nodes and ${DEEPSEEK_DAY.decodeGpus} GPUs. Each decode node produced about ${DEEPSEEK_DAY.decodeTokensPerNodeSecond.toLocaleString('en-US')} output tokens per second.`,
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
                                'In May 2025 LMSYS rebuilt the recipe with SGLang on 96 H100 GPUs, splitting prefill from decode and spreading experts wide.',
                                'It reached 22,300 output tokens per second per node with 2,000 input tokens. LMSYS estimated $0.2 per million output tokens, about a fifth of DeepSeek’s API price.',
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
            lede: 'A cold cache, a full KV cache or a truncated answer still returns a success code, so error-rate dashboards stay green.',
            sections: [
                {
                    id: 'simulator',
                    label: 'Simulator',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                    blocks: [{ kind: 'lab', lab: 'template-deploy', title: 'Ship a template change', sub: 'Press Deploy, watch hit rate and time to first token for a minute, then press Roll back.' }],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                        text: 'Hit rates and latencies are illustrative, and Anthropic’s docs describe the mechanism: a template edit ahead of the cached prefix.',
                    },
                },
                {
                    id: 'modes',
                    label: 'Failure modes',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'ANTHROPIC_CACHE' }, { key: 'KWON2023' }],
                    blocks: [
                        {
                            kind: 'list',
                            style: 'cards',
                            items: [
                                { title: 'The cache goes cold.', text: 'A template edit puts a timestamp or a user name ahead of the system prompt. Prompts under a model’s minimum cacheable length skip caching with no error.' },
                                { title: 'Memory runs out.', text: 'Longer conversations fill the KV cache, so the engine queues new requests or preempts and recomputes running ones. Throughput falls, and nothing errors.' },
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
                    blocks: [{ kind: 'lab', lab: 'bill-cut', title: 'Your bill, three levers', sub: 'Type your monthly bill, drag the token mix and the three levers, and watch the bill fall.' }],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'ANTHROPIC_CACHE' }],
                        text: 'Price ratios come from published list prices, and negotiated rates, output-heavy traffic and post-deploy cache misses move the real bill.',
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
                                'On your own GPUs, **cost per million tokens = GPU price per hour × GPUs ÷ (tokens per second × 3,600) × 1,000,000**. Bigger batches (until memory runs out), FP8, prefix reuse and disaggregation all raise tokens per second per GPU.',
                                `In DeepSeek’s published day, ${formatUSD(DAY.cost)} of GPU time at $${DEEPSEEK_DAY.gpuHourPrice} per GPU-hour served ${DEEPSEEK_DAY.inputTokens / 1e9} billion input and ${DEEPSEEK_DAY.outputTokens / 1e9} billion output tokens.`,
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
                        {
                            kind: 'prose',
                            paras: ['Pull the levers from the top down, because each layer down costs more engineering per dollar saved. Start with the prompt and the gateway, then the engine’s settings, then the fleet, and buy GPUs last.'],
                        },
                    ],
                },
            ],
        },
        {
            id: 'drills',
            code: 'D',
            name: 'Scenarios',
            products: 'one scarce resource each',
            title: 'Start from the scarce resource',
            lede: 'Each scenario names the scarce resource, walks the stack from your code to the GPU, and lists what would change the design.',
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
