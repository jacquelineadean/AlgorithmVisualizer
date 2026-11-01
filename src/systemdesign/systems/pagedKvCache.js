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
    summary: 'The GPU memory for every live conversation, and how paging fits more of them.',
    intro: 'Five layers of vLLM’s design show why the KV cache limits how many users one GPU serves.',
    direction: { label: 'Depth', top: 'what it is for', bottom: 'how it runs' },
    overview: {
        title: 'Memory that becomes throughput',
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
                        sub: 'Press a layer to read its one-paragraph summary, then follow the link to open it.',
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
                            neighbors: 'The scheduler asks for blocks before it admits a request, and the attention kernel reads through block tables. The prefix cache shares blocks between requests that start with the same tokens.',
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
                                'Attention lets each new token read every earlier token’s key and value vectors. Each token adds 2 (key and value) × layers × KV heads × head size × 2 bytes to the cache.',
                                `That is **${PER_TOKEN.l8}** on Llama 3 8B, so one ${fmt(KV_RESERVE_TOKENS)}-token sequence holds ${formatBytes(ONE_H100.perSeq)}. Llama 3 70B needs ${PER_TOKEN.l70}, and Llama 2 13B, without grouped-query attention, needs ${PER_TOKEN.l13}.`,
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
                                'A sequence sees its cache as contiguous logical blocks, while the physical blocks sit anywhere in GPU memory. Only the last block can be partly empty.',
                            ],
                        },
                        {
                            kind: 'table',
                            caption: `Block table for one 40-token sequence, ${KV_BLOCK_TOKENS} tokens per block`,
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
                                '`--gpu-memory-utilization` is the share of GPU memory vLLM may use, and what the weights leave becomes KV blocks.',
                                '`--block-size` sets tokens per block, and smaller blocks waste less in the last block but add table entries.',
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
                                'Before PagedAttention, servers reserved one contiguous region per request, sized for the longest output it might produce.',
                            ],
                        },
                        {
                            kind: 'lab',
                            lab: 'kv-layout',
                            title: 'Where the KV cache memory goes',
                            sub: `Switch the layout of ${fmt(GEO.blocks)} blocks and watch requests that fit and blocks reserved but never used.`,
                        },
                        {
                            kind: 'prose',
                            paras: ['A finished sequence returns its blocks to a free list at once.'],
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
                                'Each physical block keeps a reference count of the sequences that point at it. A new request that starts with a cached system prompt finds its blocks already computed.',
                                'vLLM’s automatic prefix caching identifies each full block by a hash of its tokens and the previous block’s hash. SGLang’s RadixAttention keeps the same information as a radix tree of token sequences.',
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
                            caption: 'One H100, Llama 3 8B, and the request mix from the D3 lab',
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
                                `Paging fits ${(LAYOUT.paged.requests / LAYOUT.reserve.requests).toFixed(2)} times as many requests as reserving does. Sharing the ${fmt(KV_SYSTEM_PROMPT)}-token prompt fits ${(LAYOUT.shared.requests / LAYOUT.reserve.requests).toFixed(1)} times as many, because the largest part of every request is stored once.`,
                            ],
                        },
                    ],
                    caveat: {
                        provenance: 'pedagogical',
                        sourceRefs: [{ key: 'KWON2023' }],
                        text: 'The lab’s request mix is invented, while the paper’s 20 to 38 percent and under 4 percent figures are measured.',
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
                                'Paging admits requests before knowing their length, so the cache can still fill. The scheduler then preempts the newest sequences and either swaps their blocks to CPU memory or drops them.',
                                'Recomputation rebuilds dropped blocks in one prefill pass when the sequence resumes. In the paper, swapping matched recomputation at 16 to 64 tokens per block and slowed on smaller, more numerous blocks.',
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
                                'Reading through the block table made the paper’s attention kernel about 20 to 26 percent slower than a contiguous one. Attention is a fraction of each step, and the larger batch gains more than the kernel loses.',
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
                            paras: ['A small-batch decode step is bound by memory bandwidth, so extra sequences add little time and multiply tokens per second.'],
                        },
                        {
                            kind: 'lab',
                            lab: 'batching-curve',
                            title: 'One decode step, many streams',
                            sub: 'Drag batch size and watch throughput climb until the step turns compute bound or the KV cache fills.',
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
                                { title: 'KV cache utilization.', text: 'Near 100 percent at peak is healthy, but 100 percent with a queue calls for more GPUs or shorter outputs.' },
                                { title: 'Preemptions.', text: 'A low, steady rate is fine, while a spike means recomputed requests and a rising p99 latency.' },
                                { title: 'Prefix cache hit rate.', text: 'Falls when routing ignores which GPU holds which prefix.' },
                                { title: 'Queue time.', text: 'Time before admission, which users feel as a slow first token.' },
                            ],
                        },
                        {
                            kind: 'quote',
                            text: 'Page the KV cache: waste drops below 4 percent and the batch grows two to four times. Autoscale on KV cache utilization, the metric that shows when the batch can no longer grow.',
                        },
                    ],
                },
            ],
        },
    ],
});
