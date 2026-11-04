// Citation database for GPTQ. The lineage runs from Optimal Brain Surgeon
// (a 1992 pruning rule that compensates every removed weight with the rest)
// through Optimal Brain Compression (the same rule applied to rounding,
// weight by weight) to GPTQ, which made it fast enough for 175-billion-
// parameter models. The reference code is cited where the page follows its
// defaults rather than the paper's prose.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    FRANTAR2023: {
        key: 'FRANTAR2023',
        authors: 'E. Frantar, S. Ashkboos, T. Hoefler, D. Alistarh',
        title: 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers',
        venue: 'ICLR 2023 (arXiv:2210.17323)',
        year: 2023,
        url: 'https://arxiv.org/abs/2210.17323',
    },
    FRANTAR2022: {
        key: 'FRANTAR2022',
        authors: 'E. Frantar, S. P. Singh, D. Alistarh',
        title: 'Optimal Brain Compression: A Framework for Accurate Post-Training Quantization and Pruning',
        venue: 'NeurIPS 2022 (arXiv:2208.11580)',
        year: 2022,
        url: 'https://arxiv.org/abs/2208.11580',
    },
    HASSIBI1992: {
        key: 'HASSIBI1992',
        authors: 'B. Hassibi, D. G. Stork',
        title: 'Second Order Derivatives for Network Pruning: Optimal Brain Surgeon',
        venue: 'Advances in Neural Information Processing Systems 5 (NIPS 1992)',
        year: 1992,
        url: 'https://proceedings.neurips.cc/paper/1992/hash/303ed4c69846ab36c2904d3ba8573050-Abstract.html',
    },
    NAGEL2020: {
        key: 'NAGEL2020',
        authors: 'M. Nagel, R. A. Amjad, M. van Baalen, C. Louizos, T. Blankevoort',
        title: 'Up or Down? Adaptive Rounding for Post-Training Quantization',
        venue: 'ICML 2020 (arXiv:2004.10568)',
        year: 2020,
        url: 'https://arxiv.org/abs/2004.10568',
    },
    JACOB2018: {
        key: 'JACOB2018',
        authors: 'B. Jacob, S. Kligys, B. Chen, M. Zhu, M. Tang, A. Howard, H. Adam, D. Kalenichenko',
        title: 'Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference',
        venue: 'CVPR 2018 (arXiv:1712.05877)',
        year: 2018,
        url: 'https://arxiv.org/abs/1712.05877',
    },
    GPTQCODE: {
        key: 'GPTQCODE',
        authors: 'E. Frantar, S. Ashkboos, T. Hoefler, D. Alistarh',
        title: 'GPTQ reference implementation (gptq.py, quant.py)',
        venue: 'GitHub, IST-DASLab/gptq',
        year: 2022,
        url: 'https://github.com/IST-DASLab/gptq',
    },
    ZHANG2022: {
        key: 'ZHANG2022',
        authors: 'S. Zhang, S. Roller, N. Goyal, M. Artetxe, et al.',
        title: 'OPT: Open Pre-trained Transformer Language Models',
        venue: 'arXiv:2205.01068',
        year: 2022,
        url: 'https://arxiv.org/abs/2205.01068',
    },
};
