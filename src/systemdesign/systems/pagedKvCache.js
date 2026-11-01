import { defineSystem } from '../model';
import { KV_BLOCK_TOKENS, KV_RESERVE_TOKENS, KV_SYSTEM_PROMPT, kvGeometry, kvLayouts } from '../models/fundamentals';
import { formatBytes, kvBytesPerToken, serving, SERVING_GPUS, SERVING_MODELS } from '../models/serving';
import { pct } from '../labs/kit';
import { DEPTH_LAYERS, DEPTH_TEXT } from './fundamentalsData';

// Every number below comes from the same models the labs run.
const PER_TOKEN = {
    l8: formatBytes(kvBytesPerToken(SERVING_MODELS.l8)),
    l13: formatBytes(kvBytesPerToken(SERVING_MODELS.l13)),
    l70: formatBytes(kvBytesPerToken(SERVING_MODELS.l70)),
};
const ONE_H100 = serving(SERVING_MODELS.l8, SERVING_GPUS.h100, KV_RESERVE_TOKENS);
const GEO = kvGeometry();
const LAYOUT = kvLayouts();
const fmt = (n) => n.toLocaleString('en-US');
const T = DEPTH_TEXT['paged-kv-cache'];

export default defineSystem({
    id: 'paged-kv-cache',
    category: 'fundamentals',
    name: 'PagedAttention KV cache',
    kicker: 'Component, five layers deep',
    summary: 'The GPU memory that holds every live conversation. Followed from why it exists down to the block tables and the waste they remove.',
    intro: 'Any design that serves a large language model has a box for GPU workers. Inside that box, the KV cache decides how many users one GPU can serve. These five layers explain why, using vLLM’s design as the worked example.',
    direction: { label: 'Depth', top: 'what it is for', bottom: 'how it runs' },
    overview: {
        title: 'Memory that becomes throughput',
        lede: 'Each decode step reads the model weights once and produces one token for every sequence in the batch. The KV cache decides how big that batch can be.',
        sections: [
            {
                id: 'layers',
                label: 'The five layers',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'SDDD_MODELS' }, { key: 'KWON2023' }],
                blocks: [
                    { kind: 'layers' },
                    {
                        kind: 'lab',
                        lab: 'depth-strata',
                        props: { only: ['paged-kv-cache'] },
                        title: 'Step through the layers',
                        sub: 'Each layer in one paragraph. The link under each opens that layer here.',
                    },
                ],
            },
            {
                id: 'numbers',
                label: 'The numbers',
                provenance: 'pedagogical',
                sourceRefs: [{ key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }],
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: PER_TOKEN.l8, label: 'KV cache per token, Llama 3 8B', note: '32 layers, 8 KV heads of 128, 16-bit' },
                            { value: PER_TOKEN.l13, label: 'KV cache per token, Llama 2 13B', note: '40 layers, 40 KV heads: no grouped-query attention' },
                            { value: fmt(GEO.tokens), label: 'tokens of KV cache on one H100', note: 'Llama 3 8B, after weights, at 90% of memory' },
                            { value: fmt(GEO.blocks), label: `blocks of ${KV_BLOCK_TOKENS} tokens`, note: 'the unit the allocator hands out' },
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
            title: 'The attention state of every live sequence',
            lede: T[0],
            sections: [
                {
                    id: 'spec',
                    label: 'Spec sheet',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'VLLM2023' }],
                    blocks: [
                        {
                            kind: 'spec',
                            owns: 'The keys and values that every active sequence has computed so far, in GPU memory.',
                            neighbors: 'The scheduler asks for blocks before it admits a request. The attention kernel reads through block tables. The prefix cache shares blocks between requests.',
                            pattern: 'Virtual memory in an operating system: fixed-size pages, a page table per process, pages shared copy-on-write.',
                            metrics: ['KV cache utilization', 'Preemptions per minute', 'Prefix cache hit rate', 'Time requests wait before admission'],
                            knobs: ['Share of GPU memory given to the cache', `Block size (${KV_BLOCK_TOKENS} tokens by default)`, 'Maximum sequences per batch', 'Prefix caching'],
                            failures: ['Cache full: new requests wait and running ones are preempted', 'Long contexts crowd out short ones', 'A popular prefix pins memory on one GPU'],
                            boundary: 'Every autoregressive serving stack has a KV cache. Paging it pays off when request lengths vary, which is the normal case for chat.',
                        },
                    ],
                },
                {
                    id: 'why',
                    label: 'Why it exists',
                    provenance: 'theorem',
                    sourceRefs: [{ key: 'LLAMA_CONFIGS' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Attention lets each new token look at every earlier token, through that token’s key and value vectors. Recomputing them at every step would repeat the whole prompt each time. Caching them makes each decode step cost one token of new work.',
                                `The size follows from the model config: 2 (key and value) × layers × KV heads × head size × 2 bytes. Llama 3 8B needs **${PER_TOKEN.l8}** per token and Llama 3 70B needs ${PER_TOKEN.l70}. Llama 2 13B, without grouped-query attention, needs ${PER_TOKEN.l13}. One ${fmt(KV_RESERVE_TOKENS)}-token sequence on Llama 3 8B holds ${formatBytes(ONE_H100.perSeq)}.`,
                            ],
                        },
                    ],
                },
            ],
        },
        {
            id: 'd2',
            code: 'D2',
            name: DEPTH_LAYERS[1],
            title: 'Block tables map each sequence to physical blocks',
            lede: T[1],
            sections: [
                {
                    id: 'table',
                    label: 'A block table',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KWON2023' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'A sequence sees its cache as contiguous logical blocks. The block table maps each logical block to a physical block anywhere in GPU memory. Only the last block can be partly empty.',
                                `A request with 40 tokens so far uses three blocks of ${KV_BLOCK_TOKENS}: two full, one with 8 tokens and room for 8 more.`,
                            ],
                        },
                        {
                            kind: 'table',
                            caption: 'Block table for one 40-token sequence',
                            columns: ['Logical block', 'Physical block', 'Tokens filled'],
                            rows: [
                                ['0', '7', '16 of 16'],
                                ['1', '1', '16 of 16'],
                                ['2', '3', '8 of 16'],
                            ],
                        },
                    ],
                },
                {
                    id: 'config',
                    label: 'Config that matters',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'VLLM2023' }, { key: 'VLLM_V1' }],
                    blocks: [
                        {
                            kind: 'code',
                            code: 'vllm serve meta-llama/Meta-Llama-3-8B-Instruct \\\n  --gpu-memory-utilization 0.90 \\\n  --block-size 16 \\\n  --max-num-seqs 256 \\\n  --enable-prefix-caching',
                            notes: [
                                '`--gpu-memory-utilization` is the share of GPU memory vLLM may use. What the weights leave becomes KV blocks.',
                                '`--block-size` is tokens per block. Smaller blocks waste less in the last block and add more table entries.',
                                '`--max-num-seqs` caps the batch even when memory would allow more.',
                                '`--enable-prefix-caching` lets requests that start with the same tokens share their blocks.',
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
            title: 'Allocate on demand, share by reference',
            lede: T[2],
            sections: [
                {
                    id: 'alloc',
                    label: 'On-demand blocks',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KWON2023' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Before PagedAttention, servers reserved one contiguous region per request, sized for the longest output the request might produce. Most requests stop early, so most of that region was never written.',
                                'Paging allocates a block only when the sequence fills the previous one. A finished sequence returns its blocks to a free list at once.',
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'kv-layout',
                            title: 'Where the KV cache memory goes',
                            sub: `One H100 serving Llama 3 8B: ${fmt(GEO.blocks)} blocks of ${KV_BLOCK_TOKENS} tokens. Every request carries the same ${fmt(KV_SYSTEM_PROMPT)}-token system prompt plus 48 to 1,048 tokens of its own.`,
                        },
                    ],
                },
                {
                    id: 'share',
                    label: 'Sharing prefixes',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'VLLM_V1' }, { key: 'ZHENG2024' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Because blocks are referenced through a table, two sequences can point at the same physical block. Each block keeps a reference count. When a shared block must change, it is copied first: copy-on-write.',
                                'vLLM’s automatic prefix caching identifies each full block by a hash of its tokens together with the hash of the block before it. A new request that starts with the same system prompt finds those blocks already computed. SGLang’s RadixAttention keeps the same information as a radix tree of token sequences.',
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
            title: 'Waste drops below 4 percent, and preemption takes its place',
            lede: T[3],
            sections: [
                {
                    id: 'waste',
                    label: 'Waste, measured',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }],
                    blocks: [
                        {
                            kind: 'table',
                            caption: 'One H100, Llama 3 8B, the request mix in the lab above',
                            columns: ['Layout', 'Requests that fit', 'Memory holding real tokens'],
                            rows: [
                                [`Reserve ${fmt(KV_RESERVE_TOKENS)} tokens per request`, fmt(LAYOUT.reserve.requests), pct(LAYOUT.reserve.utilization)],
                                [`Paged, ${KV_BLOCK_TOKENS}-token blocks`, fmt(LAYOUT.paged.requests), pct(LAYOUT.paged.utilization)],
                                ['Paged, system prompt shared', fmt(LAYOUT.shared.requests), pct(LAYOUT.shared.utilization)],
                            ],
                        },
                        {
                            kind: 'prose',
                            paras: [
                                `Paging fits ${(LAYOUT.paged.requests / LAYOUT.reserve.requests).toFixed(2)} times as many requests here. Sharing the ${fmt(KV_SYSTEM_PROMPT)}-token prompt fits ${(LAYOUT.shared.requests / LAYOUT.reserve.requests).toFixed(1)} times as many, because the largest part of every request is stored once.`,
                            ],
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'KWON2023' }],
                        text: 'The request mix is invented for the lab. The paper measured 20 to 38 percent of KV memory holding real state in earlier systems, against under 4 percent waste in vLLM.',
                    },
                },
                {
                    id: 'preempt',
                    label: 'When memory runs out',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KWON2023' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Paging admits requests before knowing how long they will run, so the cache can still fill. The scheduler then preempts the most recent sequences and frees their blocks.',
                                'The paper describes two ways back. Swapping copies the blocks to CPU memory and back later. Recomputation drops them and rebuilds the cache in one prefill pass when the sequence resumes. The paper found the two comparable at block sizes of 16 to 64 tokens. With smaller blocks, swapping is slower because it moves many small pieces.',
                            ],
                        },
                    ],
                },
                {
                    id: 'kernel',
                    label: 'The price',
                    provenance: 'paper',
                    sourceRefs: [{ key: 'KWON2023' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'Reading through a block table costs extra indirection inside the attention kernel. The paper measured its attention kernel at about 20 to 26 percent slower than a contiguous one. Attention is a fraction of each step, and the larger batch more than pays for it.',
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
            title: 'Batch size is the throughput lever',
            lede: T[4],
            sections: [
                {
                    id: 'batch',
                    label: 'Memory into throughput',
                    provenance: 'pedagogical',
                    sourceRefs: [{ key: 'KWON2023' }, { key: 'LLAMA_CONFIGS' }, { key: 'NVIDIA_H100' }, { key: 'NVIDIA_A100' }],
                    blocks: [
                        {
                            kind: 'prose',
                            paras: [
                                'At small batches, a decode step is bound by memory bandwidth: it reads every weight once whatever the batch size. Extra sequences add little time to each step and multiply tokens per second. The KV cache sets the largest batch that fits.',
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'batching-curve',
                            title: 'One decode step, many streams',
                            sub: 'Grow the batch. Throughput climbs until the step becomes compute bound or the KV cache runs out.',
                        },
                    ],
                },
                {
                    id: 'watch',
                    label: 'What to watch',
                    provenance: 'modern',
                    sourceRefs: [{ key: 'VLLM2023' }, { key: 'KWON2023' }],
                    blocks: [
                        {
                            kind: 'list',
                            style: 'cards',
                            items: [
                                { title: 'KV cache utilization.', text: 'Near 100 percent at peak is healthy. Pinned at 100 percent with a queue means you need more GPUs or shorter outputs.' },
                                { title: 'Preemptions.', text: 'A steady trickle is fine. A spike means requests are being recomputed and latency at p99 will follow.' },
                                { title: 'Prefix cache hit rate.', text: 'Falls when routing ignores which GPU holds which prefix.' },
                                { title: 'Queue time.', text: 'Time before admission. This is what users feel as a slow first token.' },
                            ],
                        },
                        {
                            kind: 'quote',
                            text: 'Paging the KV cache cuts waste from most of the reservation to under 4 percent, so the batch grows two to four times. I would autoscale on KV cache utilization, not GPU busy time.',
                        },
                    ],
                },
            ],
        },
    ],
});
