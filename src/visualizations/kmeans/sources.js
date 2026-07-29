// Citation database for k-means. Lloyd wrote the algorithm in a 1957 Bell
// Labs memorandum that stayed unpublished until 1982; MacQueen named it;
// Arthur & Vassilvitskii fixed the initialization it had always been
// vulnerable to.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    LLOYD1982: {
        key: 'LLOYD1982',
        authors: 'S. P. Lloyd',
        title: 'Least Squares Quantization in PCM (written as a Bell Labs memorandum, 1957)',
        venue: 'IEEE Transactions on Information Theory 28(2), 129–137',
        year: 1982,
        url: 'https://doi.org/10.1109/TIT.1982.1056489',
    },
    MACQUEEN1967: {
        key: 'MACQUEEN1967',
        authors: 'J. MacQueen',
        title: 'Some Methods for Classification and Analysis of Multivariate Observations',
        venue: 'Proc. 5th Berkeley Symposium on Mathematical Statistics and Probability 1, 281–297',
        year: 1967,
        url: 'https://projecteuclid.org/euclid.bsmsp/1200512992',
    },
    ARTHUR2007: {
        key: 'ARTHUR2007',
        authors: 'D. Arthur, S. Vassilvitskii',
        title: 'k-means++: The Advantages of Careful Seeding',
        venue: 'Proc. 18th ACM-SIAM Symposium on Discrete Algorithms (SODA), 1027–1035',
        year: 2007,
        url: 'https://dl.acm.org/doi/10.5555/1283383.1283494',
    },
    ALOISE2009: {
        key: 'ALOISE2009',
        authors: 'D. Aloise, A. Deshpande, P. Hansen, P. Popat',
        title: 'NP-hardness of Euclidean Sum-of-Squares Clustering',
        venue: 'Machine Learning 75(2), 245–248',
        year: 2009,
        url: 'https://doi.org/10.1007/s10994-009-5103-0',
    },
};
