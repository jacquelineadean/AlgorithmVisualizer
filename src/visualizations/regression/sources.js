// Citation database for least squares. Legendre published the method in
// 1805; Gauss claimed prior use and supplied the probabilistic justification
// in 1809; Stigler's account settles what is actually known about the
// priority dispute. Strang carries the projection reading.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    LEGENDRE1805: {
        key: 'LEGENDRE1805',
        authors: 'A.-M. Legendre',
        title: 'Nouvelles méthodes pour la détermination des orbites des comètes — Appendice: Sur la méthode des moindres quarrés',
        venue: 'Firmin Didot, Paris, 72–80',
        year: 1805,
        url: 'https://archive.org/details/nouvellesmthode00lege',
    },
    GAUSS1809: {
        key: 'GAUSS1809',
        authors: 'C. F. Gauss',
        title: 'Theoria motus corporum coelestium in sectionibus conicis solem ambientium, §§175–179',
        venue: 'Perthes & Besser, Hamburg',
        year: 1809,
        url: 'https://archive.org/details/theoriamotuscor00gausgoog',
    },
    STIGLER1981: {
        key: 'STIGLER1981',
        authors: 'S. M. Stigler',
        title: 'Gauss and the Invention of Least Squares',
        venue: 'The Annals of Statistics 9(3), 465–474',
        year: 1981,
        url: 'https://doi.org/10.1214/aos/1176345451',
    },
    STRANG2016: {
        key: 'STRANG2016',
        authors: 'G. Strang',
        title: 'Introduction to Linear Algebra (5th ed.), §4.2–4.3 — projections and least squares',
        venue: 'Wellesley–Cambridge Press',
        year: 2016,
        url: 'https://math.mit.edu/~gs/linearalgebra/',
    },
};
