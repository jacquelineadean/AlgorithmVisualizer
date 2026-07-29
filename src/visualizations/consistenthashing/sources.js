// Citation database for consistent hashing. Karger et al. invented it for
// web caching in 1997; Chord made it the basis of a distributed hash table;
// Dynamo carried it into production storage, virtual nodes and all.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    KARGER1997: {
        key: 'KARGER1997',
        authors: 'D. Karger, E. Lehman, T. Leighton, R. Panigrahy, M. Levine, D. Lewin',
        title: 'Consistent Hashing and Random Trees: Distributed Caching Protocols for Relieving Hot Spots on the World Wide Web',
        venue: 'ACM Symposium on Theory of Computing (STOC) 1997, 654–663',
        year: 1997,
        url: 'https://doi.org/10.1145/258533.258660',
    },
    STOICA2001: {
        key: 'STOICA2001',
        authors: 'I. Stoica, R. Morris, D. Karger, M. F. Kaashoek, H. Balakrishnan',
        title: 'Chord: A Scalable Peer-to-peer Lookup Service for Internet Applications',
        venue: 'ACM SIGCOMM 2001, 149–160',
        year: 2001,
        url: 'https://doi.org/10.1145/383059.383071',
    },
    DECANDIA2007: {
        key: 'DECANDIA2007',
        authors: 'G. DeCandia, D. Hastorun, M. Jampani, et al.',
        title: 'Dynamo: Amazon’s Highly Available Key-value Store',
        venue: 'ACM SOSP 2007, 205–220',
        year: 2007,
        url: 'https://doi.org/10.1145/1294261.1294281',
    },
    LAMPING2014: {
        key: 'LAMPING2014',
        authors: 'J. Lamping, E. Veach',
        title: 'A Fast, Minimal Memory, Consistent Hash Algorithm (jump consistent hash)',
        venue: 'arXiv:1406.2294',
        year: 2014,
        url: 'https://arxiv.org/abs/1406.2294',
    },
};
