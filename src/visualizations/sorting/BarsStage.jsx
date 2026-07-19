import { useMemo } from 'react';
import { applyEvents } from './model';
import './BarsStage.css';

// Bar-array stage shared by the sorting visualizations. Derives its state
// by folding the recorded events up to the stream position, so the picture
// is always exactly "what the algorithm has done so far".
//
// Sorting steps carry data.eventBase — how many events are already applied
// when the step is entered; the step's own stream advances from there.

const W = 760;
const H = 300;
const TOP = 26;
const BOTTOM = 272;
const SIDE = 20;

export default function BarsStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { input, events } = artifacts;
    const streamLength = step.stream?.events.length ?? 0;
    const upTo = (step.data?.eventBase ?? 0) + Math.min(streamIndex, streamLength);

    const state = useMemo(() => applyEvents(input, events, upTo), [input, events, upTo]);
    const { values, settled, comparisons, swaps, writes, range, pivotValue, passWidth, last } =
        state;

    const n = values.length;
    const slot = (W - SIDE * 2) / n;
    const barWidth = Math.max(2, slot - Math.min(6, slot * 0.25));
    const x = (i) => SIDE + i * slot + (slot - barWidth) / 2;
    const y = (v) => BOTTOM - ((BOTTOM - TOP) * v) / 100;

    const highlight = new Set();
    let swapPair = null;
    let writeTarget = null;
    if (last?.t === 'cmp') {
        highlight.add(last.i);
        if (last.j != null) highlight.add(last.j);
    }
    if (last?.t === 'swap') swapPair = new Set([last.i, last.j]);
    if (last?.t === 'write') writeTarget = last.i;

    const counters = [
        `comparisons ${comparisons}`,
        swaps > 0 || writes === 0 ? `swaps ${swaps}` : null,
        writes > 0 ? `writes ${writes}` : null,
    ].filter(Boolean);

    return (
        <svg
            className="bars-stage"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Array of ${n} bars; ${comparisons} comparisons so far.`}
        >
            {/* Active range band */}
            {range && (
                <rect
                    className="range-band"
                    x={x(range[0]) - (slot - barWidth) / 2}
                    y={TOP - 10}
                    width={slot * (range[1] - range[0] + 1)}
                    height={BOTTOM - TOP + 14}
                    rx="6"
                />
            )}

            {/* Bars */}
            {values.map((value, i) => {
                const classes = ['bar'];
                if (settled.has(i)) classes.push('settled');
                if (range && i >= range[0] && i <= range[1]) classes.push('active');
                if (highlight.has(i)) classes.push('compared');
                if (swapPair?.has(i)) classes.push('swapped');
                if (writeTarget === i) classes.push('written');
                return (
                    <rect
                        key={i}
                        className={classes.join(' ')}
                        x={x(i)}
                        y={y(value)}
                        width={barWidth}
                        height={BOTTOM - y(value)}
                        rx="2"
                    />
                );
            })}

            {/* Pivot reference line across the active range */}
            {pivotValue != null && range && (
                <>
                    <line
                        className="pivot-line"
                        x1={x(range[0])}
                        x2={x(range[1]) + barWidth}
                        y1={y(pivotValue)}
                        y2={y(pivotValue)}
                    />
                    <text className="pivot-label" x={x(range[1]) + barWidth + 6} y={y(pivotValue) + 3}>
                        pivot {pivotValue}
                    </text>
                </>
            )}

            {/* Counters + pass marker */}
            <text className="bars-counter" x={SIDE} y={16}>
                {counters.join('   ·   ')}
            </text>
            {passWidth && (
                <text className="bars-pass" x={W - SIDE} y={16} textAnchor="end">
                    run width {passWidth}
                </text>
            )}
        </svg>
    );
}
