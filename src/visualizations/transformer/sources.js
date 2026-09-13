// Citation database for the transformer architecture map. Every node cites
// the paper that introduced the component it describes — the per-node
// evidence gate refuses anything else.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    VASWANI2017: {
        key: 'VASWANI2017',
        authors: 'A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, I. Polosukhin',
        title: 'Attention Is All You Need',
        venue: 'Advances in Neural Information Processing Systems 30 (arXiv:1706.03762)',
        year: 2017,
        url: 'https://arxiv.org/abs/1706.03762',
    },
    BA2016: {
        key: 'BA2016',
        authors: 'J. L. Ba, J. R. Kiros, G. E. Hinton',
        title: 'Layer Normalization',
        venue: 'arXiv:1607.06450',
        year: 2016,
        url: 'https://arxiv.org/abs/1607.06450',
    },
    HE2015: {
        key: 'HE2015',
        authors: 'K. He, X. Zhang, S. Ren, J. Sun',
        title: 'Deep Residual Learning for Image Recognition',
        venue: 'CVPR 2016 (arXiv:1512.03385)',
        year: 2015,
        url: 'https://arxiv.org/abs/1512.03385',
    },
    XIONG2020: {
        key: 'XIONG2020',
        authors: 'R. Xiong, Y. Yang, D. He, et al.',
        title: 'On Layer Normalization in the Transformer Architecture (pre-LN vs post-LN)',
        venue: 'ICML 2020 (arXiv:2002.04745)',
        year: 2020,
        url: 'https://arxiv.org/abs/2002.04745',
    },
    SENNRICH2016: {
        key: 'SENNRICH2016',
        authors: 'R. Sennrich, B. Haddow, A. Birch',
        title: 'Neural Machine Translation of Rare Words with Subword Units (byte-pair encoding)',
        venue: 'ACL 2016 (arXiv:1508.07909)',
        year: 2016,
        url: 'https://arxiv.org/abs/1508.07909',
    },
    RADFORD2019: {
        key: 'RADFORD2019',
        authors: 'A. Radford, J. Wu, R. Child, D. Luan, D. Amodei, I. Sutskever',
        title: 'Language Models are Unsupervised Multitask Learners (GPT-2)',
        venue: 'OpenAI technical report',
        year: 2019,
        url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
    },
    SU2021: {
        key: 'SU2021',
        authors: 'J. Su, Y. Lu, S. Pan, B. Wen, Y. Liu',
        title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding',
        venue: 'arXiv:2104.09864',
        year: 2021,
        url: 'https://arxiv.org/abs/2104.09864',
    },
    SHAZEER2020: {
        key: 'SHAZEER2020',
        authors: 'N. Shazeer',
        title: 'GLU Variants Improve Transformer (SwiGLU)',
        venue: 'arXiv:2002.05202',
        year: 2020,
        url: 'https://arxiv.org/abs/2002.05202',
    },
    ZHANG2019: {
        key: 'ZHANG2019',
        authors: 'B. Zhang, R. Sennrich',
        title: 'Root Mean Square Layer Normalization (RMSNorm)',
        venue: 'NeurIPS 2019 (arXiv:1910.07467)',
        year: 2019,
        url: 'https://arxiv.org/abs/1910.07467',
    },
    ELHAGE2021: {
        key: 'ELHAGE2021',
        authors: 'N. Elhage, N. Nanda, C. Olsson, et al.',
        title: 'A Mathematical Framework for Transformer Circuits (the residual stream)',
        venue: 'Transformer Circuits Thread, Anthropic',
        year: 2021,
        url: 'https://transformer-circuits.pub/2021/framework/index.html',
    },
    HENDRYCKS2016: {
        key: 'HENDRYCKS2016',
        authors: 'D. Hendrycks, K. Gimpel',
        title: 'Gaussian Error Linear Units (GELUs)',
        venue: 'arXiv:1606.08415',
        year: 2016,
        url: 'https://arxiv.org/abs/1606.08415',
    },
    KAPLAN2020: {
        key: 'KAPLAN2020',
        authors: 'J. Kaplan, S. McCandlish, T. Henighan, et al.',
        title: 'Scaling Laws for Neural Language Models (parameter and FLOP accounting)',
        venue: 'arXiv:2001.08361',
        year: 2020,
        url: 'https://arxiv.org/abs/2001.08361',
    },
};
