// Drills, quizzes, glossary and timeline for the AI inference stack,
// written for this site from the papers and announcements in sources.js.
// Steps name the layer they act on (l1 to l7).

export const LAYER_DRILLS = {
    l1: {
        scenario: 'A support bot sends: the current time, a long system prompt, the customer’s account record, the conversation so far and the new message. Costs are high and time to first token is slow. Lay out the prompt again.',
        scarce: 'Prefill compute on repeated tokens. Every request recomputes thousands of tokens that did not change since the last turn.',
        steps: [
            {
                layer: 'l1',
                title: 'Order by stability',
                text: 'System prompt and tools first, then the account record, then the conversation, then the time and the new message.',
            },
            {
                layer: 'l1',
                title: 'Mark the cache breakpoints',
                text: 'Cache up to the end of the conversation so far. Each new turn appends to it.',
            },
            {
                layer: 'l2',
                title: 'Watch the hit rate',
                text: 'Log `cache_read_input_tokens` per route in the gateway and alert when the share drops after a deploy.',
            },
        ],
        switches: [
            'If the account record changes every turn, move it after the conversation.',
            'If prompts are below the provider’s minimum cacheable length, caching does nothing; spend effort on shorter prompts instead.',
        ],
    },
    l2: {
        scenario: 'Design a multi-tenant gateway in front of two model providers for forty internal teams, each with its own monthly budget.',
        scarce: 'Money, metered in tokens, shared across tenants. Second: provider capacity, which fails independently of your code.',
        steps: [
            {
                layer: 'l2',
                title: 'Identity and budgets',
                text: 'Issue a virtual key per team and service. Store budgets in tokens and dollars per key.',
            },
            {
                layer: 'l2',
                title: 'Admission',
                text: 'A token bucket per key, charged with an estimate at admission and corrected from the provider’s usage record.',
            },
            {
                layer: 'l2',
                title: 'Routing and failure',
                text: 'Route by model and price. Retry with capped backoff, then fall back to the next provider. Log every retry as cost.',
            },
            { layer: 'l3', title: 'Self-hosted fleet behind it', text: 'Treat your own fleet as one more provider with its own capacity signal.' },
        ],
        switches: ['A single team and a single provider: use the SDK library and skip the proxy hop.', 'Strict data residency: route by region before price.'],
    },
    l3: {
        scenario: 'Long-document question answering: prompts of tens of thousands of tokens, short answers, and a strict target for time per output token.',
        scarce: 'Decode smoothness. Long prefills on shared GPUs stall every answer in progress.',
        steps: [
            {
                layer: 'l3',
                title: 'Split the pools',
                text: 'Prefill GPUs read documents; decode GPUs stream answers; NIXL or RDMA moves the KV cache between them.',
            },
            {
                layer: 'l3',
                title: 'Route by document',
                text: 'Send repeat questions about the same document to the replica that holds its KV cache, and offload cold documents to CPU memory or SSD.',
            },
            {
                layer: 'l4',
                title: 'Tune each engine for its job',
                text: 'Prefill workers take large token budgets; decode workers take many concurrent sequences.',
            },
        ],
        switches: [
            'If documents are rarely reused, the KV pool buys little; size it small.',
            'If the fleet is a single node, start with chunked prefill on one pool.',
        ],
    },
    l4: {
        scenario: 'An engine serving a 70B-class model shows high throughput but users complain that answers stutter. KV cache usage sits near 100%.',
        scarce: 'GPU memory for KV cache.',
        steps: [
            {
                layer: 'l4',
                title: 'Confirm preemption',
                text: 'Check preemption and recompute counters. A full KV cache forces the engine to evict and recompute requests.',
            },
            { layer: 'l4', title: 'Cap concurrency', text: 'Lower the maximum concurrent sequences so admitted requests finish without eviction.' },
            { layer: 'l6', title: 'Shrink the cache', text: 'Use an FP8 KV cache where the kernels support it, halving bytes per token.' },
            { layer: 'l3', title: 'Add capacity sideways', text: 'Add replicas and route by prefix so shared prompts are stored once.' },
        ],
        switches: [
            'If prompts share long prefixes, prefix caching may free enough memory on its own.',
            'If latency targets are loose, accept a longer queue instead of more GPUs.',
        ],
    },
    l5: {
        scenario: 'A profile of a decode step shows the GPU busy less than half the time, with gaps between many short kernels.',
        scarce: 'CPU time to launch GPU work.',
        steps: [
            { layer: 'l5', title: 'Compile', text: 'Turn on torch.compile so small operations fuse into fewer kernels.' },
            { layer: 'l5', title: 'Capture', text: 'Capture CUDA graphs for the batch sizes you serve; pad to the nearest one.' },
            { layer: 'l4', title: 'Grow the step', text: 'A bigger batch makes each kernel longer, so launch overhead becomes a smaller share.' },
        ],
        switches: [
            'If shapes vary wildly, graphs will miss often; fix the shape buckets first.',
            'If gaps remain, look for host-side work such as sampling or detokenization on the critical path.',
        ],
    },
    l6: {
        scenario: 'A new model uses an attention variant your engine has no fast kernel for. Throughput is a third of a similar-sized model.',
        scarce: 'Kernel coverage for this shape.',
        steps: [
            {
                layer: 'l6',
                title: 'Profile first',
                text: 'Confirm attention dominates the step, and measure achieved bandwidth against the GPU’s peak.',
            },
            {
                layer: 'l6',
                title: 'Prototype in Triton',
                text: 'Write a fused, tiled version quickly and check numerical accuracy against the reference.',
            },
            {
                layer: 'l6',
                title: 'Harden if it matters',
                text: 'If the kernel still dominates, port the hot path to CUDA or CUTLASS for the last stretch of speed.',
            },
        ],
        switches: [
            'If the engine community already has a kernel in progress, contribute there instead of forking.',
            'If the model is short-lived, accept the slow path and spend the time elsewhere.',
        ],
    },
    l7: {
        scenario: 'Choose hardware for a 70B-class chat model where one user’s tokens per second matter more than total throughput.',
        scarce: 'Memory bandwidth per replica.',
        steps: [
            {
                layer: 'l7',
                title: 'Fit the weights',
                text: 'BF16 weights exceed one GPU, so split with tensor parallelism across a node’s NVLink-connected GPUs.',
            },
            {
                layer: 'l7',
                title: 'Buy bandwidth',
                text: 'More GPUs per replica means more combined HBM bandwidth per step, which lowers time per output token.',
            },
            { layer: 'l6', title: 'Halve the bytes', text: 'FP8 weights halve the bytes each step reads, if the quality holds.' },
            { layer: 'l4', title: 'Keep batches modest', text: 'Small batches keep each step short; add replicas for more users.' },
        ],
        switches: [
            'If total throughput matters more, use fewer GPUs per replica and bigger batches.',
            'If the model is mixture-of-experts, interconnect bandwidth becomes the next limit.',
        ],
    },
};

export const CROSS_DRILLS = {
    chat: {
        title: 'Chat assistant',
        scenario: 'Design the serving stack for a chat assistant with many thousands of concurrent users. Product wants a fast first token and a steady stream of text.',
        scarce: 'GPU memory for KV cache, and decode bandwidth. Concurrency is bounded by how many conversations’ caches fit; stream speed by how many bytes each step reads.',
        steps: [
            { layer: 'l1', title: 'Prompt layout', text: 'Stable system prompt and tools first so every user shares one cached prefix.' },
            { layer: 'l2', title: 'Gateway', text: 'Token-per-minute limits per tenant; route simple turns to a smaller model.' },
            {
                layer: 'l3',
                title: 'Platform',
                text: 'KV-aware routing keeps a conversation on the replica holding its history; offload idle conversations to CPU memory.',
            },
            {
                layer: 'l4',
                title: 'Engine',
                text: 'Continuous batching with paged KV and chunked prefill; cap concurrency below the preemption point.',
            },
            { layer: 'l6', title: 'Kernels', text: 'FlashAttention for long histories; FP8 if quality holds.' },
            {
                layer: 'l7',
                title: 'Hardware',
                text: 'Size replicas so weights plus a healthy KV budget fit; scale out with replicas, not wider ones.',
            },
        ],
        switches: [
            'Long prompts with short answers: split prefill and decode.',
            'A small fleet: one pool with chunked prefill is simpler and nearly as good.',
            'Strict per-user speed: fewer users per replica, more replicas.',
        ],
    },
    tenant: {
        title: 'Shared gateway',
        scenario: 'Forty teams share two model providers and one self-hosted fleet. Finance wants per-team budgets; platform wants one place to change routing.',
        scarce: 'Money, metered in tokens, plus provider capacity that fails independently.',
        steps: [
            { layer: 'l2', title: 'Identity', text: 'Virtual keys per team and service, mapped to provider keys held only by the gateway.' },
            {
                layer: 'l2',
                title: 'Admission',
                text: 'Token buckets per key: reserve input tokens plus `max_tokens` at admission, reconcile actual usage after.',
            },
            {
                layer: 'l2',
                title: 'Routing',
                text: 'Rules by model, price and health; capped retries; fallback chains that are tested for answer quality.',
            },
            {
                layer: 'l3',
                title: 'Own fleet',
                text: 'Expose the self-hosted platform as one more provider with a capacity signal the gateway can read.',
            },
            { layer: 'l1', title: 'Clients', text: 'One SDK config: base URL and virtual key. Teams never hold provider keys.' },
        ],
        switches: ['One team, one provider: the SDK library alone is enough.', 'Data residency rules: route by region before price.'],
    },
    rag: {
        title: 'RAG cost',
        scenario: 'A document question-answering product sends long retrieved passages with every question. The monthly bill doubled in a quarter; latency is acceptable.',
        scarce: 'Input tokens. Most of the bill is prompt, and most of the prompt repeats.',
        steps: [
            {
                layer: 'l1',
                title: 'Measure',
                text: 'Split spend into input, output and cache reads per route; find the share of input that repeats.',
            },
            { layer: 'l1', title: 'Reorder', text: 'Put instructions and the most reused passages first; move per-question context to the end.' },
            { layer: 'l2', title: 'Route', text: 'Send lookups and classification to a smaller model; keep synthesis on the large one.' },
            { layer: 'l2', title: 'Batch', text: 'Move nightly re-indexing and evaluation runs to a batch API.' },
            {
                layer: 'l3',
                title: 'If self-hosted',
                text: 'Route by document so repeated passages hit one replica’s cache; offload cold documents to SSD.',
            },
        ],
        switches: [
            'If passages rarely repeat, caching buys little; shorten retrieval instead.',
            'If output dominates, cap answer length and use stop sequences first.',
        ],
    },
    debug: {
        title: 'Debugging a slow deploy',
        scenario: 'Time to first token at p95 doubled after Tuesday’s deploy. Error rate is zero, GPU utilization is high, and no alert fired.',
        scarce: 'Attention. Every success metric is green, so the cause is a change in the shape of the work.',
        steps: [
            {
                layer: 'l1',
                title: 'Diff the prompt',
                text: 'Compare prompt templates before and after; look for anything new ahead of the stable prefix.',
            },
            { layer: 'l2', title: 'Check cache fields', text: 'Plot cache read tokens against cache creation tokens per route across the deploy.' },
            {
                layer: 'l4',
                title: 'Check the engine',
                text: 'Look at queue time, KV cache usage and preemptions; longer prompts can push the cache past full.',
            },
            { layer: 'l3', title: 'Check routing', text: 'A routing change can scatter one prefix across replicas and turn hits into misses.' },
        ],
        switches: [
            'If cache metrics are flat, look at traffic mix: longer prompts raise TTFT on their own.',
            'If only one replica is slow, look for a prefix hot spot.',
        ],
    },
};

export const QUIZZES = {
    l1: {
        questions: [
            {
                q: 'Your agent serializes its tool definitions from a dictionary whose key order changes between processes. What happens to prompt caching?',
                options: [
                    'Nothing: providers sort JSON before hashing',
                    'Requests from different processes miss the cache',
                    'The provider rejects the request',
                    'Only output tokens change',
                ],
                answer: 1,
                explain: 'Caches match token for token from the start. A different key order changes the first tokens. Serialize tools deterministically, for example with sorted keys.',
            },
            {
                q: 'Which parameter caps the most expensive tokens in a request?',
                options: ['temperature', '`max_tokens`', 'top_p', 'stream'],
                answer: 1,
                explain: 'Output tokens cost more than input tokens, and `max_tokens` bounds them. An answer that hits the cap still returns success, with `finish_reason` set to length.',
            },
        ],
        results: [
            { min: 0, label: 'Review the Spec tab', text: 'The Spec tab covers both answers.' },
            { min: 0.5, label: 'Nearly there', text: 'One more pass through the Spec tab will close the gap.' },
            { min: 1, label: 'Both right', text: 'Try the design drill below.' },
        ],
    },
    l2: {
        questions: [
            {
                q: 'Why is a requests-per-second limit a poor guard for an LLM budget?',
                options: [
                    'Requests are always the same size',
                    'One long request can cost as much as thousands of short ones',
                    'Providers ignore rate limits',
                    'Gateways cannot count requests',
                ],
                answer: 1,
                explain: 'Cost scales with tokens. Limit tokens per minute and dollars per month, and keep a request limit as a secondary guard.',
            },
            {
                q: 'Output length is unknown when a request arrives. How does a gateway enforce a token budget?',
                options: [
                    'It cannot',
                    'It reserves an estimate such as input tokens plus `max_tokens`, then reconciles the real usage',
                    'It waits for the answer before admitting the request',
                    'It only counts input tokens',
                ],
                answer: 1,
                explain: 'Reserve-then-reconcile is the standard pattern for metering work whose size is known only afterward.',
            },
        ],
        results: [
            { min: 0, label: 'Review the Spec tab', text: 'The Spec tab covers both answers.' },
            { min: 0.5, label: 'Nearly there', text: 'One more pass through the Spec tab will close the gap.' },
            { min: 1, label: 'Both right', text: 'Try the design drill below.' },
        ],
    },
    l3: {
        questions: [
            {
                q: 'A router can send a request to the least-loaded replica or to the replica holding its prefix. What does a good KV-aware router do?',
                options: ['Always the least-loaded replica', 'Always the replica with the prefix', 'Weigh cache overlap against load', 'Pick at random'],
                answer: 2,
                explain: 'Pure affinity creates hot spots; pure load balancing throws away cached work. Score both.',
            },
            {
                q: 'When is splitting prefill and decode onto separate GPU pools least worth it?',
                options: [
                    'Long prompts and tight latency targets',
                    'Short prompts on a small fleet',
                    'Mixed traffic at scale',
                    'Long answers and long prompts',
                ],
                answer: 1,
                explain: 'With short prompts, prefill interference is small and moving the KV cache between GPUs costs more than it saves.',
            },
        ],
        results: [
            { min: 0, label: 'Review the Spec tab', text: 'The Spec tab covers both answers.' },
            { min: 0.5, label: 'Nearly there', text: 'One more pass through the Spec tab will close the gap.' },
            { min: 1, label: 'Both right', text: 'Try the design drill below.' },
        ],
    },
    l4: {
        questions: [
            {
                q: 'Why does raising the batch size eventually make each user’s tokens slower?',
                options: [
                    'The tokenizer slows down',
                    'Each step does more work once the GPU becomes compute-bound, and reads more KV cache',
                    'The gateway throttles',
                    'Prefix caching turns off',
                ],
                answer: 1,
                explain: 'In the memory-bound region extra requests are nearly free. Past the ridge point, and as KV reads grow, each step takes longer.',
            },
            {
                q: 'What does PagedAttention borrow from operating systems?',
                options: ['Process scheduling', 'Virtual memory with page tables', 'File systems', 'Interrupt handling'],
                answer: 1,
                explain: 'Fixed-size blocks, block tables per request and copy-on-write sharing, the way virtual memory maps pages.',
            },
        ],
        results: [
            { min: 0, label: 'Review the Spec tab', text: 'The Spec tab covers both answers.' },
            { min: 0.5, label: 'Nearly there', text: 'One more pass through the Spec tab will close the gap.' },
            { min: 1, label: 'Both right', text: 'Try the design drill below.' },
        ],
    },
    l5: {
        questions: [
            {
                q: 'Why do engines pad batches to a fixed set of sizes?',
                options: ['Tokenizers need it', 'CUDA graphs replay fixed shapes', 'GPUs only accept powers of two', 'It improves accuracy'],
                answer: 1,
                explain: 'A captured CUDA graph replays one exact sequence of launches for one shape. Padding reuses a captured graph.',
            },
            {
                q: 'Eager PyTorch launches each operation separately. When does that overhead matter most?',
                options: ['Long prefills', 'Small decode steps with tiny kernels', 'Training', 'Loading weights'],
                answer: 1,
                explain: 'Decode kernels are short, so CPU launch time can rival the GPU work. Fusion and CUDA graphs remove most of it.',
            },
        ],
        results: [
            { min: 0, label: 'Review the Spec tab', text: 'The Spec tab covers both answers.' },
            { min: 0.5, label: 'Nearly there', text: 'One more pass through the Spec tab will close the gap.' },
            { min: 1, label: 'Both right', text: 'Try the design drill below.' },
        ],
    },
    l6: {
        questions: [
            {
                q: 'Why does FlashAttention help long prompts more than short ones?',
                options: [
                    'It caches prompts',
                    'The score matrix it avoids writing grows with the square of the prompt length',
                    'It skips tokens',
                    'It runs on the CPU',
                ],
                answer: 1,
                explain: 'Standard attention writes and reads an N by N score matrix in HBM. FlashAttention keeps tiles of it in on-chip memory.',
            },
            {
                q: 'Which “Triton” do you use to write a fused GPU kernel?',
                options: ['OpenAI’s Triton', 'NVIDIA’s Triton Inference Server', 'Either', 'Neither'],
                answer: 0,
                explain: 'OpenAI’s Triton is a kernel language. NVIDIA’s Triton serves models and is now Dynamo-Triton.',
            },
        ],
        results: [
            { min: 0, label: 'Review the Spec tab', text: 'The Spec tab covers both answers.' },
            { min: 0.5, label: 'Nearly there', text: 'One more pass through the Spec tab will close the gap.' },
            { min: 1, label: 'Both right', text: 'Try the design drill below.' },
        ],
    },
    l7: {
        questions: [
            {
                q: 'A 70B-parameter model in BF16 needs how much memory for weights alone?',
                options: ['About 35 GB', 'About 70 GB', 'About 140 GB', 'About 280 GB'],
                answer: 2,
                explain: 'Two bytes per parameter: about 140 GB, more than one 80 GB H100, so the replica spans at least two GPUs.',
            },
            {
                q: 'Which number limits decode speed at small batch sizes on an H100?',
                options: ['Dense BF16 TFLOPS', 'Memory bandwidth', 'Power draw', 'NVLink bandwidth'],
                answer: 1,
                explain: 'Each step reads every weight once to make one token per request, so bytes per second set the floor.',
            },
        ],
        results: [
            { min: 0, label: 'Review the Spec tab', text: 'The Spec tab covers both answers.' },
            { min: 0.5, label: 'Nearly there', text: 'One more pass through the Spec tab will close the gap.' },
            { min: 1, label: 'Both right', text: 'Try the design drill below.' },
        ],
    },
    all: {
        questions: [
            {
                q: 'Which phase of a request is usually limited by memory bandwidth?',
                options: ['Prefill', 'Decode', 'Tokenization', 'Routing'],
                answer: 1,
                explain: 'Decode reads every weight to make one token per request, so bytes per second set its pace.',
            },
            {
                q: 'What grows linearly with both context length and the number of requests in memory?',
                options: ['The model weights', 'The KV cache', 'The tokenizer vocabulary', 'The CUDA graph'],
                answer: 1,
                explain: 'Every token of every request stores keys and values in every layer.',
            },
            {
                q: 'End-to-end latency for one answer is roughly:',
                options: ['TTFT × output tokens', 'TTFT + (output tokens − 1) × TPOT', 'TPOT ÷ TTFT', 'Throughput ÷ requests'],
                answer: 1,
                explain: 'The first token arrives after TTFT; each later token adds one step.',
            },
            {
                q: 'NVIDIA Dynamo belongs to which layer?',
                options: ['The inference engine', 'The inference platform', 'The kernels', 'The AI gateway'],
                answer: 1,
                explain: 'Dynamo sits above engines such as vLLM, SGLang and TensorRT-LLM. It routes requests across replicas, splits prefill from decode and resizes GPU pools.',
            },
            {
                q: 'Which “Triton” is a language for writing GPU kernels?',
                options: ['OpenAI’s Triton', 'NVIDIA’s Triton Inference Server', 'Both', 'Neither'],
                answer: 0,
                explain: 'OpenAI’s Triton writes kernels (L6). NVIDIA’s Triton Inference Server serves models and was renamed Dynamo-Triton in 2025.',
            },
            {
                q: 'Why does decode at batch size one waste most of a GPU?',
                options: [
                    'Attention is quadratic in prompt length',
                    'Each step reads every weight to make one token per request',
                    'The gateway adds latency',
                    'Tokenization runs on the CPU',
                ],
                answer: 1,
                explain: 'An H100 needs about 295 FLOPs per byte of math per byte read to be compute-bound. Decode at batch one does about one.',
            },
            {
                q: 'A cached input token on Anthropic’s API bills at what share of the base input price?',
                options: ['10%', '25%', '50%', '90%'],
                answer: 0,
                explain: 'Reads bill at 10%. Writing the entry costs 25% extra, once per 5 min window.',
            },
            {
                q: 'Where does the split between prefill and decode live?',
                options: [
                    'Only in the engine',
                    'Only in the platform',
                    'In both: the engine mixes them per step, the platform can split them across GPU pools',
                    'In the kernels',
                ],
                answer: 2,
                explain: 'Chunked prefill mixes the phases inside one engine. Disaggregated serving gives each phase its own GPUs across the fleet.',
            },
            {
                q: 'What does a CUDA graph remove?',
                options: ['Memory traffic', 'CPU launch overhead between kernels', 'The KV cache', 'Network hops'],
                answer: 1,
                explain: 'It records the step’s launches once and replays them with a single launch.',
            },
            {
                q: 'A prompt opens with the current timestamp, then a long system prompt. What happens to the cache?',
                options: [
                    'Every request misses, with no error',
                    'The gateway rejects the request',
                    'The cache ignores timestamps',
                    'You pay the write surcharge once, then hit',
                ],
                answer: 0,
                explain: 'Caches match from token one. A different first token means no match, and the response still succeeds.',
            },
        ],
        results: [
            { min: 0, label: 'Back to the concepts', text: 'Start with Concepts, then step through Ownership on the overview.' },
            { min: 0.6, label: 'Most of the map', text: 'Each layer’s Spec tab will close the remaining gaps.' },
            { min: 1, label: 'Every piece placed', text: 'Try the design drills next.' },
        ],
    },
};

export const GLOSSARY = [
    { term: 'Token', def: 'The unit of text a model reads and writes. Prices, limits and speeds all count tokens.', layers: ['l1'] },
    {
        term: 'Prefill',
        def: 'The forward pass over the whole prompt at once. It builds the KV cache and is usually limited by compute.',
        layers: ['l4'],
    },
    {
        term: 'Decode',
        def: 'Generating the answer one token per step per request. Each step reads every weight, so memory bandwidth limits it.',
        layers: ['l4', 'l7'],
    },
    {
        term: 'KV cache',
        def: 'The attention keys and values stored for every token so far. It grows linearly with tokens and requests.',
        layers: ['l4'],
    },
    { term: 'TTFT', def: 'Time to first token: queueing plus prefill. What a user feels as the wait before anything appears.', layers: ['l3', 'l4'] },
    { term: 'TPOT / ITL', def: 'Time per output token, or inter-token latency: the decode step time one user sees.', layers: ['l4'] },
    { term: 'Throughput', def: 'Tokens per second across all requests on a GPU or fleet.', layers: ['l4'] },
    { term: 'Goodput', def: 'Requests per second that meet their latency targets. DistServe optimizes for it.', layers: ['l3'] },
    {
        term: 'Continuous batching',
        def: 'Scheduling one iteration at a time so requests join and leave the batch at every step (Orca).',
        layers: ['l4'],
    },
    {
        term: 'Chunked prefill',
        def: 'Cutting a long prefill into pieces that share steps with decode, so answers in progress keep flowing.',
        layers: ['l4'],
    },
    {
        term: 'PagedAttention',
        def: 'Keeping the KV cache in fixed-size blocks mapped by a per-request block table, like virtual memory (vLLM).',
        layers: ['l4'],
    },
    { term: 'Prefix caching', def: 'Reusing the KV cache of a prompt prefix that an earlier request already computed.', layers: ['l1', 'l3', 'l4'] },
    { term: 'RadixAttention', def: 'SGLang’s prefix cache, stored as a radix tree of token sequences.', layers: ['l4'] },
    { term: 'Preemption', def: 'Evicting a running request’s KV cache when memory is full, then recomputing it later.', layers: ['l4'] },
    { term: 'Disaggregated serving', def: 'Running prefill and decode on separate GPU pools and moving the KV cache between them.', layers: ['l3'] },
    { term: 'KV-aware routing', def: 'Sending a request to the replica that already holds its prefix in cache.', layers: ['l3'] },
    { term: 'NIXL', def: 'NVIDIA’s Inference Xfer Library for moving KV cache between GPUs; Dynamo and llm-d use it.', layers: ['l3'] },
    { term: 'Mooncake', def: 'Moonshot AI’s KV-cache-centric serving design for Kimi, with a shared KV pool in CPU memory and SSD.', layers: ['l3'] },
    { term: 'LMCache', def: 'A KV cache offload and sharing layer; llm-d uses it to move cache to CPU memory or network storage.', layers: ['l3'] },
    {
        term: 'AI gateway',
        def: 'One API in front of many model providers, with virtual keys, token budgets, routing, retries and cost logs.',
        layers: ['l2'],
    },
    { term: 'Virtual key', def: 'A key the gateway issues to a team or service and maps to a real provider key.', layers: ['l2'] },
    { term: 'Tokens per minute (TPM)', def: 'A rate limit counted in tokens, the unit that tracks cost.', layers: ['l2'] },
    { term: 'Fallback', def: 'Sending a failed call to the next model or provider on a list.', layers: ['l2'] },
    {
        term: 'Mixture of experts (MoE)',
        def: 'A model where each token activates only a few expert sub-networks. DeepSeek-V3 activates 8 of 256 routed experts per layer.',
        layers: ['l5'],
    },
    {
        term: 'Grouped-query attention (GQA)',
        def: 'Several query heads share one key/value head, shrinking the KV cache. Every Llama 3 size has 8 KV heads.',
        layers: ['l5'],
    },
    {
        term: 'Multi-head latent attention (MLA)',
        def: 'DeepSeek’s attention that stores a compressed latent instead of full keys and values.',
        layers: ['l5', 'l6'],
    },
    { term: 'Tensor parallelism', def: 'Splitting each layer’s matrices across GPUs so one replica can span a node.', layers: ['l5', 'l7'] },
    { term: 'Expert parallelism', def: 'Spreading a mixture-of-experts model’s experts across many GPUs.', layers: ['l3', 'l7'] },
    { term: 'torch.compile', def: 'PyTorch’s compiler: it traces Python code and fuses operations into fewer GPU kernels.', layers: ['l5'] },
    { term: 'CUDA graph', def: 'A recorded sequence of GPU launches that replays with one launch.', layers: ['l5'] },
    { term: 'Kernel', def: 'A program that runs on the GPU, usually one hot operation such as attention or matrix multiply.', layers: ['l6'] },
    { term: 'GEMM', def: 'General matrix multiply, where most of a transformer’s math happens.', layers: ['l6'] },
    {
        term: 'FlashAttention',
        def: 'An attention kernel that computes in tiles held in on-chip SRAM, so the score matrix never round-trips through HBM.',
        layers: ['l6'],
    },
    { term: 'Triton (OpenAI)', def: 'A Python-like language for writing GPU kernels.', layers: ['l6'] },
    { term: 'Dynamo-Triton', def: 'NVIDIA’s model server, formerly Triton Inference Server, now part of the Dynamo platform.', layers: ['l3'] },
    { term: 'HBM', def: 'High-bandwidth memory stacked beside the GPU die. It holds weights and the KV cache.', layers: ['l7'] },
    { term: 'Arithmetic intensity', def: 'FLOPs performed per byte moved from memory.', layers: ['l7'] },
    {
        term: 'Roofline',
        def: 'A performance model: attainable FLOPS = the smaller of peak compute and bandwidth × arithmetic intensity.',
        layers: ['l7'],
    },
    { term: 'NVLink', def: 'The GPU-to-GPU link inside a node.', layers: ['l7'] },
    { term: 'FP8', def: 'An 8-bit floating-point format; half the bytes of BF16 per value.', layers: ['l6', 'l7'] },
    {
        term: 'Speculative decoding',
        def: 'Drafting several tokens cheaply and verifying them in one pass. DeepSeek’s multi-token prediction raised generation throughput 1.8×.',
        layers: ['l4'],
    },
];

export const TIMELINE = [
    {
        date: 'Jul 2022',
        title: 'Orca',
        text: 'Iteration-level scheduling: requests join and leave the batch at every step. 36.9× the throughput of FasterTransformer at equal latency.',
        kind: 'paper',
    },
    {
        date: 'Sep 2023',
        title: 'PagedAttention and vLLM',
        text: 'KV cache kept in fixed-size pages, like virtual memory. 2× to 4× the throughput of FasterTransformer and Orca.',
        kind: 'paper',
    },
    {
        date: 'Dec 2023',
        title: 'SGLang and RadixAttention',
        text: 'Prefix reuse through a radix tree of cached KV. Up to 6.4× the throughput of earlier systems.',
        kind: 'paper',
    },
    { date: 'Jan 2024', title: 'DistServe', text: 'Prefill and decode on separate GPUs: 7.4× more requests within latency targets.', kind: 'paper' },
    {
        date: 'Jun 2024',
        title: 'Mooncake',
        text: 'Kimi’s serving platform: a shared KV pool in CPU memory and SSD, 75% more requests under real load.',
        kind: 'paper',
    },
    { date: 'Jul 2024', title: 'FlashAttention-3', text: 'An attention kernel for Hopper GPUs at 740 TFLOPS, 75% of peak.', kind: 'paper' },
    { date: 'Aug 2024', title: 'Anthropic prompt caching', text: 'Cached prompt prefixes bill at 10% of the input price.', kind: 'launch' },
    { date: 'Dec 2024', title: 'DeepSeek-V3', text: '671 billion parameters, 37 billion active for each token.', kind: 'launch' },
    {
        date: 'Jan 2025',
        title: 'vLLM V1',
        text: 'A rewritten core: one scheduler for prompt and output tokens, prefix caching on by default, 1.7× the throughput of V0.',
        kind: 'launch',
    },
    {
        date: 'Feb 2025',
        title: 'DeepSeek Open Source Week',
        text: 'FlashMLA, DeepEP, DeepGEMM, EPLB and 3FS, then an inference system overview with real cost and traffic numbers.',
        kind: 'launch',
    },
    {
        date: 'Mar 2025',
        title: 'NVIDIA Dynamo',
        text: 'An open-source platform above vLLM, SGLang and TensorRT-LLM. Triton Inference Server becomes Dynamo-Triton.',
        kind: 'launch',
    },
    {
        date: 'May 2025',
        title: 'LMSYS rebuilds DeepSeek’s serving',
        text: 'SGLang on 96 GPUs: an estimated $0.2 per million output tokens.',
        kind: 'paper',
    },
    {
        date: 'May 2025',
        title: 'llm-d',
        text: 'Kubernetes-native distributed serving on vLLM, from Red Hat, Google Cloud, IBM Research, NVIDIA and CoreWeave.',
        kind: 'launch',
    },
];

export const PHASES = { prompt: ['Explain', 'the', 'KV', 'cache', 'in', 'one', 'line'], output: ['It', 'stores', 'each', 'token’s', 'keys', 'and', 'values.'] };
