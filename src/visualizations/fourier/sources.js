// Citation database for the Fourier epicycles. Fourier's 1822 treatise is
// the primary source; Cooley & Tukey made the transform computable at scale,
// and Heideman et al. established that Gauss had the algorithm in 1805.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    FOURIER1822: {
        key: 'FOURIER1822',
        authors: 'J. B. J. Fourier',
        title: 'Théorie analytique de la chaleur',
        venue: 'Firmin Didot, Paris',
        year: 1822,
        url: 'https://gallica.bnf.fr/ark:/12148/bpt6k1045508v',
    },
    COOLEY1965: {
        key: 'COOLEY1965',
        authors: 'J. W. Cooley, J. W. Tukey',
        title: 'An Algorithm for the Machine Calculation of Complex Fourier Series',
        venue: 'Mathematics of Computation 19(90), 297–301',
        year: 1965,
        url: 'https://doi.org/10.1090/S0025-5718-1965-0178586-1',
    },
    HEIDEMAN1984: {
        key: 'HEIDEMAN1984',
        authors: 'M. T. Heideman, D. H. Johnson, C. S. Burrus',
        title: 'Gauss and the History of the Fast Fourier Transform',
        venue: 'IEEE ASSP Magazine 1(4), 14–21',
        year: 1984,
        url: 'https://doi.org/10.1109/MASSP.1984.1162257',
    },
    BRACEWELL2000: {
        key: 'BRACEWELL2000',
        authors: 'R. N. Bracewell',
        title: 'The Fourier Transform and Its Applications (3rd ed.), Ch. 10–11',
        venue: 'McGraw-Hill',
        year: 2000,
        url: 'https://www.mheducation.com/highered/product/fourier-transform-its-applications-bracewell.html',
    },
    GIBBS1899: {
        key: 'GIBBS1899',
        authors: 'J. W. Gibbs',
        title: 'Fourier’s Series (on the overshoot at a discontinuity)',
        venue: 'Nature 59(1539), 606',
        year: 1899,
        url: 'https://doi.org/10.1038/059606a0',
    },
};
