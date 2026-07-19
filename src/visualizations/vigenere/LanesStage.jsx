import { applyLaneEvents } from './model';
import './LanesStage.css';

// Three letter lanes — message, keyword, ciphertext — filled in as the
// stream advances, with the current column highlighted.

const CELL = 26;

export default function LanesStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { message, events } = artifacts;
    const streamLength = step.stream?.events.length ?? 0;
    const upTo = (step.data?.eventBase ?? 0) + Math.min(streamIndex, streamLength);
    const { keyRow, cipherRow, cursor } = applyLaneEvents(message, events, upTo);

    const n = message.length;
    const width = Math.max(n * CELL + 90, 400);

    const lane = (label, chars, y, cls) => (
        <g>
            <text className="lane-label" x="0" y={y + 15}>
                {label}
            </text>
            {Array.from({ length: n }, (_, i) => (
                <g key={i} transform={`translate(${80 + i * CELL} ${y})`}>
                    <rect
                        className={`lane-cell${i === cursor ? ' cursor' : ''}`}
                        width={CELL - 3}
                        height="22"
                        rx="4"
                    />
                    <text className={`lane-char ${cls}`} x={(CELL - 3) / 2} y="16" textAnchor="middle">
                        {chars[i] ?? ''}
                    </text>
                </g>
            ))}
        </g>
    );

    return (
        <svg
            className="lanes-stage"
            viewBox={`0 0 ${width} 120`}
            role="img"
            aria-label={`Vigenère lanes for a ${n}-character message.`}
        >
            {lane('message', message.split(''), 8, 'plain')}
            {lane('keyword', keyRow, 48, 'keych')}
            {lane('cipher', cipherRow, 88, 'cipher')}
        </svg>
    );
}
