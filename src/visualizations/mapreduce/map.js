// Builds the MapReduce job map: the dataflow, then the three things the
// paper is actually about — fault tolerance, locality, and stragglers.

import {
    bytesLabel,
    getJob,
    human,
    mapTasks,
    shuffleBytes,
    tailProbability,
    tasksPerWorker,
} from './model';

export function buildMapReduceMap({ jobId }) {
    const job = getJob(jobId);
    const M = mapTasks(job);
    const shuffle = shuffleBytes(job);

    const root = {
        id: 'job',
        title: `MapReduce job — ${job.label}`,
        summary:
            'Two functions the user writes, and a runtime that handles the other thousand ' +
            'machines.',
        detail:
            `${job.note} The input splits into ${human(M)} map tasks of ` +
            `${bytesLabel(job.splitBytes)}, run across ${job.workers.toLocaleString()} workers ` +
            `(${tasksPerWorker(job).toFixed(1)} tasks each) and reduced by ` +
            `${job.reducers.toLocaleString()}. The programmer writes map and reduce; ` +
            'partitioning, scheduling, failure recovery, and the shuffle are the framework’s ' +
            'problem. That division is the paper’s entire contribution — not a new algorithm, ' +
            'but a boundary.',
        provenance: 'paper',
        sourceRefs: [{ key: 'DEAN2004', detail: '§2–3' }],
        layout: 'flow',
        metrics: [
            { label: 'map tasks', value: human(M) },
            { label: 'reduce tasks', value: job.reducers.toLocaleString() },
            { label: 'workers', value: job.workers.toLocaleString() },
            { label: 'shuffled', value: bytesLabel(shuffle) },
        ],
        children: [
            {
                id: 'input',
                title: 'Input splits',
                summary: `The input is chopped into ${bytesLabel(job.splitBytes)} pieces, one per map task.`,
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§3.1' }, { key: 'GHEMAWAT2003' }],
                detail:
                    `${human(M)} splits for ${job.workers.toLocaleString()} workers — far more ` +
                    'tasks than machines, deliberately. Fine-grained tasks let the master ' +
                    'balance load dynamically and make a failure cheap to redo. The split size ' +
                    'matches the GFS chunk size, which is what makes the next node possible.',
                metrics: [
                    { label: 'split', value: bytesLabel(job.splitBytes) },
                    { label: 'tasks / worker', value: tasksPerWorker(job).toFixed(1) },
                ],
            },
            {
                id: 'map',
                title: 'Map',
                summary: 'Each task applies the user’s map function and emits key/value pairs.',
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§2.1' }],
                detail:
                    'Output is buffered in memory, periodically spilled to the worker’s local ' +
                    `disk, and partitioned into ${job.reducers.toLocaleString()} regions by ` +
                    'hash(key) mod R. Note where it lands: local disk, not the distributed ' +
                    'file system. Intermediate data is not worth replicating, because it can ' +
                    'always be recomputed.',
                metrics: [{ label: 'partitioning', value: `hash(key) mod ${job.reducers}` }],
            },
            {
                id: 'combine',
                title: 'Combiner',
                summary:
                    'An optional local reduce, run on the mapper, before anything crosses the network.',
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§4.3' }],
                detail:
                    'For a commutative, associative reduce — counting, summing, maxing — the ' +
                    'mapper can pre-aggregate its own output. Word count emits one pair per ' +
                    `word occurrence and ships one per distinct word: ` +
                    `${bytesLabel(shuffle)} instead of the full ${bytesLabel(job.inputBytes)}. ` +
                    'The shuffle is usually the bottleneck, so this is the single highest-value ' +
                    'optimization in the system.',
                metrics: [
                    { label: 'input', value: bytesLabel(job.inputBytes) },
                    { label: 'after combine', value: bytesLabel(shuffle) },
                ],
            },
            {
                id: 'shuffle',
                title: 'Shuffle and sort',
                summary:
                    'Reducers pull their partition from every mapper, then sort so equal keys are adjacent.',
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§3.1' }],
                detail:
                    `An all-to-all transfer: ${human(M)} mappers × ` +
                    `${job.reducers.toLocaleString()} reducers connections, moving ` +
                    `${bytesLabel(shuffle)}. Nothing in the reduce phase can start until its ` +
                    'inputs arrive, which makes the shuffle the phase that decides the job’s ' +
                    'wall clock.',
                metrics: [
                    { label: 'transfers', value: human(M * job.reducers) },
                    { label: 'bytes', value: bytesLabel(shuffle) },
                ],
            },
            {
                id: 'reduce',
                title: 'Reduce',
                summary:
                    'Each reducer walks its sorted keys and calls the user’s reduce on each group.',
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§2.1' }],
                detail:
                    `Output goes to the distributed file system, one file per reduce task — ` +
                    `${job.reducers.toLocaleString()} of them. Writes are atomic renames of ` +
                    'temporary files, so a task that runs twice (because it was slow, or ' +
                    'because its worker died) leaves exactly one result behind.',
                metrics: [{ label: 'output files', value: job.reducers.toLocaleString() }],
            },
            {
                id: 'faults',
                title: 'Faults are routine, not exceptional',
                summary:
                    'The master pings workers; anything that stops answering has its tasks re-run.',
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§3.3' }, { key: 'GHEMAWAT2003', detail: '§5' }],
                detail:
                    'Completed map output lives on a local disk, so a dead worker loses ' +
                    'finished work as well as in-flight work — and the master simply schedules ' +
                    'those tasks again. Because map and reduce are deterministic functions of ' +
                    'their input, re-execution is indistinguishable from having run once. That ' +
                    'is why the model insists on pure functions: it is the assumption fault ' +
                    'tolerance is built on.',
                metrics: [
                    { label: 'detection', value: 'master heartbeat' },
                    { label: 'recovery', value: 're-run the tasks' },
                    { label: 'cost', value: `${tasksPerWorker(job).toFixed(1)} tasks` },
                ],
            },
            {
                id: 'locality',
                title: 'Move the computation, not the data',
                summary:
                    'The master schedules map tasks on machines that already hold a replica of the split.',
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§3.4' }, { key: 'GHEMAWAT2003', detail: '§2.6' }],
                detail:
                    'GFS stores three replicas of every chunk. The scheduler places a map task ' +
                    'on a machine holding one of them, or failing that on the same rack — so ' +
                    'most of the input is read from local disk and never touches the network ' +
                    'at all. In a cluster whose bisection bandwidth is scarce, that placement ' +
                    'decision is worth more than any code optimization.',
                metrics: [{ label: 'replicas', value: 3 }],
            },
            {
                id: 'stragglers',
                title: 'Stragglers and backup tasks',
                summary:
                    'Near the end of a job, the master starts duplicate copies of the tasks still running.',
                provenance: 'paper',
                sourceRefs: [{ key: 'DEAN2004', detail: '§3.6' }, { key: 'DEAN2013' }],
                detail:
                    'One machine with a failing disk can hold up a job of thousands of tasks. ' +
                    `If a task is slow with probability 1%, a job of ${human(M)} tasks is ` +
                    `almost certainly slow: ${(tailProbability(0.01, M) * 100).toFixed(1)}%. ` +
                    'Backup tasks cost a few percent of extra compute and cut the paper’s sort ' +
                    'benchmark by 44%. Dean and Barroso later generalized the lesson: at scale, ' +
                    'the tail is the latency.',
                metrics: [
                    { label: 'P(slow job)', value: `${(tailProbability(0.01, M) * 100).toFixed(1)}%` },
                    { label: 'sort without backups', value: '+44% time' },
                ],
                caveat: {
                    provenance: 'modern',
                    text: 'MapReduce writes to disk between every stage, which is fatal for iterative work — a machine-learning loop pays a full round trip per pass. Spark’s resilient distributed datasets keep intermediates in memory and rebuild lost partitions from lineage, which is why the model outlived the implementation.',
                    sourceRefs: [{ key: 'ZAHARIA2012' }],
                },
            },
        ],
    };

    return { root, job };
}
