import { memo } from 'react';
import { nodeElementId } from '../../engine/grid';

import './Node.css';

export function nodeClassName({ isStart, isFinish, isWall }) {
    if (isStart) return 'node node-start';
    if (isFinish) return 'node node-finish';
    if (isWall) return 'node node-wall';
    return 'node';
}

function Node({ row, col, isStart, isFinish, isWall, onMouseDown, onMouseEnter }) {
    return (
        <div
            id={nodeElementId(row, col)}
            className={nodeClassName({ isStart, isFinish, isWall })}
            onMouseDown={(event) => {
                event.preventDefault();
                onMouseDown(row, col);
            }}
            onMouseEnter={() => onMouseEnter(row, col)}
        />
    );
}

export default memo(Node);
