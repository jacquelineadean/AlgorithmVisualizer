// Citation database for the Bayes' rule visualization. Every trace step
// must reference at least one of these keys — enforced by the evidence gate.
// Provenance classes are shared site-wide (see ../provenance.js).

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    BAYES1763: {
        key: 'BAYES1763',
        authors: 'T. Bayes (communicated by R. Price)',
        title: 'An Essay towards solving a Problem in the Doctrine of Chances',
        venue: 'Philosophical Transactions of the Royal Society 53, 370–418',
        year: 1763,
        url: 'https://doi.org/10.1098/rstl.1763.0053',
    },
    LAPLACE1774: {
        key: 'LAPLACE1774',
        authors: 'P.-S. Laplace',
        title: 'Mémoire sur la probabilité des causes par les événements',
        venue: 'Mémoires de l’Académie royale des sciences de Paris (Savants étrangers) 6, 621–656',
        year: 1774,
        url: 'https://doi.org/10.1214/ss/1177013621',
    },
    KOLMOGOROV1933: {
        key: 'KOLMOGOROV1933',
        authors: 'A. N. Kolmogorov',
        title: 'Grundbegriffe der Wahrscheinlichkeitsrechnung (Foundations of the Theory of Probability)',
        venue: 'Springer, Berlin',
        year: 1933,
        url: 'https://link.springer.com/book/10.1007/978-3-642-49888-6',
    },
    GH1995: {
        key: 'GH1995',
        authors: 'G. Gigerenzer, U. Hoffrage',
        title: 'How to Improve Bayesian Reasoning Without Instruction: Frequency Formats',
        venue: 'Psychological Review 102(4), 684–704',
        year: 1995,
        url: 'https://doi.org/10.1037/0033-295X.102.4.684',
    },
    EDDY1982: {
        key: 'EDDY1982',
        authors: 'D. M. Eddy',
        title: 'Probabilistic Reasoning in Clinical Medicine: Problems and Opportunities',
        venue: 'Judgment under Uncertainty: Heuristics and Biases, Cambridge University Press',
        year: 1982,
        url: 'https://doi.org/10.1017/CBO9780511809477.021',
    },
};
