// Citation database for the RSA visualization. Every trace step must
// reference at least one of these keys — enforced by the evidence gate test.
//
// Provenance classes, adapted from Tekton's measured / rule-derived /
// reconstruction / conjecture layers:
//   paper        — taken directly from the primary source
//   theorem      — the mathematical bedrock the step rests on
//   modern       — how standards bodies say it is done today
//   pedagogical  — a simplification made for teaching, always labeled

export const PROVENANCE = {
    paper: {
        label: 'From the paper',
        description: 'Follows the primary source directly.',
    },
    theorem: {
        label: 'Theorem',
        description: 'Rests on a proved mathematical result.',
    },
    modern: {
        label: 'Modern practice',
        description: 'Reflects current standards, which refine the paper.',
    },
    pedagogical: {
        label: 'Teaching simplification',
        description: 'Simplified for the visualization; real deployments differ.',
    },
};

export const SOURCES = {
    RSA78: {
        key: 'RSA78',
        authors: 'R. L. Rivest, A. Shamir, L. Adleman',
        title: 'A Method for Obtaining Digital Signatures and Public-Key Cryptosystems',
        venue: 'Communications of the ACM 21(2), 120–126',
        year: 1978,
        url: 'https://people.csail.mit.edu/rivest/Rsapaper.pdf',
    },
    DH76: {
        key: 'DH76',
        authors: 'W. Diffie, M. E. Hellman',
        title: 'New Directions in Cryptography',
        venue: 'IEEE Transactions on Information Theory 22(6), 644–654',
        year: 1976,
        url: 'https://ee.stanford.edu/~hellman/publications/24.pdf',
    },
    EULER1763: {
        key: 'EULER1763',
        authors: 'L. Euler',
        title: 'Theoremata arithmetica nova methodo demonstrata (E271)',
        venue: 'Novi Commentarii academiae scientiarum Petropolitanae 8, 74–104',
        year: 1763,
        url: 'https://scholarlycommons.pacific.edu/euler-works/271/',
    },
    KNUTH97: {
        key: 'KNUTH97',
        authors: 'D. E. Knuth',
        title: 'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms (3rd ed.), §4.5.2, §4.6.3',
        venue: 'Addison-Wesley',
        year: 1997,
        url: 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html',
    },
    RFC8017: {
        key: 'RFC8017',
        authors: 'K. Moriarty, B. Kaliski, J. Jonsson, A. Rusch',
        title: 'PKCS #1: RSA Cryptography Specifications Version 2.2',
        venue: 'IETF RFC 8017',
        year: 2016,
        url: 'https://www.rfc-editor.org/rfc/rfc8017',
    },
    NIST80057: {
        key: 'NIST80057',
        authors: 'E. Barker',
        title: 'Recommendation for Key Management, Part 1: General (Rev. 5)',
        venue: 'NIST Special Publication 800-57',
        year: 2020,
        url: 'https://doi.org/10.6028/NIST.SP.800-57pt1r5',
    },
    KL2020: {
        key: 'KL2020',
        authors: 'J. Katz, Y. Lindell',
        title: 'Introduction to Modern Cryptography (3rd ed.)',
        venue: 'Chapman & Hall/CRC',
        year: 2020,
        url: 'https://www.cs.umd.edu/~jkatz/imc.html',
    },
};

export const sourceList = () => Object.values(SOURCES);
