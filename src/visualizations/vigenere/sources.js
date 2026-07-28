// Citation database for the Vigenère visualization. Kasiski's 1863 attack
// and Friedman's index of coincidence are discussed in the trace text; the
// linkable records here are the ones whose URLs the maintainer trusts.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    VIGENERE1586: {
        key: 'VIGENERE1586',
        authors: 'B. de Vigenère',
        title: 'Traicté des chiffres, ou secrètes manières d’escrire',
        venue: 'Abel L’Angelier, Paris',
        year: 1586,
        url: 'https://gallica.bnf.fr/ark:/12148/btv1b86095449',
    },
    SHANNON49: {
        key: 'SHANNON49',
        authors: 'C. E. Shannon',
        title: 'Communication Theory of Secrecy Systems',
        venue: 'Bell System Technical Journal 28(4), 656–715',
        year: 1949,
        url: 'https://doi.org/10.1002/j.1538-7305.1949.tb00928.x',
    },
    KL2020: {
        key: 'KL2020',
        authors: 'J. Katz, Y. Lindell',
        title: 'Introduction to Modern Cryptography (3rd ed.), Ch. 1 — classical ciphers and their cryptanalysis',
        venue: 'Chapman & Hall/CRC',
        year: 2020,
        url: 'https://www.cs.umd.edu/~jkatz/imc.html',
    },
};
