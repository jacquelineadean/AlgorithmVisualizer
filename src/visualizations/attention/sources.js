// Citation database for attention. Bahdanau et al. introduced it for
// translation alignment; Vaswani et al. removed the recurrence around it and
// defined scaled dot-product attention in the form used today.

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
    BAHDANAU2015: {
        key: 'BAHDANAU2015',
        authors: 'D. Bahdanau, K. Cho, Y. Bengio',
        title: 'Neural Machine Translation by Jointly Learning to Align and Translate',
        venue: 'ICLR 2015 (arXiv:1409.0473)',
        year: 2015,
        url: 'https://arxiv.org/abs/1409.0473',
    },
    LUONG2015: {
        key: 'LUONG2015',
        authors: 'M.-T. Luong, H. Pham, C. D. Manning',
        title: 'Effective Approaches to Attention-based Neural Machine Translation',
        venue: 'EMNLP 2015 (arXiv:1508.04025)',
        year: 2015,
        url: 'https://arxiv.org/abs/1508.04025',
    },
    ELHAGE2021: {
        key: 'ELHAGE2021',
        authors: 'N. Elhage, N. Nanda, C. Olsson, et al.',
        title: 'A Mathematical Framework for Transformer Circuits',
        venue: 'Transformer Circuits Thread, Anthropic',
        year: 2021,
        url: 'https://transformer-circuits.pub/2021/framework/index.html',
    },
};
