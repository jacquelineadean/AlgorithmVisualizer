// Citation database for Euclid's algorithm — the oldest algorithm still in
// daily use. Heath's translation is the standard English Elements; Lamé
// supplied the first complexity analysis of any algorithm; Knuth's §4.5.2 is
// the modern treatment.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    EUCLID: {
        key: 'EUCLID',
        authors: 'Euclid (trans. T. L. Heath)',
        title: 'The Thirteen Books of Euclid’s Elements, Vol. 2 — Book VII, Propositions 1–2',
        venue: 'Cambridge University Press (c. 300 BC; translation 1908)',
        year: 1908,
        url: 'https://archive.org/details/thirteenbookseu02heibgoog',
    },
    LAME1844: {
        key: 'LAME1844',
        authors: 'G. Lamé',
        title: 'Note sur la limite du nombre des divisions dans la recherche du plus grand commun diviseur entre deux nombres entiers',
        venue: 'Comptes rendus de l’Académie des Sciences 19, 867–870',
        year: 1844,
        url: 'https://gallica.bnf.fr/ark:/12148/bpt6k2977c',
    },
    KNUTH1997: {
        key: 'KNUTH1997',
        authors: 'D. E. Knuth',
        title: 'The Art of Computer Programming, Vol. 2 (3rd ed.), §4.5.2 — The Greatest Common Divisor',
        venue: 'Addison-Wesley',
        year: 1997,
        url: 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html',
    },
    BEZOUT1779: {
        key: 'BEZOUT1779',
        authors: 'É. Bézout',
        title: 'Théorie générale des équations algébriques',
        venue: 'Ph.-D. Pierres, Paris',
        year: 1779,
        url: 'https://gallica.bnf.fr/ark:/12148/bpt6k106053p',
    },
};
