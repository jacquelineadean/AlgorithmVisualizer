// Citation database for the training-loop map. The loop itself is
// Rumelhart–Hinton–Williams; everything that makes it work at scale has its
// own paper, and each node cites the one that introduced it.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    RHW1986: {
        key: 'RHW1986',
        authors: 'D. E. Rumelhart, G. E. Hinton, R. J. Williams',
        title: 'Learning Representations by Back-Propagating Errors',
        venue: 'Nature 323, 533–536',
        year: 1986,
        url: 'https://doi.org/10.1038/323533a0',
    },
    KINGMA2015: {
        key: 'KINGMA2015',
        authors: 'D. P. Kingma, J. Ba',
        title: 'Adam: A Method for Stochastic Optimization',
        venue: 'ICLR 2015 (arXiv:1412.6980)',
        year: 2015,
        url: 'https://arxiv.org/abs/1412.6980',
    },
    LOSHCHILOV2019: {
        key: 'LOSHCHILOV2019',
        authors: 'I. Loshchilov, F. Hutter',
        title: 'Decoupled Weight Decay Regularization (AdamW)',
        venue: 'ICLR 2019 (arXiv:1711.05101)',
        year: 2019,
        url: 'https://arxiv.org/abs/1711.05101',
    },
    SHOEYBI2019: {
        key: 'SHOEYBI2019',
        authors: 'M. Shoeybi, M. Patwary, R. Puri, P. LeGresley, J. Casper, B. Catanzaro',
        title: 'Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism',
        venue: 'arXiv:1909.08053',
        year: 2019,
        url: 'https://arxiv.org/abs/1909.08053',
    },
    RAJBHANDARI2020: {
        key: 'RAJBHANDARI2020',
        authors: 'S. Rajbhandari, J. Rasley, O. Ruwase, Y. He',
        title: 'ZeRO: Memory Optimizations Toward Training Trillion Parameter Models',
        venue: 'SC20 (arXiv:1910.02054)',
        year: 2020,
        url: 'https://arxiv.org/abs/1910.02054',
    },
    HUANG2019: {
        key: 'HUANG2019',
        authors: 'Y. Huang, Y. Cheng, A. Bapna, et al.',
        title: 'GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism',
        venue: 'NeurIPS 2019 (arXiv:1811.06965)',
        year: 2019,
        url: 'https://arxiv.org/abs/1811.06965',
    },
    MICIKEVICIUS2018: {
        key: 'MICIKEVICIUS2018',
        authors: 'P. Micikevicius, S. Narang, J. Alben, et al.',
        title: 'Mixed Precision Training',
        venue: 'ICLR 2018 (arXiv:1710.03740)',
        year: 2018,
        url: 'https://arxiv.org/abs/1710.03740',
    },
    GOYAL2017: {
        key: 'GOYAL2017',
        authors: 'P. Goyal, P. Dollár, R. Girshick, et al.',
        title: 'Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour (warmup and linear scaling)',
        venue: 'arXiv:1706.02677',
        year: 2017,
        url: 'https://arxiv.org/abs/1706.02677',
    },
    KAPLAN2020: {
        key: 'KAPLAN2020',
        authors: 'J. Kaplan, S. McCandlish, T. Henighan, et al.',
        title: 'Scaling Laws for Neural Language Models (the 6ND compute estimate)',
        venue: 'arXiv:2001.08361',
        year: 2020,
        url: 'https://arxiv.org/abs/2001.08361',
    },
    HOFFMANN2022: {
        key: 'HOFFMANN2022',
        authors: 'J. Hoffmann, S. Borgeaud, A. Mensch, et al.',
        title: 'Training Compute-Optimal Large Language Models (Chinchilla)',
        venue: 'NeurIPS 2022 (arXiv:2203.15556)',
        year: 2022,
        url: 'https://arxiv.org/abs/2203.15556',
    },
    CHEN2016: {
        key: 'CHEN2016',
        authors: 'T. Chen, B. Xu, C. Zhang, C. Guestrin',
        title: 'Training Deep Nets with Sublinear Memory Cost (activation checkpointing)',
        venue: 'arXiv:1604.06174',
        year: 2016,
        url: 'https://arxiv.org/abs/1604.06174',
    },
    PASZKE2019: {
        key: 'PASZKE2019',
        authors: 'A. Paszke, S. Gross, F. Massa, et al.',
        title: 'PyTorch: An Imperative Style, High-Performance Deep Learning Library',
        venue: 'NeurIPS 2019 (arXiv:1912.01703)',
        year: 2019,
        url: 'https://arxiv.org/abs/1912.01703',
    },
};
