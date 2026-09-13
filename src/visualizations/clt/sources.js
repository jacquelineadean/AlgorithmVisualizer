// Citation database for the central limit theorem. Laplace states the
// result in 1810; Lyapunov and Lindeberg supply the conditions that make it
// a theorem rather than an observation; Pólya names it.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    LAPLACE1810: {
        key: 'LAPLACE1810',
        authors: 'P.-S. Laplace',
        title: 'Mémoire sur les approximations des formules qui sont fonctions de très grands nombres, et sur leur application aux probabilités',
        venue: 'Mémoires de la Classe des sciences mathématiques et physiques de l’Institut de France, 353–415 (Œuvres complètes XII)',
        year: 1810,
        url: 'https://gallica.bnf.fr/ark:/12148/bpt6k775981',
    },
    LYAPUNOV1901: {
        key: 'LYAPUNOV1901',
        authors: 'A. M. Lyapunov',
        title: 'Nouvelle forme du théorème sur la limite de probabilité',
        venue: 'Mémoires de l’Académie impériale des sciences de St-Pétersbourg 12(5)',
        year: 1901,
        url: 'https://www.mathnet.ru/eng/im5443',
    },
    LINDEBERG1922: {
        key: 'LINDEBERG1922',
        authors: 'J. W. Lindeberg',
        title: 'Eine neue Herleitung des Exponentialgesetzes in der Wahrscheinlichkeitsrechnung',
        venue: 'Mathematische Zeitschrift 15, 211–225',
        year: 1922,
        url: 'https://doi.org/10.1007/BF01494395',
    },
    POLYA1920: {
        key: 'POLYA1920',
        authors: 'G. Pólya',
        title: 'Über den zentralen Grenzwertsatz der Wahrscheinlichkeitsrechnung und das Momentenproblem',
        venue: 'Mathematische Zeitschrift 8, 171–181',
        year: 1920,
        url: 'https://doi.org/10.1007/BF01206525',
    },
    FELLER1971: {
        key: 'FELLER1971',
        authors: 'W. Feller',
        title: 'An Introduction to Probability Theory and Its Applications, Vol. II (2nd ed.), Ch. VIII, XVII',
        venue: 'Wiley',
        year: 1971,
        url: 'https://www.wiley.com/en-us/An+Introduction+to+Probability+Theory+and+Its+Applications%2C+Volume+2%2C+2nd+Edition-p-9780471257097',
    },
};
