import { describe, expect, it } from 'vitest';
import {
    ROLES,
    appendEntries,
    commitIndexFor,
    committedPrefixesAgree,
    createCluster,
    leadersPerTerm,
    logIsUpToDate,
    majority,
    requestVote,
    simulate,
} from './model';
import { buildRaftTrace } from './trace';

// Raft's value is its safety properties, so the tests assert those directly
// over every frame of the simulation rather than checking a golden script.

describe('voting rules', () => {
    it('grants one vote per term and no more', () => {
        const [candidate, other, voter] = createCluster(3);
        candidate.term = 1;
        other.term = 1;
        expect(requestVote(candidate, voter).granted).toBe(true);
        expect(requestVote(other, voter).granted).toBe(false);
    });

    it('refuses a candidate whose log is behind (§5.4.1)', () => {
        const [candidate, voter] = createCluster(2);
        candidate.term = 2;
        voter.log = [{ term: 1, command: 'a' }];
        expect(logIsUpToDate(candidate, voter)).toBe(false);
        expect(requestVote(candidate, voter).granted).toBe(false);

        candidate.log = [{ term: 1, command: 'a' }];
        expect(logIsUpToDate(candidate, voter)).toBe(true);
    });

    it('prefers a higher last term over a longer log', () => {
        const [longer, newer] = createCluster(2);
        longer.log = [
            { term: 1, command: 'a' },
            { term: 1, command: 'b' },
        ];
        newer.log = [{ term: 2, command: 'c' }];
        expect(logIsUpToDate(newer, longer)).toBe(true);
        expect(logIsUpToDate(longer, newer)).toBe(false);
    });

    it('demotes anyone who sees a higher term', () => {
        const [candidate, voter] = createCluster(2);
        candidate.term = 5;
        voter.role = ROLES.leader;
        voter.term = 2;
        requestVote(candidate, voter);
        expect(voter.role).toBe(ROLES.follower);
        expect(voter.term).toBe(5);
    });
});

describe('log replication rules', () => {
    it('rejects an append whose previous entry does not match (§5.3)', () => {
        const [leader, follower] = createCluster(2);
        leader.term = 2;
        follower.log = [{ term: 1, command: 'a' }];
        const bad = appendEntries(leader, follower, {
            prevIndex: 1,
            prevTerm: 2,
            entries: [{ term: 2, command: 'b' }],
            commitIndex: 0,
        });
        expect(bad.success).toBe(false);
        expect(follower.log).toHaveLength(1);
    });

    it('truncates a conflicting suffix before appending', () => {
        const [leader, follower] = createCluster(2);
        leader.term = 3;
        follower.log = [
            { term: 1, command: 'a' },
            { term: 2, command: 'wrong' },
        ];
        appendEntries(leader, follower, {
            prevIndex: 1,
            prevTerm: 1,
            entries: [{ term: 3, command: 'right' }],
            commitIndex: 2,
        });
        expect(follower.log).toEqual([
            { term: 1, command: 'a' },
            { term: 3, command: 'right' },
        ]);
    });

    it('never commits without a majority, or on an old term’s entry (§5.4.2)', () => {
        const nodes = createCluster(5);
        const leader = nodes[0];
        leader.role = ROLES.leader;
        leader.term = 2;
        leader.log = [{ term: 1, command: 'old' }];
        // Replicated to a majority — but created in an earlier term.
        for (const node of nodes.slice(1, 4)) node.log = [{ term: 1, command: 'old' }];
        expect(commitIndexFor(leader, nodes)).toBe(0);

        leader.log.push({ term: 2, command: 'new' });
        for (const node of nodes.slice(1, 3)) node.log = [...leader.log];
        expect(commitIndexFor(leader, nodes)).toBe(2);

        // Strip the replicas and nothing commits.
        for (const node of nodes.slice(1)) node.log = [];
        expect(commitIndexFor(leader, nodes)).toBe(0);
    });
});

describe('the simulated run', () => {
    const { frames } = simulate({ servers: 5, injectPartition: true });

    it('never lets two servers hold the same term as leader (Election Safety)', () => {
        for (const [, leaders] of leadersPerTerm(frames)) {
            expect(leaders.size).toBe(1);
        }
    });

    it('keeps every committed prefix identical across servers (State Machine Safety)', () => {
        expect(committedPrefixesAgree(frames)).toBe(true);
    });

    it('never commits an entry held by fewer than a majority', () => {
        for (const frame of frames) {
            for (const node of frame.nodes) {
                for (let index = 1; index <= node.commitIndex; index++) {
                    const entry = node.log[index - 1];
                    const holders = frame.nodes.filter(
                        (other) =>
                            other.log.length >= index &&
                            other.log[index - 1].term === entry.term &&
                            other.log[index - 1].command === entry.command
                    ).length;
                    expect(holders).toBeGreaterThanOrEqual(majority(frame.nodes.length));
                }
            }
        }
    });

    it('never lowers a server’s term', () => {
        for (let i = 1; i < frames.length; i++) {
            for (const [j, node] of frames[i].nodes.entries()) {
                expect(node.term).toBeGreaterThanOrEqual(frames[i - 1].nodes[j].term);
            }
        }
    });

    it('leaves the minority side’s entry uncommitted, and discards it on heal', () => {
        const final = frames.at(-1);
        for (const node of final.nodes) {
            expect(node.log.some((entry) => entry.command === 'z←9')).toBe(false);
        }
        expect(final.nodes.every((node) => node.log.some((entry) => entry.command === 'z←5'))).toBe(
            true
        );
    });
});

describe('buildRaftTrace', () => {
    it('groups frames into the four acts and validates the cluster size', () => {
        const { steps, artifacts } = buildRaftTrace({ servers: 5, injectPartition: true });
        expect(new Set(steps.map((step) => step.act)).size).toBe(4);
        expect(artifacts.quorum).toBe(3);
        expect(() => buildRaftTrace({ servers: 4 })).toThrow(/odd majority/);
    });

    it('drops the partition acts when the network stays healthy', () => {
        const { artifacts } = buildRaftTrace({ servers: 3, injectPartition: false });
        expect(artifacts.frames.some((frame) => frame.act === 'partition')).toBe(false);
    });
});

describe('healthy runs stay renderable', () => {
    it('drops the acts that produced no frames, so no step points past the timeline', () => {
        const { steps, acts, artifacts } = buildRaftTrace({ servers: 5, injectPartition: false });
        expect(acts.map((act) => act.id)).toEqual(['election', 'replication']);
        for (const step of steps) {
            expect(step.data.frame).toBeGreaterThanOrEqual(0);
            expect(step.data.frame).toBeLessThan(artifacts.frames.length);
        }
    });
});
