import './ProtocolLane.css';

// Alice / public-channel / Bob lane. Purely presentational: every position
// and label is derived from which trace steps have been reached, so the
// diagram always agrees with the step player.

const fmt = (v) => String(v);

const truncate = (text, max = 26) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;

export default function ProtocolLane({ steps, stepIndex, artifacts }) {
    const reached = new Set(steps.slice(0, stepIndex + 1).map((step) => step.id));
    const has = (id) => reached.has(id);
    const currentAct = steps[stepIndex].act;

    const { p, q, n, phi, e, d, blocks, encrypted, recovered } = artifacts;

    const mList = truncate(blocks.map(({ code }) => fmt(code)).join(' '));
    const cList = truncate(encrypted.map(({ c }) => fmt(c)).join(' '));

    // Alice's working state, one row per keygen milestone.
    const aliceRows = [
        { on: 'choose-primes', text: `p = ${p}   q = ${q}`, secret: true },
        { on: 'compute-n', text: `n = ${n}` },
        { on: 'compute-phi', text: `φ(n) = ${phi}`, secret: true },
        { on: 'choose-e', text: `e = ${e}` },
        { on: 'compute-d', text: `d = ${d}`, secret: true },
        { on: 'decrypt', text: `m′ = ${mList}` },
        { on: 'decode-message', text: `→ “${truncate(recovered, 18)}”` },
    ].filter((row) => has(row.on));

    const bobRows = [
        { on: 'encode-message', text: `m = ${mList}` },
        { on: 'encrypt', text: `c = ${cList}` },
    ].filter((row) => has(row.on));

    // Public key token: appears with e, then travels to the public channel.
    const pubVisible = has('choose-e');
    const pubPublished = has('publish-keys');
    const pubPos = pubPublished ? { x: 295, y: 92 } : { x: 55, y: 92 };

    // Message token: Bob-side plaintext → ciphertext → crosses → plaintext.
    const sent = has('send-ciphertext');
    const decrypted = has('decrypt');
    const decoded = has('decode-message');
    const firstM = blocks[0] ? fmt(blocks[0].code) : '';
    const firstC = encrypted[0] ? fmt(encrypted[0].c) : '';
    // The token sits inside Bob's panel while he works, then lands on the
    // channel mouth beside Alice (her panel rows occupy the interior).
    const atAlice = { x: 248, y: 164 };
    let msg = null;
    if (has('encode-message')) {
        if (decoded) msg = { ...atAlice, cls: 'plain', text: `“${truncate(recovered, 12)}”` };
        else if (decrypted) msg = { ...atAlice, cls: 'plain', text: `m = ${firstM} …` };
        else if (sent) msg = { ...atAlice, cls: 'cipher', text: `c = ${firstC} …` };
        else if (has('encrypt')) msg = { x: 565, y: 196, cls: 'cipher', text: `c = ${firstC} …` };
        else msg = { x: 565, y: 196, cls: 'plain', text: `m = ${firstM} …` };
    }

    const eveSees = sent
        ? `sees (e, n) and c — needs p, q`
        : pubPublished
          ? 'sees (e, n)'
          : 'listening…';

    const actorClass = (actor) =>
        `lane-panel${
            (actor === 'alice' && currentAct !== 'encrypt') ||
            (actor === 'bob' && currentAct === 'encrypt')
                ? ' current'
                : ''
        }`;

    return (
        <svg
            className="protocol-lane"
            viewBox="0 0 760 300"
            role="img"
            aria-label="Protocol diagram: Alice generates keys, Bob encrypts over a public channel watched by Eve, Alice decrypts."
        >
            {/* Channel */}
            <line className="channel-line" x1="240" y1="150" x2="520" y2="150" />
            <text className="lane-caption" x="380" y="138" textAnchor="middle">
                public channel
            </text>

            {/* Eve */}
            <g className="eve" transform="translate(380 218)">
                <ellipse cx="0" cy="0" rx="16" ry="9.5" />
                <circle cx="0" cy="0" r="4" />
                <text className="eve-name" x="0" y="24" textAnchor="middle">
                    EVE
                </text>
                <text className="eve-sees" x="0" y="40" textAnchor="middle">
                    {eveSees}
                </text>
            </g>
            <line className="eve-tap" x1="380" y1="150" x2="380" y2="205" />

            {/* Alice */}
            <g className={actorClass('alice')} transform="translate(20 44)">
                <rect className="panel-box" width="220" height="232" rx="14" />
                <text className="panel-name" x="18" y="30">
                    ALICE
                </text>
                <text className="panel-role" x="18" y="46">
                    generates keys · decrypts
                </text>
                {aliceRows.map((row, i) => (
                    <text
                        key={row.on}
                        className={`panel-row${row.secret ? ' secret' : ''}`}
                        x="18"
                        y={70 + i * 17}
                    >
                        {row.secret ? '· ' : ''}
                        {row.text}
                    </text>
                ))}
            </g>

            {/* Bob */}
            <g className={actorClass('bob')} transform="translate(520 44)">
                <rect className="panel-box" width="220" height="232" rx="14" />
                <text className="panel-name" x="18" y="30">
                    BOB
                </text>
                <text className="panel-role" x="18" y="46">
                    encrypts with (e, n)
                </text>
                {bobRows.map((row, i) => (
                    <text key={row.on} className="panel-row" x="18" y={70 + i * 17}>
                        {row.text}
                    </text>
                ))}
            </g>

            {/* Public key token */}
            {pubVisible && (
                <g
                    className="token pub-token"
                    style={{ transform: `translate(${pubPos.x}px, ${pubPos.y}px)` }}
                >
                    <rect width="170" height="26" rx="13" />
                    <text x="85" y="17" textAnchor="middle">
                        public key = ({fmt(e)}, {fmt(n)})
                    </text>
                </g>
            )}

            {/* Private key badge — never moves. */}
            {has('compute-d') && (
                <g className="token priv-token" transform="translate(38 240)">
                    <rect width="124" height="24" rx="12" />
                    <text x="62" y="16" textAnchor="middle">
                        🔒 private d = {fmt(d)}
                    </text>
                </g>
            )}

            {/* Message / ciphertext token */}
            {msg && (
                <g
                    className={`token msg-token ${msg.cls}`}
                    style={{ transform: `translate(${msg.x}px, ${msg.y}px)` }}
                >
                    <rect width="128" height="26" rx="13" />
                    <text x="64" y="17" textAnchor="middle">
                        {msg.text}
                    </text>
                </g>
            )}
        </svg>
    );
}
