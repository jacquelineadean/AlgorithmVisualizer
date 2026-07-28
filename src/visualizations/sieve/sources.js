// Citation database for the sieve visualization. The method is ancient —
// Eratosthenes per Nicomachus — and Horsley's 1772 Royal Society account
// is the linkable primary description; O'Neill 2009 is the definitive
// modern analysis (and rescue) of the genuine algorithm.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    HORSLEY1772: {
        key: 'HORSLEY1772',
        authors: 'S. Horsley',
        title: 'Κόσκινον Ἐρατοσθένους, or The Sieve of Eratosthenes',
        venue: 'Philosophical Transactions of the Royal Society 62, 327–347',
        year: 1772,
        url: 'https://doi.org/10.1098/rstl.1772.0034',
    },
    ONEILL2009: {
        key: 'ONEILL2009',
        authors: 'M. E. O’Neill',
        title: 'The Genuine Sieve of Eratosthenes',
        venue: 'Journal of Functional Programming 19(1), 95–106',
        year: 2009,
        url: 'https://doi.org/10.1017/S0956796808007004',
    },
};
