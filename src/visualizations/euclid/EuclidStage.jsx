import './EuclidStage.css';

// Euclid's own picture: the rectangle a × b, tiled by the largest squares
// that fit, one per subtraction. The last square's side is the gcd — the
// geometry and the arithmetic are the same procedure.

const W = 760;
const H = 300;
const PAD = 24;

export default function EuclidStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'tiling';
    const { a, b, subtraction, division, gcd } = artifacts;

    if (view === 'table') {
        return (
            <div className="euclid-table-wrap">
                <table className="euclid-table">
                    <thead>
                        <tr>
                            <th>a</th>
                            <th>b</th>
                            <th>q</th>
                            <th>r</th>
                        </tr>
                    </thead>
                    <tbody>
                        {division.steps.map((row, i) => (
                            <tr key={i} className={row.remainder === 0n ? 'final' : undefined}>
                                <td>{String(row.a)}</td>
                                <td>{String(row.b)}</td>
                                <td>{String(row.quotient)}</td>
                                <td>{String(row.remainder)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="euclid-note">
                    The last non-zero remainder is the answer: gcd({String(a)}, {String(b)}) ={' '}
                    <strong>{String(gcd)}</strong>.
                </p>
            </div>
        );
    }

    // Replay the subtraction steps up to the stream position, cutting one
    // square per step off the remaining rectangle.
    const upTo = step.stream
        ? Math.min(streamIndex, subtraction.steps.length)
        : subtraction.steps.length;

    const scale = Math.min((W - PAD * 2) / Number(a), (H - PAD * 2) / Number(b));
    const squares = [];
    let x = 0;
    let y = 0;
    let [wide, tall] = [Number(a), Number(b)];

    for (let i = 0; i < upTo; i++) {
        const side = Math.min(wide, tall);
        squares.push({ x, y, side, index: i });
        if (wide > tall) {
            x += side;
            wide -= side;
        } else {
            y += side;
            tall -= side;
        }
    }

    return (
        <svg
            className="euclid-stage"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Rectangle ${a} by ${b}, tiled by ${squares.length} squares; the smallest square's side is the greatest common divisor.`}
        >
            <rect
                className="euclid-frame"
                x={PAD}
                y={PAD}
                width={Number(a) * scale}
                height={Number(b) * scale}
                rx="2"
            />
            {squares.map((square) => (
                <rect
                    key={square.index}
                    className="euclid-square"
                    x={PAD + square.x * scale}
                    y={PAD + square.y * scale}
                    width={square.side * scale}
                    height={square.side * scale}
                    style={{ opacity: 0.16 + 0.5 * (1 - square.index / Math.max(1, upTo)) }}
                />
            ))}
            {/* What is left to be tiled */}
            {upTo < subtraction.steps.length && (
                <rect
                    className="euclid-remainder"
                    x={PAD + x * scale}
                    y={PAD + y * scale}
                    width={wide * scale}
                    height={tall * scale}
                />
            )}
            <text className="euclid-label" x={PAD} y={16}>
                {String(a)} × {String(b)} · {squares.length} of {subtraction.steps.length} squares
                cut
            </text>
            <text className="euclid-label" x={W - PAD} y={16} textAnchor="end">
                remaining {Math.round(wide)} × {Math.round(tall)}
                {upTo >= subtraction.steps.length ? ` · gcd = ${gcd}` : ''}
            </text>
        </svg>
    );
}
