// Citation database for the Diffie–Hellman visualization. Every trace step
// must reference at least one of these keys — enforced by the shared
// evidence gate. Provenance classes are shared site-wide (../provenance.js).

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    DH76: {
        key: 'DH76',
        authors: 'W. Diffie, M. E. Hellman',
        title: 'New Directions in Cryptography',
        venue: 'IEEE Transactions on Information Theory 22(6), 644–654',
        year: 1976,
        url: 'https://ee.stanford.edu/~hellman/publications/24.pdf',
    },
    MERKLE78: {
        key: 'MERKLE78',
        authors: 'R. C. Merkle',
        title: 'Secure Communications Over Insecure Channels',
        venue: 'Communications of the ACM 21(4), 294–299',
        year: 1978,
        url: 'https://doi.org/10.1145/359460.359473',
    },
    RFC3526: {
        key: 'RFC3526',
        authors: 'T. Kivinen, M. Kojo',
        title: 'More Modular Exponential (MODP) Diffie-Hellman Groups for Internet Key Exchange (IKE)',
        venue: 'IETF RFC 3526',
        year: 2003,
        url: 'https://www.rfc-editor.org/rfc/rfc3526',
    },
    NIST80056A: {
        key: 'NIST80056A',
        authors: 'E. Barker, L. Chen, A. Roginsky, A. Vassilev, R. Davis',
        title: 'Recommendation for Pair-Wise Key-Establishment Schemes Using Discrete Logarithm Cryptography (Rev. 3)',
        venue: 'NIST Special Publication 800-56A',
        year: 2018,
        url: 'https://doi.org/10.6028/NIST.SP.800-56Ar3',
    },
};
