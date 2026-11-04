// Citation database for AWQ. The paper is the primary source; the llm-awq
// reference code is cited where the page follows its defaults (the 20-point
// α grid, the √(max·min) normalization, the zero-point group quantizer).
// LLM.int8() is the mixed-precision approach AWQ sets out to avoid, and GPTQ
// the reconstruction-based one it is compared against.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    LIN2024: {
        key: 'LIN2024',
        authors: 'J. Lin, J. Tang, H. Tang, S. Yang, W.-M. Chen, W.-C. Wang, G. Xiao, X. Dang, C. Gan, S. Han',
        title: 'AWQ: Activation-aware Weight Quantization for On-Device LLM Compression and Acceleration',
        venue: 'MLSys 2024 (arXiv:2306.00978)',
        year: 2024,
        url: 'https://arxiv.org/abs/2306.00978',
    },
    AWQCODE: {
        key: 'AWQCODE',
        authors: 'J. Lin, J. Tang, H. Tang, S. Yang, et al. (MIT HAN Lab)',
        title: 'llm-awq reference implementation (auto_scale.py, auto_clip.py, quantizer.py)',
        venue: 'GitHub, mit-han-lab/llm-awq',
        year: 2023,
        url: 'https://github.com/mit-han-lab/llm-awq',
    },
    DETTMERS2022: {
        key: 'DETTMERS2022',
        authors: 'T. Dettmers, M. Lewis, Y. Belkada, L. Zettlemoyer',
        title: 'LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale',
        venue: 'NeurIPS 2022 (arXiv:2208.07339)',
        year: 2022,
        url: 'https://arxiv.org/abs/2208.07339',
    },
    FRANTAR2023: {
        key: 'FRANTAR2023',
        authors: 'E. Frantar, S. Ashkboos, T. Hoefler, D. Alistarh',
        title: 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers',
        venue: 'ICLR 2023 (arXiv:2210.17323)',
        year: 2023,
        url: 'https://arxiv.org/abs/2210.17323',
    },
    JACOB2018: {
        key: 'JACOB2018',
        authors: 'B. Jacob, S. Kligys, B. Chen, M. Zhu, M. Tang, A. Howard, H. Adam, D. Kalenichenko',
        title: 'Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference',
        venue: 'CVPR 2018 (arXiv:1712.05877)',
        year: 2018,
        url: 'https://arxiv.org/abs/1712.05877',
    },
};
