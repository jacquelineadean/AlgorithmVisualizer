// A small but genuine Raft: the rules that matter — term monotonicity, one
// vote per term, the up-to-date-log check on RequestVote, the consistency
// check on AppendEntries, and commitment only by a majority of the *current*
// term — implemented as pure functions and driven by a scripted timeline.
// The visualization replays the recorded frames; the tests assert Raft's
// safety properties hold across every one of them.

export const ROLES = { follower: 'follower', candidate: 'candidate', leader: 'leader' };

const server = (id) => ({
    id,
    role: ROLES.follower,
    term: 0,
    votedFor: null,
    log: [], // [{ term, command }]
    commitIndex: 0, // count of committed entries
    partition: 'A',
});

export const createCluster = (n = 5) =>
    Array.from({ length: n }, (_, i) => server(`S${i + 1}`));

const clone = (nodes) => nodes.map((node) => ({ ...node, log: node.log.map((e) => ({ ...e })) }));
export const majority = (n) => Math.floor(n / 2) + 1;
const reachable = (a, b) => a.partition === b.partition;

export const lastLogTerm = (node) => (node.log.length ? node.log.at(-1).term : 0);
export const lastLogIndex = (node) => node.log.length;

// §5.4.1: a voter refuses a candidate whose log is behind its own.
export function logIsUpToDate(candidate, voter) {
    const cTerm = lastLogTerm(candidate);
    const vTerm = lastLogTerm(voter);
    if (cTerm !== vTerm) return cTerm > vTerm;
    return lastLogIndex(candidate) >= lastLogIndex(voter);
}

// §5.2: one vote per term, and only for an up-to-date candidate.
export function requestVote(candidate, voter) {
    if (candidate.term < voter.term) return { granted: false, reason: 'stale term' };
    if (candidate.term > voter.term) {
        voter.term = candidate.term;
        voter.role = ROLES.follower;
        voter.votedFor = null;
    }
    if (voter.votedFor && voter.votedFor !== candidate.id) {
        return { granted: false, reason: `already voted for ${voter.votedFor}` };
    }
    if (!logIsUpToDate(candidate, voter)) return { granted: false, reason: 'log behind' };
    voter.votedFor = candidate.id;
    return { granted: true };
}

// §5.3: the follower accepts only if its log matches at prevIndex, and
// truncates any conflicting suffix before appending.
export function appendEntries(leader, follower, { prevIndex, prevTerm, entries, commitIndex }) {
    if (leader.term < follower.term) return { success: false, reason: 'stale term' };
    follower.term = leader.term;
    follower.role = ROLES.follower;
    if (prevIndex > follower.log.length) return { success: false, reason: 'log too short' };
    if (prevIndex > 0 && follower.log[prevIndex - 1].term !== prevTerm) {
        return { success: false, reason: 'term mismatch' };
    }
    follower.log = follower.log.slice(0, prevIndex).concat(entries.map((e) => ({ ...e })));
    follower.commitIndex = Math.min(commitIndex, follower.log.length);
    return { success: true };
}

// §5.3/§5.4.2: an entry commits once a majority stores it — and only if it
// was created in the leader's own term.
export function commitIndexFor(leader, nodes) {
    const quorum = majority(nodes.length);
    let committed = leader.commitIndex;
    for (let index = leader.log.length; index > committed; index--) {
        if (leader.log[index - 1].term !== leader.term) continue;
        const replicas = nodes.filter(
            (node) => node.log.length >= index && node.log[index - 1].term === leader.log[index - 1].term
        ).length;
        if (replicas >= quorum) {
            committed = index;
            break;
        }
    }
    return committed;
}

/* --- The scripted timeline -------------------------------------------------
   Frames are snapshots the stage draws. Each carries the cluster state, the
   messages in flight, and a one-line note. Nothing here is animation for its
   own sake: every frame is the result of applying the rules above. */

export function simulate({ servers = 5, injectPartition = true } = {}) {
    const nodes = createCluster(servers);
    const frames = [];
    const record = (note, messages = [], act = 'election') =>
        frames.push({ nodes: clone(nodes), messages, note, act });

    const find = (id) => nodes.find((node) => node.id === id);

    record('All servers start as followers in term 0, with empty logs.');

    /* Act I — leader election */
    const first = find('S1');
    first.term += 1;
    first.role = ROLES.candidate;
    first.votedFor = first.id;
    record(
        `${first.id}'s election timer fires first: term ${first.term}, votes for itself.`,
        nodes.filter((n) => n !== first).map((n) => ({ from: first.id, to: n.id, kind: 'vote-req' }))
    );

    let votes = 1;
    const replies = [];
    for (const voter of nodes) {
        if (voter === first) continue;
        const result = requestVote(first, voter);
        if (result.granted) votes += 1;
        replies.push({ from: voter.id, to: first.id, kind: result.granted ? 'vote-ok' : 'vote-no' });
    }
    record(`${votes} of ${servers} servers vote for ${first.id} — a majority.`, replies);

    first.role = ROLES.leader;
    record(
        `${first.id} becomes leader for term ${first.term} and starts sending heartbeats.`,
        nodes.filter((n) => n !== first).map((n) => ({ from: first.id, to: n.id, kind: 'heartbeat' }))
    );

    /* Act II — log replication */
    const replicate = (leader, note, act) => {
        const messages = [];
        for (const follower of nodes) {
            if (follower === leader || !reachable(leader, follower)) continue;
            const prevIndex = Math.max(0, leader.log.length - 1);
            const result = appendEntries(leader, follower, {
                prevIndex,
                prevTerm: prevIndex > 0 ? leader.log[prevIndex - 1].term : 0,
                entries: leader.log.slice(prevIndex),
                commitIndex: leader.commitIndex,
            });
            messages.push({
                from: leader.id,
                to: follower.id,
                kind: result.success ? 'append-ok' : 'append-no',
            });
        }
        record(note, messages, act);
    };

    for (const command of ['x←1', 'y←7']) {
        const leader = nodes.find((node) => node.role === ROLES.leader);
        leader.log.push({ term: leader.term, command });
        record(`Client sends "${command}". ${leader.id} appends it, uncommitted.`, [], 'replication');
        replicate(leader, `${leader.id} replicates "${command}" to its followers.`, 'replication');
        leader.commitIndex = commitIndexFor(leader, nodes);
        replicate(
            leader,
            `A majority stores "${command}", so it commits at index ${leader.commitIndex}.`,
            'replication'
        );
    }

    if (!injectPartition) return { frames, nodes };

    /* Act III — a partition, and what Raft refuses to do */
    const minority = ['S1', 'S2'];
    for (const node of nodes) node.partition = minority.includes(node.id) ? 'A' : 'B';
    record(
        `The network splits: ${minority.join(', ')} on one side, the other ${
            servers - minority.length
        } on the other. ${first.id} is still leader — but only ${minority.length} servers can hear it.`,
        [],
        'partition'
    );

    const oldLeader = find('S1');
    oldLeader.log.push({ term: oldLeader.term, command: 'z←9' });
    replicate(
        oldLeader,
        `A client reaches ${oldLeader.id} with "z←9". It appends, replicates to the one follower it can reach — and stops. Two of five is not a majority, so the entry never commits.`,
        'partition'
    );

    const challenger = find('S3');
    challenger.term += 1;
    challenger.role = ROLES.candidate;
    challenger.votedFor = challenger.id;
    const majorityVotes = [];
    let count = 1;
    for (const voter of nodes) {
        if (voter === challenger || !reachable(challenger, voter)) continue;
        const result = requestVote(challenger, voter);
        if (result.granted) count += 1;
        majorityVotes.push({
            from: voter.id,
            to: challenger.id,
            kind: result.granted ? 'vote-ok' : 'vote-no',
        });
    }
    record(
        `On the other side nobody hears a heartbeat, so ${challenger.id} starts term ${challenger.term} and collects ${count} votes — a majority of the whole cluster.`,
        majorityVotes,
        'partition'
    );

    challenger.role = ROLES.leader;
    challenger.log.push({ term: challenger.term, command: 'z←5' });
    replicate(
        challenger,
        `${challenger.id} leads term ${challenger.term}, appends "z←5", and commits it with three of five.`,
        'partition'
    );
    challenger.commitIndex = commitIndexFor(challenger, nodes);
    replicate(challenger, `Committed at index ${challenger.commitIndex} in term ${challenger.term}.`, 'partition');

    /* Act IV — healing */
    for (const node of nodes) node.partition = 'A';
    record(
        `The partition heals. ${oldLeader.id} hears term ${challenger.term} and steps down immediately — a higher term always wins.`,
        [{ from: challenger.id, to: oldLeader.id, kind: 'heartbeat' }],
        'heal'
    );
    oldLeader.role = ROLES.follower;
    oldLeader.term = challenger.term;
    replicate(
        challenger,
        `${challenger.id} forces its log onto the stragglers: ${oldLeader.id}'s uncommitted "z←9" is overwritten. Nothing that was ever committed is lost.`,
        'heal'
    );

    return { frames, nodes };
}

// Every committed prefix must be identical on every server that has it —
// Raft's State Machine Safety property, checked over a whole run.
export function committedPrefixesAgree(frames) {
    for (const frame of frames) {
        const committed = frame.nodes.map((node) => node.log.slice(0, node.commitIndex));
        for (let i = 0; i < committed.length; i++) {
            for (let j = i + 1; j < committed.length; j++) {
                const shared = Math.min(committed[i].length, committed[j].length);
                for (let k = 0; k < shared; k++) {
                    if (
                        committed[i][k].term !== committed[j][k].term ||
                        committed[i][k].command !== committed[j][k].command
                    ) {
                        return false;
                    }
                }
            }
        }
    }
    return true;
}

// Election Safety: at most one leader per term, cluster-wide.
export function leadersPerTerm(frames) {
    const seen = new Map();
    for (const frame of frames) {
        for (const node of frame.nodes) {
            if (node.role !== ROLES.leader) continue;
            const key = node.term;
            const set = seen.get(key) ?? new Set();
            set.add(node.id);
            seen.set(key, set);
        }
    }
    return seen;
}
