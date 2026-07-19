import { applySieveEvents } from './model';
import './NumberGridStage.css';

// The sieve board: numbers 2…N in rows of ten, primes greening as they
// survive, composites fading as their smallest prime factor strikes them.

const COLS = 10;
const CELL = 34;

export default function NumberGridStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { N, events } = artifacts;
    const streamLength = step.stream?.events.length ?? 0;
    const upTo = (step.data?.eventBase ?? 0) + Math.min(streamIndex, streamLength);
    const { primes, crossed, cursor } = applySieveEvents(events, upTo);

    const count = N - 1;
    const rows = Math.ceil(count / COLS);
    const width = COLS * CELL;
    const height = rows * CELL;

    const cells = [];
    for (let n = 2; n <= N; n++) {
        const idx = n - 2;
        const x = (idx % COLS) * CELL;
        const y = Math.floor(idx / COLS) * CELL;
        const classes = ['ncell'];
        if (primes.has(n)) classes.push('prime');
        if (crossed.has(n)) classes.push('crossed');
        if (n === cursor) classes.push('cursor');
        cells.push(
            <g key={n} transform={`translate(${x} ${y})`}>
                <rect className={classes.join(' ')} width={CELL - 4} height={CELL - 4} rx="6" />
                <text
                    className={`nnum${crossed.has(n) ? ' dim' : ''}${primes.has(n) ? ' lit' : ''}`}
                    x={(CELL - 4) / 2}
                    y={(CELL - 4) / 2 + 4}
                    textAnchor="middle"
                >
                    {n}
                </text>
            </g>
        );
    }

    return (
        <svg
            className="number-grid"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Sieve board 2 to ${N}; ${primes.size} primes found so far.`}
        >
            {cells}
        </svg>
    );
}
