// Citation database for SmoothQuant. The paper is the primary source; the
// reference code is cited where the page follows it (the smoothing-factor
// clamp, the absmax fake-quantizers, folding into LayerNorm). LLM.int8() is
// where the outlier channels were first measured at scale, and Jacob et al.
// is the integer-GEMM arithmetic that decides which scales are allowed.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    XIAO2023: {
        key: 'XIAO2023',
        authors: 'G. Xiao, J. Lin, M. Seznec, H. Wu, J. Demouth, S. Han',
        title: 'SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models',
        venue: 'ICML 2023, PMLR 202 (arXiv:2211.10438)',
        year: 2023,
        url: 'https://arxiv.org/abs/2211.10438',
    },
    SQCODE: {
        key: 'SQCODE',
        authors: 'G. Xiao, J. Lin, et al. (MIT HAN Lab)',
        title: 'SmoothQuant reference implementation (smooth.py, fake_quant.py)',
        venue: 'GitHub, mit-han-lab/smoothquant',
        year: 2022,
        url: 'https://github.com/mit-han-lab/smoothquant',
    },
    DETTMERS2022: {
        key: 'DETTMERS2022',
        authors: 'T. Dettmers, M. Lewis, Y. Belkada, L. Zettlemoyer',
        title: 'LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale',
        venue: 'NeurIPS 2022 (arXiv:2208.07339)',
        year: 2022,
        url: 'https://arxiv.org/abs/2208.07339',
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
