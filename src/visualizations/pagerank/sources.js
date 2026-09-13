// Citation database for PageRank. Page & Brin's technical report is the
// primary source; the WWW7 paper describes the search engine it powered.
// Perron and Frobenius supply the eigenvector the whole method computes.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    PAGE1998: {
        key: 'PAGE1998',
        authors: 'L. Page, S. Brin, R. Motwani, T. Winograd',
        title: 'The PageRank Citation Ranking: Bringing Order to the Web',
        venue: 'Stanford InfoLab Technical Report 1999-66',
        year: 1998,
        url: 'https://ilpubs.stanford.edu:8090/422/',
    },
    BRIN1998: {
        key: 'BRIN1998',
        authors: 'S. Brin, L. Page',
        title: 'The Anatomy of a Large-Scale Hypertextual Web Search Engine',
        venue: 'Computer Networks and ISDN Systems 30(1–7), 107–117 (WWW7)',
        year: 1998,
        url: 'https://doi.org/10.1016/S0169-7552(98)00110-X',
    },
    PERRON1907: {
        key: 'PERRON1907',
        authors: 'O. Perron',
        title: 'Zur Theorie der Matrices',
        venue: 'Mathematische Annalen 64, 248–263',
        year: 1907,
        url: 'https://doi.org/10.1007/BF01449896',
    },
    LANGVILLE2006: {
        key: 'LANGVILLE2006',
        authors: 'A. N. Langville, C. D. Meyer',
        title: 'Google’s PageRank and Beyond: The Science of Search Engine Rankings',
        venue: 'Princeton University Press',
        year: 2006,
        url: 'https://doi.org/10.1515/9781400830329',
    },
};
