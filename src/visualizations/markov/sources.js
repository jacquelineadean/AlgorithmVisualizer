// Citation database for Markov chains. Markov's own demonstration was
// literary: he counted vowels and consonants in Eugene Onegin to show the
// law of large numbers survives dependence. Perron and Frobenius supply the
// eigenvalue argument behind the stationary distribution.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    MARKOV1913: {
        key: 'MARKOV1913',
        authors: 'A. A. Markov (trans. D. Link)',
        title: 'An Example of Statistical Investigation of the Text Eugene Onegin Concerning the Connection of Samples in Chains',
        venue: 'Science in Context 19(4), 591–600 (English translation of the 1913 paper)',
        year: 2006,
        url: 'https://doi.org/10.1017/S0269889706001074',
    },
    BASHARIN2004: {
        key: 'BASHARIN2004',
        authors: 'G. P. Basharin, A. N. Langville, V. A. Naumov',
        title: 'The Life and Work of A. A. Markov',
        venue: 'Linear Algebra and its Applications 386, 3–26 (on the 1906 chain paper)',
        year: 2004,
        url: 'https://doi.org/10.1016/j.laa.2003.12.041',
    },
    PERRON1907: {
        key: 'PERRON1907',
        authors: 'O. Perron',
        title: 'Zur Theorie der Matrices',
        venue: 'Mathematische Annalen 64, 248–263',
        year: 1907,
        url: 'https://doi.org/10.1007/BF01449896',
    },
    NORRIS1997: {
        key: 'NORRIS1997',
        authors: 'J. R. Norris',
        title: 'Markov Chains, Ch. 1 — discrete-time chains, class structure, invariant distributions',
        venue: 'Cambridge University Press',
        year: 1997,
        url: 'https://doi.org/10.1017/CBO9780511810633',
    },
    LEVIN2017: {
        key: 'LEVIN2017',
        authors: 'D. A. Levin, Y. Peres',
        title: 'Markov Chains and Mixing Times (2nd ed.), Ch. 1, 4 — convergence and mixing',
        venue: 'American Mathematical Society',
        year: 2017,
        url: 'https://doi.org/10.1090/mbk/107',
    },
};
