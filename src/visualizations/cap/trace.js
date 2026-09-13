// Builds the CAP trace: one write, one read, and a network that may or may
// not be split. The choice the user makes in the controls decides what the
// partitioned steps do — the theorem is the thing that has no third option.

import { getChoice, outcomes, quorumOverlaps, scenario } from './model';

export function buildCapTrace({ choiceId = 'cp', n = 3, r = 2, w = 2 }) {
    if (!Number.isInteger(n) || n < 1 || n > 9) {
        throw new Error('Use between 1 and 9 replicas.');
    }
    if (r < 1 || r > n || w < 1 || w > n) {
        throw new Error(`Read and write quorums must be between 1 and ${n}.`);
    }

    const choice = getChoice(choiceId);
    const healthy = scenario({ choiceId, partitioned: false });
    const split = scenario({ choiceId, partitioned: true });
    const strong = quorumOverlaps(n, r, w);

    const steps = [
        {
            id: 'setup',
            title: 'Two replicas, one client, one value',
            provenance: 'paper',
            sourceRefs: [{ key: 'GILBERT2002', detail: '§2' }],
            explanation:
                'The theorem is about a specific, small situation, so this is that situation: ' +
                'two replicas holding v0, a client that writes v1 to one of them, and a ' +
                'second client that reads from the other. Consistency here means linearizable ' +
                '— the read must return v1, because the write completed before it started.',
            kind: 'values',
            data: {
                phase: 'setup',
                partitioned: false,
                values: [
                    { label: 'replicas', value: 'A, B' },
                    { label: 'value', value: 'v0' },
                ],
            },
        },
        {
            id: 'healthy',
            title: 'No partition: nothing to give up',
            provenance: 'paper',
            sourceRefs: [{ key: 'BREWER2012' }],
            explanation:
                'When the network works, the write replicates and the read sees v1. Both ' +
                'consistency and availability hold, and CAP has said nothing at all. This is ' +
                'the part most summaries lose: the trade-off exists only during a partition, ' +
                'which is why Brewer wrote a correction twelve years later objecting to ' +
                '“pick two” as a design slogan.',
            kind: 'values',
            data: {
                phase: 'healthy',
                partitioned: false,
                values: [
                    { label: 'write', value: 'accepted' },
                    { label: 'read', value: healthy.readValue },
                    { label: 'linearizable', value: 'yes' },
                ],
            },
        },
        {
            id: 'partition',
            title: 'The network splits',
            provenance: 'paper',
            sourceRefs: [{ key: 'GILBERT2002', detail: '§3' }, { key: 'BREWER2000' }],
            explanation:
                'Messages between A and B are lost. Partition tolerance is not a choice a ' +
                'designer makes — it is a property of networks, which do partition. What ' +
                'remains is a decision about what to do while it lasts, and the theorem says ' +
                'there are exactly two options.',
            kind: 'values',
            data: {
                phase: 'partition',
                partitioned: true,
                values: [
                    { label: 'A ↔ B', value: 'unreachable' },
                    { label: 'clients', value: 'still connected to both' },
                ],
            },
        },
        {
            id: 'choice',
            title: choice.label,
            provenance: 'theorem',
            sourceRefs: [{ key: 'GILBERT2002', detail: '§3, Theorem 1' }],
            explanation:
                choiceId === 'cp'
                    ? 'Refuse to answer. The write cannot reach a quorum, so it is rejected; ' +
                      'the read cannot confirm it holds the current value, so it errors. The ' +
                      'system stays correct and stops being useful — which is the right trade ' +
                      'for a ledger, and the wrong one for a shopping cart.'
                    : 'Answer anyway. A takes the write, B serves its own v0, and both clients ' +
                      'get a response. The system stays useful and returns an answer that was ' +
                      'already wrong when it was sent — which is the right trade for a ' +
                      'shopping cart, and the wrong one for a ledger.',
            kind: 'values',
            data: {
                phase: 'choice',
                partitioned: true,
                values: [
                    { label: 'write', value: split.writeAccepted ? 'accepted' : 'rejected' },
                    { label: 'read', value: split.readAnswered ? split.readValue : 'error' },
                    { label: 'linearizable', value: split.linearizable ? 'yes' : 'no' },
                    { label: 'available', value: split.available ? 'yes' : 'no' },
                ],
            },
        },
        {
            id: 'theorem',
            title: 'Why there is no third option',
            provenance: 'theorem',
            sourceRefs: [{ key: 'GILBERT2002', detail: '§3' }],
            explanation:
                'Gilbert and Lynch’s proof is a two-line argument. Suppose a system were ' +
                'linearizable and available during a partition. The write to A completes ' +
                '(availability), and the later read on B must return the written value ' +
                '(linearizability) — but no message can cross the partition, so B has no way ' +
                'to know the value. Contradiction. The table below is every case; two of the ' +
                'four cells are impossible to improve.',
            kind: 'table',
            data: {
                phase: 'table',
                partitioned: true,
                rows: outcomes().map((outcome) => ({
                    network: outcome.partitioned ? 'partitioned' : 'healthy',
                    policy: outcome.choiceId.toUpperCase(),
                    consistent: outcome.linearizable ? 'yes' : 'no',
                    availableLabel: outcome.available ? 'yes' : 'no',
                })),
            },
        },
        {
            id: 'quorums',
            title: 'What practitioners actually tune',
            provenance: 'modern',
            sourceRefs: [{ key: 'DECANDIA2007', detail: '§4.5' }, { key: 'BREWER2012' }],
            explanation:
                `Real systems expose the dial as quorum sizes. With N = ${n} replicas, reads ` +
                `touching R = ${r} and writes touching W = ${w}, a read overlaps a write ` +
                `exactly when R + W > N — here ${r} + ${w} = ${r + w} ${
                    strong ? '>' : '≤'
                } ${n}, so reads ${strong ? 'do' : 'do not'} see the latest write. Lowering ` +
                'either quorum buys availability during a partition and gives up exactly that ' +
                'guarantee. Dynamo shipped R, W, and N as per-request parameters rather than a ' +
                'system-wide creed.',
            caveat: {
                provenance: 'modern',
                text: 'CAP only speaks about partitions. Abadi’s PACELC completes the sentence: if partitioned, trade availability against consistency — else, trade latency against consistency. Most of the time there is no partition, and the latency half is the trade a system actually makes all day.',
                sourceRefs: [{ key: 'ABADI2012' }],
            },
            kind: 'formula',
            data: {
                phase: 'quorum',
                partitioned: false,
                lines: [
                    { tex: 'R + W > N \\;\\Longleftrightarrow\\; \\text{every read quorum meets every write quorum}' },
                    `N = ${n},  R = ${r},  W = ${w}  ⇒  ${strong ? 'reads see the latest write' : 'reads may be stale'}`,
                ],
            },
        },
    ];

    return { steps, artifacts: { choice, healthy, split, n, r, w, strong } };
}
