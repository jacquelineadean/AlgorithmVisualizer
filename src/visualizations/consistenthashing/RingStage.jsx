import PlotStage from '../stages/PlotStage';
import './RingStage.css';

// The hash ring itself: server tokens on the circumference, keys as dots
// just inside it, and each key tinted by the server that owns it. The load
// view swaps in a bar chart of keys per server. Both read the assignment the
// trace already computed.

const W = 760;
const H = 340;
const CX = W / 2;
const CY = H / 2;
const R = 132;
const TONES = ['cobalt', 'vermilion', 'green', 'gold', 'ink'];
const CSS = ['ch-cobalt', 'ch-vermilion', 'ch-green', 'ch-gold', 'ch-ink'];

const xy = (at, radius) => {
    const angle = 2 * Math.PI * at - Math.PI / 2;
    return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
};

export default function RingStage({ steps, stepIndex, artifacts }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'ring';
    const added = step.data?.added ?? false;
    const showKeys = step.data?.showKeys ?? false;
    const { keyList, before, after, state, grown } = artifacts;

    const servers = added ? after : before;
    const current = added ? grown : state;
    const toneOf = (server) => servers.indexOf(server) % TONES.length;

    if (view === 'load') {
        const counts = servers.map((server) => current.load.get(server) ?? 0);
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        return (
            <PlotStage
                domain={[-0.5, servers.length - 0.5]}
                range={[0, Math.max(...counts) * 1.2]}
                xTicks={Math.max(1, servers.length - 1)}
                marks={[
                    {
                        type: 'bars',
                        bars: counts.map((count, i) => ({
                            x0: i - 0.35,
                            x1: i + 0.35,
                            y: count,
                            tone: TONES[i % TONES.length],
                        })),
                        opacity: 0.75,
                    },
                    {
                        type: 'segment',
                        x1: -0.5,
                        y1: mean,
                        x2: servers.length - 0.5,
                        y2: mean,
                        tone: 'ink',
                        dashed: true,
                    },
                    ...servers.map((server, i) => ({
                        type: 'label',
                        x: i,
                        y: 0,
                        dy: 14,
                        text: server,
                        tone: 'faint',
                        anchor: 'middle',
                    })),
                ]}
                yLabel="keys held"
                notes={[`mean ${mean.toFixed(1)}`, `${keyList.length} keys`]}
                ariaLabel={`Keys per server: ${servers
                    .map((server, i) => `${server} ${counts[i]}`)
                    .join(', ')}.`}
            />
        );
    }

    const showModulo = view === 'modulo';

    return (
        <svg
            className="ring-stage"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Hash ring with ${servers.length} servers and ${keyList.length} keys.`}
        >
            <circle className="ring-circle" cx={CX} cy={CY} r={R} />
            <text className="ring-caption" x={CX} y={CY - 6} textAnchor="middle">
                {showModulo ? 'hash(key) mod N' : 'the hash ring'}
            </text>
            <text className="ring-sub" x={CX} y={CY + 14} textAnchor="middle">
                {showModulo
                    ? `${servers.length} buckets — position depends on N`
                    : `0 … 2³² wrapped into a circle`}
            </text>

            {showKeys &&
                keyList.map((key) => {
                    const owner = current.owners.get(key.name);
                    const { x, y } = xy(key.at, R - 16);
                    return (
                        <circle
                            key={key.name}
                            className={`ring-key ${CSS[toneOf(owner)]}`}
                            cx={x}
                            cy={y}
                            r="2.6"
                        />
                    );
                })}

            {current.points.map((point) => {
                const { x, y } = xy(point.at, R);
                const label = xy(point.at, R + 22);
                const isNew = added && !before.includes(point.server);
                return (
                    <g key={point.label} className={`ring-token ${CSS[toneOf(point.server)]}`}>
                        <line x1={xy(point.at, R - 10).x} y1={xy(point.at, R - 10).y} x2={x} y2={y} />
                        <circle cx={x} cy={y} r={isNew ? 7 : 5} className={isNew ? 'fresh' : ''} />
                        {current.points.length <= 24 && (
                            <text x={label.x} y={label.y + 4} textAnchor="middle">
                                {point.server.replace('node-', 'n')}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
