// Citation database for CAP. Brewer's 2000 conjecture, Gilbert & Lynch's
// 2002 proof, Brewer's own 2012 correction of how the result gets misread,
// and Abadi's PACELC extension.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    BREWER2000: {
        key: 'BREWER2000',
        authors: 'E. A. Brewer',
        title: 'Towards Robust Distributed Systems (the CAP conjecture)',
        venue: 'ACM PODC 2000 keynote',
        year: 2000,
        url: 'https://doi.org/10.1145/343477.343502',
    },
    GILBERT2002: {
        key: 'GILBERT2002',
        authors: 'S. Gilbert, N. Lynch',
        title: 'Brewer’s Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services',
        venue: 'ACM SIGACT News 33(2), 51–59',
        year: 2002,
        url: 'https://doi.org/10.1145/564585.564601',
    },
    BREWER2012: {
        key: 'BREWER2012',
        authors: 'E. A. Brewer',
        title: 'CAP Twelve Years Later: How the “Rules” Have Changed',
        venue: 'IEEE Computer 45(2), 23–29',
        year: 2012,
        url: 'https://doi.org/10.1109/MC.2012.37',
    },
    ABADI2012: {
        key: 'ABADI2012',
        authors: 'D. J. Abadi',
        title: 'Consistency Tradeoffs in Modern Distributed Database System Design (PACELC)',
        venue: 'IEEE Computer 45(2), 37–42',
        year: 2012,
        url: 'https://doi.org/10.1109/MC.2012.33',
    },
    DECANDIA2007: {
        key: 'DECANDIA2007',
        authors: 'G. DeCandia, D. Hastorun, M. Jampani, et al.',
        title: 'Dynamo: Amazon’s Highly Available Key-value Store (quorums with R + W > N)',
        venue: 'ACM SOSP 2007, 205–220',
        year: 2007,
        url: 'https://doi.org/10.1145/1294261.1294281',
    },
};
