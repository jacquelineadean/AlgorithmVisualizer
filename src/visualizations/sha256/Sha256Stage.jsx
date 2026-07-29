import { bits, hex, sha256 } from './model';
import './Sha256Stage.css';

// The eight working variables as a 8 × 32 bit grid — the picture of
// diffusion. The schedule view shows the 64 expanded words, and the
// avalanche view puts two digests side by side with the differing bits lit.

const LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function BitGrid({ words, labels, diff }) {
    return (
        <div className="sha-grid">
            {words.map((word, row) => (
                <div className="sha-row" key={row}>
                    <span className="sha-name">{labels[row]}</span>
                    <span className="sha-bits">
                        {bits(word)
                            .split('')
                            .map((bit, i) => (
                                <span
                                    key={i}
                                    className={`sha-bit${bit === '1' ? ' on' : ''}${
                                        diff && diff[row][i] ? ' diff' : ''
                                    }`}
                                />
                            ))}
                    </span>
                    <span className="sha-hex">{hex(word)}</span>
                </div>
            ))}
        </div>
    );
}

export default function Sha256Stage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'state';
    const { first, run, message, neighbour, flip } = artifacts;

    if (view === 'schedule') {
        return (
            <div className="sha-schedule">
                {first.schedule.map((word, t) => (
                    <span className={`sha-word${t < 16 ? ' original' : ''}`} key={t}>
                        <span className="sha-word-index">W{t}</span>
                        {hex(word)}
                    </span>
                ))}
                <p className="sha-note">
                    The first sixteen (tinted) are the message block itself; the other
                    forty-eight are built from them.
                </p>
            </div>
        );
    }

    if (view === 'avalanche' && flip) {
        const other = sha256(neighbour).state;
        const diff = run.state.map((word, row) =>
            bits(word)
                .split('')
                .map((bit, i) => bit !== bits(other[row])[i])
        );
        return (
            <div>
                <BitGrid words={run.state} labels={LABELS.map((_, i) => `H${i}`)} diff={diff} />
                <p className="sha-note">
                    “{message}” above, “{neighbour}” below — one input bit apart.{' '}
                    <strong>{flip.changed} of 256</strong> output bits differ (lit in red).
                </p>
                <BitGrid words={other} labels={LABELS.map((_, i) => `H${i}`)} diff={diff} />
            </div>
        );
    }

    const round = step.stream
        ? Math.min((step.data?.round ?? 0) + Math.min(streamIndex, 63), 63)
        : Math.min(step.data?.round ?? -1, 63);
    const words = round < 0 ? first.before : first.rounds[round].state;

    return (
        <div>
            <BitGrid words={words} labels={LABELS} />
            <p className="sha-note">
                {round < 0
                    ? 'Before any round: the initial hash value.'
                    : `After round ${round + 1} of 64 · K${round} = ${hex(
                          first.rounds[round].k
                      )} · W${round} = ${hex(first.rounds[round].w)}`}
            </p>
        </div>
    );
}
