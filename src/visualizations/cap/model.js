// Pure model for the CAP explorer. Gilbert & Lynch's theorem is a statement
// about one specific scenario, so this models exactly that scenario: two
// replicas, a write on one side, a read on the other, and a partition
// between them. The outcome table is derived, not asserted.

export const CHOICES = [
    {
        id: 'cp',
        label: 'Keep consistency (CP)',
        note: 'The minority side refuses to answer rather than risk a stale reply.',
    },
    {
        id: 'ap',
        label: 'Keep availability (AP)',
        note: 'Both sides answer from local state and reconcile later.',
    },
];

export const getChoice = (id) => CHOICES.find((choice) => choice.id === id) ?? CHOICES[0];

// A replica holds a value and a version; a write bumps the version.
export const replica = (id, value = 'v0', version = 0) => ({ id, value, version });

// What happens when a client writes to replica A and reads from replica B,
// with or without a partition between them, under the chosen policy.
export function scenario({ choiceId, partitioned }) {
    const a = replica('A');
    const b = replica('B');
    const write = { value: 'v1', version: 1 };

    if (!partitioned) {
        Object.assign(a, write);
        Object.assign(b, write);
        return {
            a,
            b,
            writeAccepted: true,
            readAnswered: true,
            readValue: b.value,
            linearizable: true,
            available: true,
            note: 'No partition: the write replicates, the read sees it. Both properties hold.',
        };
    }

    if (choiceId === 'cp') {
        // The write side cannot reach a quorum, so it refuses the write; the
        // read side likewise refuses rather than serve a value it cannot
        // confirm is current. Nothing stale is ever returned.
        return {
            a,
            b,
            writeAccepted: false,
            readAnswered: false,
            readValue: null,
            linearizable: true,
            available: false,
            note: 'Partitioned, consistency chosen: the write is rejected and the read errors out. Correct, and down.',
        };
    }

    // AP: both sides act locally. A takes the write; B answers from its own
    // stale copy. The system stayed up and returned a value that was already
    // wrong when it was sent.
    Object.assign(a, write);
    return {
        a,
        b,
        writeAccepted: true,
        readAnswered: true,
        readValue: b.value,
        linearizable: false,
        available: true,
        note: 'Partitioned, availability chosen: the write lands on A, the read gets B’s stale v0. Up, and wrong.',
    };
}

// The theorem in table form: of consistency, availability, and partition
// tolerance, a partitioned system can hold at most two.
export function outcomes() {
    return [
        { partitioned: false, choiceId: 'cp', ...scenario({ choiceId: 'cp', partitioned: false }) },
        { partitioned: false, choiceId: 'ap', ...scenario({ choiceId: 'ap', partitioned: false }) },
        { partitioned: true, choiceId: 'cp', ...scenario({ choiceId: 'cp', partitioned: true }) },
        { partitioned: true, choiceId: 'ap', ...scenario({ choiceId: 'ap', partitioned: true }) },
    ];
}

// Quorum arithmetic: reads and writes overlap — and therefore see each
// other — exactly when R + W > N.
export const quorumOverlaps = (n, r, w) => r + w > n;

export const quorumAvailable = (n, r, w, reachable) => reachable >= Math.max(r, w);
