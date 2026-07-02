import { memo } from 'react';
import { nodeElementId } from '../../engine/grid';

import './Node.css';

export function nodeClassName({ isStart, isFinish, isWall }) {
    if (isStart) return 'node node-start';
    if (isFinish) return 'node node-finish';
    if (isWall) return 'node node-wall';
    return 'node';
}

// Pointer handling is delegated to the grid container (see Visualizer), so a
// cell only renders its identity and state.
function Node({ row, col, isStart, isFinish, isWall }) {
    return (
        <div
            id={nodeElementId(row, col)}
            data-row={row}
            data-col={col}
            className={nodeClassName({ isStart, isFinish, isWall })}
        />
    );
}

export default memo(Node);
