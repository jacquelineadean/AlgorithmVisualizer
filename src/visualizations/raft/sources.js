// Citation database for Raft. Ongaro and Ousterhout's paper is unusual in
// stating comprehensibility as a design goal; Lamport's Paxos is the
// algorithm it was written to replace, and Ongaro's thesis carries the
// formal proofs the conference paper only sketches.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    ONGARO2014: {
        key: 'ONGARO2014',
        authors: 'D. Ongaro, J. Ousterhout',
        title: 'In Search of an Understandable Consensus Algorithm (Extended Version)',
        venue: 'USENIX Annual Technical Conference 2014, 305–319',
        year: 2014,
        url: 'https://raft.github.io/raft.pdf',
    },
    ONGARO2014THESIS: {
        key: 'ONGARO2014THESIS',
        authors: 'D. Ongaro',
        title: 'Consensus: Bridging Theory and Practice (the safety proofs and TLA+ specification)',
        venue: 'PhD dissertation, Stanford University',
        year: 2014,
        url: 'https://github.com/ongardie/dissertation',
    },
    LAMPORT1998: {
        key: 'LAMPORT1998',
        authors: 'L. Lamport',
        title: 'The Part-Time Parliament (Paxos)',
        venue: 'ACM Transactions on Computer Systems 16(2), 133–169',
        year: 1998,
        url: 'https://doi.org/10.1145/279227.279229',
    },
    FLP1985: {
        key: 'FLP1985',
        authors: 'M. J. Fischer, N. A. Lynch, M. S. Paterson',
        title: 'Impossibility of Distributed Consensus with One Faulty Process',
        venue: 'Journal of the ACM 32(2), 374–382',
        year: 1985,
        url: 'https://doi.org/10.1145/3149.214121',
    },
};
