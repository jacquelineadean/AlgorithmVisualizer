// Citation database for Huffman coding. Huffman's 1952 paper was written as
// a term-paper alternative to a final exam and settled the question Fano and
// Shannon had left open; Shannon 1948 supplies the bound it meets.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    HUFFMAN1952: {
        key: 'HUFFMAN1952',
        authors: 'D. A. Huffman',
        title: 'A Method for the Construction of Minimum-Redundancy Codes',
        venue: 'Proceedings of the IRE 40(9), 1098–1101',
        year: 1952,
        url: 'https://doi.org/10.1109/JRPROC.1952.273898',
    },
    SHANNON1948: {
        key: 'SHANNON1948',
        authors: 'C. E. Shannon',
        title: 'A Mathematical Theory of Communication',
        venue: 'Bell System Technical Journal 27(3), 379–423',
        year: 1948,
        url: 'https://doi.org/10.1002/j.1538-7305.1948.tb01338.x',
    },
    RFC1951: {
        key: 'RFC1951',
        authors: 'P. Deutsch',
        title: 'DEFLATE Compressed Data Format Specification version 1.3',
        venue: 'IETF RFC 1951',
        year: 1996,
        url: 'https://www.rfc-editor.org/rfc/rfc1951',
    },
    DUDA2013: {
        key: 'DUDA2013',
        authors: 'J. Duda',
        title: 'Asymmetric Numeral Systems: Entropy Coding Combining Speed of Huffman Coding with Compression Rate of Arithmetic Coding',
        venue: 'arXiv:1311.2540',
        year: 2013,
        url: 'https://arxiv.org/abs/1311.2540',
    },
};
