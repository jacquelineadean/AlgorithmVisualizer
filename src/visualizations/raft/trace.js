// Builds the Raft trace. The simulation produces frames; the trace groups
// them into four cited acts and streams the frames within each one, so the
// step list stays a readable handful while the cluster animates.

import { majority, simulate } from './model';

export const ACTS = [
    { id: 'election', name: 'Act I — Electing a leader', actor: 'The cluster' },
    { id: 'replication', name: 'Act II — Replicating the log', actor: 'Leader → followers' },
    { id: 'partition', name: 'Act III — Under partition', actor: 'Two sides' },
    { id: 'heal', name: 'Act IV — Healing', actor: 'One log wins' },
];

export function buildRaftTrace({ servers = 5, injectPartition = true } = {}) {
    if (![3, 5, 7].includes(servers)) {
        throw new Error('Use a cluster of 3, 5, or 7 servers — consensus needs an odd majority.');
    }

    const { frames } = simulate({ servers, injectPartition });
    const quorum = majority(servers);
    // Frame index at which each act begins, so a step can stream its own slice.
    const startOf = (act) => frames.findIndex((frame) => frame.act === act);
    const endOf = (act) => frames.map((frame) => frame.act).lastIndexOf(act) + 1;

    const streamFor = (act) => ({
        events: frames
            .slice(startOf(act), endOf(act))
            .map((_, i) => ({ t: 'frame', i: startOf(act) + i })),
        tick: 900,
    });

    const steps = [
        {
            id: 'followers',
            act: 'election',
            title: 'Everyone starts a follower',
            provenance: 'paper',
            sourceRefs: [{ key: 'ONGARO2014', detail: '§5.1' }],
            explanation:
                `${servers} servers, every one a follower in term 0 with an empty log. Terms ` +
                'are Raft’s logical clock: they increase monotonically, and any message ' +
                'carrying a higher term instantly demotes whoever receives it. Ongaro and ' +
                'Ousterhout designed the whole protocol around one unusual goal — being ' +
                'understandable — after years of Paxos proving that a correct algorithm ' +
                'nobody can implement is a limited kind of correct.',
            kind: 'values',
            data: {
                frame: 0,
                values: [
                    { label: 'servers', value: servers },
                    { label: 'majority', value: quorum },
                    { label: 'term', value: 0 },
                ],
            },
        },
        {
            id: 'election',
            act: 'election',
            title: 'A timeout becomes a candidacy',
            provenance: 'paper',
            sourceRefs: [{ key: 'ONGARO2014', detail: '§5.2' }],
            explanation:
                'Election timeouts are randomized, so one server almost always fires first. It ' +
                'increments its term, votes for itself, and asks the rest. Each server grants ' +
                `at most one vote per term and refuses any candidate whose log is behind its ` +
                `own — so with ${quorum} votes a leader is guaranteed to hold every committed ` +
                'entry. Randomization is what keeps split votes rare, and a split vote is ' +
                'merely slow, never unsafe.',
            kind: 'values',
            data: {
                frame: 0,
                eventBase: 0,
                values: [
                    { label: 'votes needed', value: quorum },
                    { label: 'votes per server', value: '1 per term' },
                ],
            },
            stream: streamFor('election'),
        },
        {
            id: 'replicate',
            act: 'replication',
            title: 'The leader appends, the followers copy',
            provenance: 'paper',
            sourceRefs: [{ key: 'ONGARO2014', detail: '§5.3' }],
            explanation:
                'Clients talk only to the leader. It appends the command to its own log and ' +
                'sends AppendEntries to everyone, each carrying the index and term of the ' +
                'entry *before* the new one. A follower accepts only if that prefix matches — ' +
                'the Log Matching property, which makes two logs agreeing at one index imply ' +
                'they agree everywhere before it.',
            kind: 'values',
            data: {
                frame: startOf('replication'),
                eventBase: 0,
                values: [
                    { label: 'consistency check', value: 'prevIndex + prevTerm' },
                    { label: 'on mismatch', value: 'reject, leader backs up' },
                ],
            },
            stream: streamFor('replication'),
        },
        {
            id: 'commit',
            act: 'replication',
            title: `Committed means stored on ${quorum} of ${servers}`,
            provenance: 'theorem',
            sourceRefs: [
                { key: 'ONGARO2014', detail: '§5.3–5.4' },
                { key: 'ONGARO2014THESIS', detail: 'Ch. 3' },
            ],
            explanation:
                'An entry commits once a majority stores it — and only if it was created in ' +
                'the current leader’s term. That second clause looks fussy and is the subtle ' +
                'heart of the protocol: an entry from an older term can be present on a ' +
                'majority and still be overwritten later, so counting replicas alone is not ' +
                'safe. Once committed, an entry is permanent, because any future leader must ' +
                'have won a majority that included at least one server holding it.',
            kind: 'formula',
            data: {
                frame: endOf('replication') - 1,
                lines: [
                    `commit index advances when ⌈(${servers}+1)/2⌉ = ${quorum} logs hold the entry`,
                    'and only for entries created in the leader’s own term',
                ],
            },
        },
        {
            id: 'partition',
            act: 'partition',
            title: 'A partition, and a refusal',
            provenance: 'paper',
            sourceRefs: [{ key: 'ONGARO2014', detail: '§5.4.1' }, { key: 'FLP1985' }],
            explanation:
                'Split the network and the old leader keeps believing it leads — but it can ' +
                'only reach a minority, so its new entry never commits. Meanwhile the larger ' +
                'side elects a leader in a higher term and carries on. Two leaders exist at ' +
                'once; only one can commit, which is exactly the guarantee that matters. ' +
                'Progress waits for a majority, as it must: Fischer, Lynch and Paterson proved ' +
                'in 1985 that no asynchronous protocol can guarantee both safety and ' +
                'termination when even one process may fail.',
            kind: 'values',
            data: {
                frame: startOf('partition'),
                eventBase: 0,
                values: [
                    { label: 'minority side', value: `${servers - quorum} servers — no commits` },
                    { label: 'majority side', value: `${quorum} servers — makes progress` },
                ],
            },
            stream: streamFor('partition'),
        },
        {
            id: 'heal',
            act: 'heal',
            title: 'One log wins',
            provenance: 'paper',
            sourceRefs: [
                { key: 'ONGARO2014', detail: '§5.4.2' },
                { key: 'ONGARO2014THESIS', detail: 'Ch. 3' },
            ],
            explanation:
                'When the partition heals, the stale leader sees a higher term and steps down ' +
                'mid-sentence. The current leader then walks its followers backward until ' +
                'their logs match, and overwrites the divergent suffix. The uncommitted entry ' +
                'from the minority side is discarded — which is correct, because it was never ' +
                'acknowledged to the client. Nothing that was ever committed is lost.',
            caveat: {
                provenance: 'pedagogical',
                text: 'This page runs a scripted timeline with instant, lossless messages and a single clean partition. Real deployments contend with message reordering, disk fsync latency, clock skew, membership changes, and snapshotting — all of which Raft specifies and none of which is drawn here.',
                sourceRefs: [{ key: 'ONGARO2014', detail: '§6–7' }, { key: 'ONGARO2014THESIS' }],
            },
            kind: 'values',
            data: {
                frame: frames.length - 1,
                eventBase: 0,
                values: [
                    { label: 'stale leader', value: 'steps down on higher term' },
                    { label: 'divergent entries', value: 'overwritten, never committed' },
                    { label: 'committed entries', value: 'preserved' },
                ],
            },
            stream: streamFor('heal'),
        },
    ];

    // A healthy run never produces partition or heal frames, so those steps
    // would have nothing to draw — drop them (and their act headings) rather
    // than render a step that points past the end of the timeline.
    const present = new Set(frames.map((frame) => frame.act));
    const liveSteps = steps.filter((step) => present.has(step.act));

    return {
        steps: liveSteps,
        acts: ACTS.filter((act) => present.has(act.id)),
        artifacts: { frames, servers, quorum },
    };
}
