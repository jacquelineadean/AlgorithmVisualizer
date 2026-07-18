import ProtocolStage from '../protocol/ProtocolStage';

// Diffie–Hellman on the shared protocol stage: parameters sit on the public
// channel from the start, A and B cross it, and the shared secret appears on
// both sides — while Eve's list of known values grows and stops mattering.

const fmt = (v) => String(v);

export default function DhLane({ steps, stepIndex, artifacts }) {
    const reached = new Set(steps.slice(0, stepIndex + 1).map((step) => step.id));
    const has = (id) => reached.has(id);
    const currentAct = steps[stepIndex].act;

    const { p, g, a, b, A, B, s } = artifacts;
    const exchanged = has('exchange-publics');

    const aliceRows = [
        { id: 'alice-public', text: `A = g^a = ${A}` },
        { id: 'exchange-publics', text: `received B = ${B}` },
        { id: 'alice-shared', text: `s = B^a = ${s} ✓`, tone: 'shared' },
    ].filter((row) => has(row.id));

    const bobRows = [
        { id: 'bob-public', text: `B = g^b = ${B}` },
        { id: 'exchange-publics', text: `received A = ${A}` },
        { id: 'bob-shared', text: `s = A^b = ${s} ✓`, tone: 'shared' },
    ].filter((row) => has(row.id));

    const tokens = [];
    if (has('agree-parameters')) {
        tokens.push({
            id: 'params',
            tone: 'public',
            label: `public p = ${fmt(p)}, g = ${fmt(g)}`,
            width: 170,
            x: 295,
            y: 92,
        });
    }
    if (has('alice-public')) {
        tokens.push({
            id: 'A',
            tone: 'public',
            label: `A = ${fmt(A)} →`,
            width: 120,
            x: exchanged ? 396 : 252,
            y: 118,
        });
    }
    if (has('bob-public')) {
        tokens.push({
            id: 'B',
            tone: 'public',
            label: `← B = ${fmt(B)}`,
            width: 120,
            x: exchanged ? 252 : 396,
            y: 158,
        });
    }

    const eveSees = has('why-eve-fails')
        ? `sees p, g, A, B — needs a or b`
        : exchanged
          ? `sees p, g, A = ${A}, B = ${B}`
          : has('agree-parameters')
            ? `sees p = ${p}, g = ${g}`
            : 'listening…';

    return (
        <ProtocolStage
            ariaLabel="Protocol diagram: Alice and Bob exchange public values over a channel Eve reads, and both derive the same shared secret."
            left={{
                name: 'ALICE',
                role: 'keeps a secret exponent',
                rows: aliceRows,
                current: currentAct !== 'setup' && steps[stepIndex].id.startsWith('alice'),
                badge: has('alice-secret')
                    ? { label: `🔒 secret a = ${fmt(a)}`, width: 124 }
                    : undefined,
            }}
            right={{
                name: 'BOB',
                role: 'keeps b secret too',
                rows: bobRows,
                current: currentAct !== 'setup' && steps[stepIndex].id.startsWith('bob'),
                badge: has('bob-secret')
                    ? { label: `🔒 secret b = ${fmt(b)}`, width: 124 }
                    : undefined,
            }}
            eve={{ sees: eveSees }}
            tokens={tokens}
        />
    );
}
