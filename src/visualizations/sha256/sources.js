// Citation database for SHA-256. FIPS 180-4 is the specification the code
// implements section by section; Merkle and Damgård supply the construction
// the padding belongs to; Wang's attacks are why SHA-1 is not here.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    FIPS1804: {
        key: 'FIPS1804',
        authors: 'National Institute of Standards and Technology',
        title: 'Secure Hash Standard (SHS), FIPS PUB 180-4 — §4.1.2, §4.2.2, §5.1.1, §6.2',
        venue: 'NIST Federal Information Processing Standards',
        year: 2015,
        url: 'https://doi.org/10.6028/NIST.FIPS.180-4',
    },
    MERKLE1989: {
        key: 'MERKLE1989',
        authors: 'R. C. Merkle',
        title: 'One Way Hash Functions and DES',
        venue: 'CRYPTO ’89, LNCS 435, 428–446',
        year: 1990,
        url: 'https://doi.org/10.1007/0-387-34805-0_40',
    },
    DAMGARD1989: {
        key: 'DAMGARD1989',
        authors: 'I. Damgård',
        title: 'A Design Principle for Hash Functions',
        venue: 'CRYPTO ’89, LNCS 435, 416–427',
        year: 1990,
        url: 'https://doi.org/10.1007/0-387-34805-0_39',
    },
    WANG2005: {
        key: 'WANG2005',
        authors: 'X. Wang, Y. L. Yin, H. Yu',
        title: 'Finding Collisions in the Full SHA-1',
        venue: 'CRYPTO 2005, LNCS 3621, 17–36',
        year: 2005,
        url: 'https://doi.org/10.1007/11535218_2',
    },
    STEVENS2017: {
        key: 'STEVENS2017',
        authors: 'M. Stevens, E. Bursztein, P. Karpman, A. Albertini, Y. Markov',
        title: 'The First Collision for Full SHA-1 (SHAttered)',
        venue: 'CRYPTO 2017, LNCS 10401, 570–596',
        year: 2017,
        url: 'https://doi.org/10.1007/978-3-319-63688-7_19',
    },
};
