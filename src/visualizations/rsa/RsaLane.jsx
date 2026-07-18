import ProtocolStage from '../protocol/ProtocolStage';

// RSA's protocol diagram: derives rows, tokens, and Eve's knowledge from
// which trace steps have been reached, then delegates rendering to the
// shared ProtocolStage. Geometry is identical to the Phase 1 lane.

const fmt = (v) => String(v);

const truncate = (text, max = 26) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;

export default function RsaLane({ steps, stepIndex, artifacts }) {
    const reached = new Set(steps.slice(0, stepIndex + 1).map((step) => step.id));
    const has = (id) => reached.has(id);
    const currentAct = steps[stepIndex].act;

    const { p, q, n, phi, e, d, blocks, encrypted, recovered } = artifacts;

    const mList = truncate(blocks.map(({ code }) => fmt(code)).join(' '));
    const cList = truncate(encrypted.map(({ c }) => fmt(c)).join(' '));

    const aliceRows = [
        { id: 'choose-primes', text: `· p = ${p}   q = ${q}`, tone: 'secret' },
        { id: 'compute-n', text: `n = ${n}` },
        { id: 'compute-phi', text: `· φ(n) = ${phi}`, tone: 'secret' },
        { id: 'choose-e', text: `e = ${e}` },
        { id: 'compute-d', text: `· d = ${d}`, tone: 'secret' },
        { id: 'decrypt', text: `m′ = ${mList}` },
        { id: 'decode-message', text: `→ “${truncate(recovered, 18)}”` },
    ].filter((row) => has(row.id));

    const bobRows = [
        { id: 'encode-message', text: `m = ${mList}` },
        { id: 'encrypt', text: `c = ${cList}` },
    ].filter((row) => has(row.id));

    // Public key token: appears with e, then travels to the public channel.
    const pubPublished = has('publish-keys');
    const tokens = [];
    if (has('choose-e')) {
        tokens.push({
            id: 'pub',
            tone: 'public',
            label: `public key = (${fmt(e)}, ${fmt(n)})`,
            width: 170,
            x: pubPublished ? 295 : 55,
            y: 92,
        });
    }

    // Message token: Bob-side plaintext → ciphertext → channel mouth beside
    // Alice (her panel rows occupy the interior) → plaintext.
    const sent = has('send-ciphertext');
    const decrypted = has('decrypt');
    const decoded = has('decode-message');
    const firstM = blocks[0] ? fmt(blocks[0].code) : '';
    const firstC = encrypted[0] ? fmt(encrypted[0].c) : '';
    const atAlice = { x: 248, y: 164 };
    if (has('encode-message')) {
        let msg;
        if (decoded) msg = { ...atAlice, tone: 'plain', label: `“${truncate(recovered, 12)}”` };
        else if (decrypted) msg = { ...atAlice, tone: 'plain', label: `m = ${firstM} …` };
        else if (sent) msg = { ...atAlice, tone: 'cipher', label: `c = ${firstC} …` };
        else if (has('encrypt'))
            msg = { x: 565, y: 196, tone: 'cipher', label: `c = ${firstC} …` };
        else msg = { x: 565, y: 196, tone: 'plain', label: `m = ${firstM} …` };
        tokens.push({ id: 'msg', width: 128, ...msg });
    }

    const eveSees = sent
        ? `sees (e, n) and c — needs p, q`
        : pubPublished
          ? 'sees (e, n)'
          : 'listening…';

    return (
        <ProtocolStage
            ariaLabel="Protocol diagram: Alice generates keys, Bob encrypts over a public channel watched by Eve, Alice decrypts."
            left={{
                name: 'ALICE',
                role: 'generates keys · decrypts',
                rows: aliceRows,
                current: currentAct !== 'encrypt',
                badge: has('compute-d') ? { label: `🔒 private d = ${fmt(d)}` } : undefined,
            }}
            right={{
                name: 'BOB',
                role: 'encrypts with (e, n)',
                rows: bobRows,
                current: currentAct === 'encrypt',
            }}
            eve={{ sees: eveSees }}
            tokens={tokens}
        />
    );
}
