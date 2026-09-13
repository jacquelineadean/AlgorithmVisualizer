// Citation database for backpropagation. Rumelhart, Hinton & Williams 1986
// is the paper that made it matter; Linnainmaa had published the reverse
// mode of automatic differentiation in 1970, and Griewank's history
// establishes that priority.

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
    LINNAINMAA1976: {
        key: 'LINNAINMAA1976',
        authors: 'S. Linnainmaa',
        title: 'Taylor Expansion of the Accumulated Rounding Error (the reverse mode, first published in his 1970 thesis)',
        venue: 'BIT Numerical Mathematics 16(2), 146–160',
        year: 1976,
        url: 'https://doi.org/10.1007/BF01931367',
    },
    GRIEWANK2012: {
        key: 'GRIEWANK2012',
        authors: 'A. Griewank',
        title: 'Who Invented the Reverse Mode of Differentiation?',
        venue: 'Documenta Mathematica, Extra Volume ISMP, 389–400',
        year: 2012,
        url: 'https://www.math.uni-bielefeld.de/documenta/vol-ismp/52_griewank-andreas-b.pdf',
    },
    LECUN1998: {
        key: 'LECUN1998',
        authors: 'Y. LeCun, L. Bottou, G. B. Orr, K.-R. Müller',
        title: 'Efficient BackProp',
        venue: 'Neural Networks: Tricks of the Trade, LNCS 1524, 9–50',
        year: 1998,
        url: 'https://doi.org/10.1007/3-540-49430-8_2',
    },
    GOODFELLOW2016: {
        key: 'GOODFELLOW2016',
        authors: 'I. Goodfellow, Y. Bengio, A. Courville',
        title: 'Deep Learning, Ch. 6.5 — back-propagation and other differentiation algorithms',
        venue: 'MIT Press',
        year: 2016,
        url: 'https://www.deeplearningbook.org/contents/mlp.html',
    },
};
