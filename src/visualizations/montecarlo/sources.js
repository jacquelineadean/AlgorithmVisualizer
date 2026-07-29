// Citation database for Monte Carlo π. Metropolis & Ulam's 1949 paper names
// and frames the method; Eckhardt's history records how Ulam arrived at it
// (playing solitaire while convalescing); Hammersley & Handscomb and Robert
// & Casella carry the modern error analysis.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    METROPOLIS1949: {
        key: 'METROPOLIS1949',
        authors: 'N. Metropolis, S. Ulam',
        title: 'The Monte Carlo Method',
        venue: 'Journal of the American Statistical Association 44(247), 335–341',
        year: 1949,
        url: 'https://doi.org/10.1080/01621459.1949.10483310',
    },
    ECKHARDT1987: {
        key: 'ECKHARDT1987',
        authors: 'R. Eckhardt',
        title: 'Stan Ulam, John von Neumann, and the Monte Carlo Method',
        venue: 'Los Alamos Science 15 (Special Issue), 131–137',
        year: 1987,
        url: 'https://library.lanl.gov/cgi-bin/getfile?15-13.pdf',
    },
    HAMMERSLEY1964: {
        key: 'HAMMERSLEY1964',
        authors: 'J. M. Hammersley, D. C. Handscomb',
        title: 'Monte Carlo Methods',
        venue: 'Methuen / Springer, Ch. 2 — “crude” Monte Carlo and its variance',
        year: 1964,
        url: 'https://doi.org/10.1007/978-94-009-5819-7',
    },
    ROBERT2004: {
        key: 'ROBERT2004',
        authors: 'C. P. Robert, G. Casella',
        title: 'Monte Carlo Statistical Methods (2nd ed.), Ch. 3 — Monte Carlo integration',
        venue: 'Springer',
        year: 2004,
        url: 'https://doi.org/10.1007/978-1-4757-4145-2',
    },
};
