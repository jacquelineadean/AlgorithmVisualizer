// Citation database for the perceptron. Rosenblatt's 1958 paper introduces
// the machine; Block and Novikoff prove it converges; Minsky and Papert map
// the boundary of what one unit can represent.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    ROSENBLATT1958: {
        key: 'ROSENBLATT1958',
        authors: 'F. Rosenblatt',
        title: 'The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain',
        venue: 'Psychological Review 65(6), 386–408',
        year: 1958,
        url: 'https://doi.org/10.1037/h0042519',
    },
    BLOCK1962: {
        key: 'BLOCK1962',
        authors: 'H. D. Block',
        title: 'The Perceptron: A Model for Brain Functioning. I (contains the convergence proof)',
        venue: 'Reviews of Modern Physics 34(1), 123–135',
        year: 1962,
        url: 'https://doi.org/10.1103/RevModPhys.34.123',
    },
    NOVIKOFF1962: {
        key: 'NOVIKOFF1962',
        authors: 'A. B. J. Novikoff',
        title: 'On Convergence Proofs for Perceptrons',
        venue: 'Proc. Symposium on the Mathematical Theory of Automata 12, 615–622 (Polytechnic Institute of Brooklyn)',
        year: 1962,
        url: 'https://apps.dtic.mil/sti/citations/AD0298258',
    },
    MINSKY1969: {
        key: 'MINSKY1969',
        authors: 'M. Minsky, S. Papert',
        title: 'Perceptrons: An Introduction to Computational Geometry',
        venue: 'MIT Press (expanded edition, 2017)',
        year: 1969,
        url: 'https://mitpress.mit.edu/9780262534772/perceptrons/',
    },
};
