import './ProtocolStage.css';

// Two actors, a public channel, an optional eavesdropper, and positioned
// tokens that transition between coordinates. Generalized from the RSA lane
// once Diffie–Hellman became its second consumer. Purely presentational —
// callers derive rows/tokens from reached trace steps so the diagram always
// agrees with the step player.
//
// Geometry (viewBox 760×300): actor panels at x=20 and x=520 (220×232 at
// y=44), channel line y=150 between x=240..520, eavesdropper at (380, 218).
//
// props:
//   left / right: { name, role, rows: [{id, text, tone?: 'secret'|'shared'}],
//                   current?: bool, badge?: { label } }
//   eve?: { sees: string }
//   channelLabel?: string
//   tokens: [{ id, label, x, y, width?, tone: 'public'|'plain'|'cipher' }]

function ActorPanel({ actor, x }) {
    return (
        <g
            className={`lane-panel${actor.current ? ' current' : ''}`}
            transform={`translate(${x} 44)`}
        >
            <rect className="panel-box" width="220" height="232" rx="14" />
            <text className="panel-name" x="18" y="30">
                {actor.name}
            </text>
            <text className="panel-role" x="18" y="46">
                {actor.role}
            </text>
            {actor.rows.map((row, i) => (
                <text
                    key={row.id ?? row.text}
                    className={`panel-row${row.tone ? ` ${row.tone}` : ''}`}
                    x="18"
                    y={70 + i * 17}
                >
                    {row.text}
                </text>
            ))}
            {actor.badge && (
                <g className="token priv-token" transform="translate(18 196)">
                    <rect width={actor.badge.width ?? 124} height="24" rx="12" />
                    <text x={(actor.badge.width ?? 124) / 2} y="16" textAnchor="middle">
                        {actor.badge.label}
                    </text>
                </g>
            )}
        </g>
    );
}

export default function ProtocolStage({
    left,
    right,
    eve,
    channelLabel = 'public channel',
    tokens = [],
    ariaLabel,
}) {
    return (
        <svg className="protocol-stage" viewBox="0 0 760 300" role="img" aria-label={ariaLabel}>
            <line className="channel-line" x1="240" y1="150" x2="520" y2="150" />
            <text className="lane-caption" x="380" y="138" textAnchor="middle">
                {channelLabel}
            </text>

            {eve && (
                <>
                    <g className="eve" transform="translate(380 218)">
                        <ellipse cx="0" cy="0" rx="16" ry="9.5" />
                        <circle cx="0" cy="0" r="4" />
                        <text className="eve-name" x="0" y="24" textAnchor="middle">
                            EVE
                        </text>
                        <text className="eve-sees" x="0" y="40" textAnchor="middle">
                            {eve.sees}
                        </text>
                    </g>
                    <line className="eve-tap" x1="380" y1="150" x2="380" y2="205" />
                </>
            )}

            <ActorPanel actor={left} x={20} />
            <ActorPanel actor={right} x={520} />

            {tokens.map((token) => {
                const width = token.width ?? 150;
                return (
                    <g
                        key={token.id}
                        className={`token ${token.tone}-token`}
                        style={{ transform: `translate(${token.x}px, ${token.y}px)` }}
                    >
                        <rect width={width} height="26" rx="13" />
                        <text x={width / 2} y="17" textAnchor="middle">
                            {token.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
