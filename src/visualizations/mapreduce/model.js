// Pure model behind the MapReduce map: how a job's shape falls out of its
// input size and split size, and what the shuffle costs. The 2004 paper's
// own numbers (64 MB splits, M ≫ workers, R a small multiple of workers) are
// the defaults.

export const JOBS = [
    {
        id: 'grep',
        label: 'Distributed grep — 1 TB',
        inputBytes: 1e12,
        splitBytes: 64 * 1024 ** 2,
        workers: 1800,
        reducers: 1,
        selectivity: 0.00001,
        note: 'The paper’s own benchmark: a rare pattern over a terabyte, almost nothing to shuffle.',
    },
    {
        id: 'sort',
        label: 'Terasort — 1 TB',
        inputBytes: 1e12,
        splitBytes: 64 * 1024 ** 2,
        workers: 1800,
        reducers: 4000,
        selectivity: 1,
        note: 'Every byte crosses the network: sorting is the shuffle-heaviest job there is.',
    },
    {
        id: 'wordcount',
        label: 'Word count — 200 GB',
        inputBytes: 2e11,
        splitBytes: 64 * 1024 ** 2,
        workers: 400,
        reducers: 200,
        selectivity: 0.06,
        note: 'A combiner collapses most of the intermediate data before it ever leaves the mapper.',
    },
];

export const getJob = (id) => JOBS.find((job) => job.id === id) ?? JOBS[0];

export const mapTasks = (job) => Math.ceil(job.inputBytes / job.splitBytes);

// Intermediate data crossing the network: the fraction of input the map
// phase emits, after any combiner.
export const shuffleBytes = (job) => job.inputBytes * job.selectivity;

// Tasks per worker — the paper's reason for M ≫ workers: fine-grained tasks
// give the master something to hand a machine that finishes early, and a
// failed worker costs only its own tasks.
export const tasksPerWorker = (job) => mapTasks(job) / job.workers;

// One worker dying costs its in-flight and completed map output (reducers
// have not necessarily read it yet), which the master simply re-runs.
export const reexecutionCost = (job) => mapTasks(job) / job.workers / mapTasks(job);

// Dean & Barroso's tail argument: if each task independently misses its
// deadline with probability p, a job of n tasks is slow with probability
// 1 − (1 − p)ⁿ. Backup tasks are the standard mitigation.
export const tailProbability = (p, tasks) => 1 - (1 - p) ** tasks;

export const human = (value) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)} T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)} G`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
    return value.toFixed(0);
};

export const bytesLabel = (value) => {
    if (value >= 1024 ** 4) return `${(value / 1024 ** 4).toFixed(2)} TiB`;
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`;
    if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
    return `${(value / 1024).toFixed(1)} KiB`;
};
