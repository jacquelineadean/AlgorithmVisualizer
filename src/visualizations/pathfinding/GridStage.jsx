import { useRef } from 'react';
import {
    applyGridEvents,
    COLS,
    FINISH_KEY,
    keyOf,
    ROWS,
    START_KEY,
} from './model';
import './GridStage.css';

// The maze grid: folds search/path events up to the stream position and
// lets the user paint walls directly on the stage (click or drag; the
// visualizer rebuilds the trace on every change).

const CELL = 15;
const W = COLS * CELL;
const H = ROWS * CELL;

export default function GridStage({ steps, stepIndex, artifacts, streamIndex, onWallsChange }) {
    const step = steps[stepIndex];
    const streamLength = step.stream?.events.length ?? 0;
    const upTo = (step.data?.eventBase ?? 0) + Math.min(streamIndex, streamLength);
    const { visited, path, head } = applyGridEvents(artifacts.events, upTo);
    const walls = artifacts.walls;

    // Drag-painting: the first cell decides whether we add or erase.
    const paintMode = useRef(null);

    const applyPaint = (k) => {
        if (k === START_KEY || k === FINISH_KEY || paintMode.current === null) return;
        const has = walls.has(k);
        if (paintMode.current === 'add' && !has) {
            const next = new Set(walls);
            next.add(k);
            onWallsChange(next);
        } else if (paintMode.current === 'erase' && has) {
            const next = new Set(walls);
            next.delete(k);
            onWallsChange(next);
        }
    };

    const handleDown = (k) => (event) => {
        event.preventDefault();
        if (k === START_KEY || k === FINISH_KEY) return;
        paintMode.current = walls.has(k) ? 'erase' : 'add';
        applyPaint(k);
    };

    const handleEnter = (k) => (event) => {
        if (event.buttons !== 1) return;
        applyPaint(k);
    };

    const cells = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const k = keyOf(r, c);
            const classes = ['gcell'];
            if (walls.has(k)) classes.push('wall');
            else if (path.has(k)) classes.push('path');
            else if (visited.has(k)) classes.push('visited');
            if (k === head) classes.push('head');
            if (k === START_KEY) classes.push('start');
            if (k === FINISH_KEY) classes.push('finish');
            cells.push(
                <rect
                    key={k}
                    className={classes.join(' ')}
                    x={c * CELL}
                    y={r * CELL}
                    width={CELL}
                    height={CELL}
                    onPointerDown={handleDown(k)}
                    onPointerEnter={handleEnter(k)}
                />
            );
        }
    }

    return (
        <div>
            <svg
                className="grid-stage"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`${ROWS} by ${COLS} grid; ${walls.size} walls; ${visited.size} squares settled so far.`}
                onPointerUp={() => {
                    paintMode.current = null;
                }}
                onPointerLeave={() => {
                    paintMode.current = null;
                }}
            >
                {cells}
            </svg>
            <div className="grid-caption">
                <span className="gkey">
                    <span className="gswatch start" /> start
                </span>
                <span className="gkey">
                    <span className="gswatch finish" /> finish
                </span>
                <span className="gkey">
                    <span className="gswatch wall" /> wall — draw with the mouse
                </span>
                <span className="gkey">
                    <span className="gswatch visited" /> settled
                </span>
                <span className="gkey">
                    <span className="gswatch path" /> shortest path
                </span>
            </div>
        </div>
    );
}
