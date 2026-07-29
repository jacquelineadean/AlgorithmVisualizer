// Citation database for the LLM inference map. Every serving technique on
// the page cites the paper that introduced it; the hardware numbers cite the
// vendor's own specification.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    VASWANI2017: {
        key: 'VASWANI2017',
        authors: 'A. Vaswani, N. Shazeer, N. Parmar, et al.',
        title: 'Attention Is All You Need',
        venue: 'NeurIPS 2017 (arXiv:1706.03762)',
        year: 2017,
        url: 'https://arxiv.org/abs/1706.03762',
    },
    POPE2022: {
        key: 'POPE2022',
        authors: 'R. Pope, S. Douglas, A. Chowdhery, et al.',
        title: 'Efficiently Scaling Transformer Inference',
        venue: 'MLSys 2023 (arXiv:2211.05102)',
        year: 2022,
        url: 'https://arxiv.org/abs/2211.05102',
    },
    YU2022: {
        key: 'YU2022',
        authors: 'G.-I. Yu, J. S. Jeong, G.-W. Kim, S. Kim, B.-G. Chun',
        title: 'Orca: A Distributed Serving System for Transformer-Based Generative Models (continuous batching)',
        venue: 'USENIX OSDI 2022, 521–538',
        year: 2022,
        url: 'https://www.usenix.org/conference/osdi22/presentation/yu',
    },
    KWON2023: {
        key: 'KWON2023',
        authors: 'W. Kwon, Z. Li, S. Zhuang, et al.',
        title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM)',
        venue: 'ACM SOSP 2023 (arXiv:2309.06180)',
        year: 2023,
        url: 'https://arxiv.org/abs/2309.06180',
    },
    LEVIATHAN2023: {
        key: 'LEVIATHAN2023',
        authors: 'Y. Leviathan, M. Kalman, Y. Matias',
        title: 'Fast Inference from Transformers via Speculative Decoding',
        venue: 'ICML 2023 (arXiv:2211.17192)',
        year: 2023,
        url: 'https://arxiv.org/abs/2211.17192',
    },
    HOLTZMAN2020: {
        key: 'HOLTZMAN2020',
        authors: 'A. Holtzman, J. Buys, L. Du, M. Forbes, Y. Choi',
        title: 'The Curious Case of Neural Text Degeneration (nucleus sampling)',
        venue: 'ICLR 2020 (arXiv:1904.09751)',
        year: 2020,
        url: 'https://arxiv.org/abs/1904.09751',
    },
    DAO2022: {
        key: 'DAO2022',
        authors: 'T. Dao, D. Y. Fu, S. Ermon, A. Rudra, C. Ré',
        title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
        venue: 'NeurIPS 2022 (arXiv:2205.14135)',
        year: 2022,
        url: 'https://arxiv.org/abs/2205.14135',
    },
    AINSLIE2023: {
        key: 'AINSLIE2023',
        authors: 'J. Ainslie, J. Lee-Thorp, M. de Jong, et al.',
        title: 'GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints',
        venue: 'EMNLP 2023 (arXiv:2305.13245)',
        year: 2023,
        url: 'https://arxiv.org/abs/2305.13245',
    },
    SENNRICH2016: {
        key: 'SENNRICH2016',
        authors: 'R. Sennrich, B. Haddow, A. Birch',
        title: 'Neural Machine Translation of Rare Words with Subword Units',
        venue: 'ACL 2016 (arXiv:1508.07909)',
        year: 2016,
        url: 'https://arxiv.org/abs/1508.07909',
    },
    WILLIAMS2009: {
        key: 'WILLIAMS2009',
        authors: 'S. Williams, A. Waterman, D. Patterson',
        title: 'Roofline: An Insightful Visual Performance Model for Multicore Architectures',
        venue: 'Communications of the ACM 52(4), 65–76',
        year: 2009,
        url: 'https://doi.org/10.1145/1498765.1498785',
    },
    NVIDIA_A100: {
        key: 'NVIDIA_A100',
        authors: 'NVIDIA Corporation',
        title: 'NVIDIA A100 Tensor Core GPU Architecture (80GB SXM: 312 TFLOP/s bf16, 2.0 TB/s HBM2e)',
        venue: 'NVIDIA product documentation',
        year: 2020,
        url: 'https://www.nvidia.com/en-us/data-center/a100/',
    },
    NVIDIA_H100: {
        key: 'NVIDIA_H100',
        authors: 'NVIDIA Corporation',
        title: 'NVIDIA H100 Tensor Core GPU Architecture (80GB SXM: 989 TFLOP/s bf16, 3.35 TB/s HBM3)',
        venue: 'NVIDIA product documentation',
        year: 2022,
        url: 'https://www.nvidia.com/en-us/data-center/h100/',
    },
};
