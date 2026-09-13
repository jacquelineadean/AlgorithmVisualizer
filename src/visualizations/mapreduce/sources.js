// Citation database for MapReduce. Dean & Ghemawat's paper sits on top of
// GFS; Dean & Barroso later named the tail-latency problem that backup tasks
// were already answering; Zaharia et al. explain what MapReduce could not do.

export { PROVENANCE } from '../provenance';

export const SOURCES = {
    DEAN2004: {
        key: 'DEAN2004',
        authors: 'J. Dean, S. Ghemawat',
        title: 'MapReduce: Simplified Data Processing on Large Clusters',
        venue: 'USENIX OSDI 2004, 137–150',
        year: 2004,
        url: 'https://www.usenix.org/legacy/events/osdi04/tech/dean.html',
    },
    GHEMAWAT2003: {
        key: 'GHEMAWAT2003',
        authors: 'S. Ghemawat, H. Gobioff, S.-T. Leung',
        title: 'The Google File System',
        venue: 'ACM SOSP 2003, 29–43',
        year: 2003,
        url: 'https://doi.org/10.1145/945445.945450',
    },
    DEAN2013: {
        key: 'DEAN2013',
        authors: 'J. Dean, L. A. Barroso',
        title: 'The Tail at Scale',
        venue: 'Communications of the ACM 56(2), 74–80',
        year: 2013,
        url: 'https://doi.org/10.1145/2408776.2408794',
    },
    ZAHARIA2012: {
        key: 'ZAHARIA2012',
        authors: 'M. Zaharia, M. Chowdhury, T. Das, et al.',
        title: 'Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing',
        venue: 'USENIX NSDI 2012, 15–28',
        year: 2012,
        url: 'https://www.usenix.org/conference/nsdi12/technical-sessions/presentation/zaharia',
    },
};
