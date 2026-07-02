import { useEffect, useRef, useState } from 'react';
import Node, { nodeClassName } from '../Node/Node';
import { createGrid, toggleWall, clearWalls, nodeElementId } from '../../engine/grid';
import { runAlgorithm } from '../../engine/run';
import { createAnimator } from '../../engine/animator';
import { getAlgorithm, listAlgorithms } from '../../algorithms';
import { useGridLayout, CELL_SIZE_PX } from './useGridLayout';

import './Visualizer.css';

const READY_STATUS = 'ready — draw walls on the grid, then run';

// Resolves the grid cell under a pointer event. Uses elementFromPoint rather
// than the event target because on touch devices all pointermove events keep
// targeting the cell where the drag started.
const cellFromPointer = (event) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cell = element?.closest('[data-row]');
    if (!cell) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
};

export default function Visualizer() {
    const gridAreaRef = useRef(null);
    const layout = useGridLayout(gridAreaRef);
    const [grid, setGrid] = useState(() => createGrid(layout));
    const [algorithmId, setAlgorithmId] = useState(() => listAlgorithms()[0].id);
    const [isAnimating, setIsAnimating] = useState(false);
    const [status, setStatus] = useState(READY_STATUS);
    const isAnimatingRef = useRef(false);
    const drawingRef = useRef(false);
    const lastToggledRef = useRef(null);
    const animatorRef = useRef(null);
    if (animatorRef.current === null) animatorRef.current = createAnimator();

    const setAnimating = (value) => {
        isAnimatingRef.current = value;
        setIsAnimating(value);
    };

    // Rebuild the grid when the layout changes (first measure, rotation,
    // window resize), carrying over walls that are still in bounds. The grid
    // subtree is keyed by the dimensions, so all cells remount with clean
    // classes and no stale animation survives.
    useEffect(() => {
        animatorRef.current.cancel();
        isAnimatingRef.current = false;
        setIsAnimating(false);
        setStatus(READY_STATUS);
        setGrid((previous) => {
            const next = createGrid(layout);
            for (const row of previous) {
                for (const node of row) {
                    if (!node.isWall || node.row >= layout.rows || node.col >= layout.cols) continue;
                    const target = next[node.row][node.col];
                    if (!target.isStart && !target.isFinish) target.isWall = true;
                }
            }
            return next;
        });
    }, [layout]);

    // End wall-drawing even when the pointer is released outside the grid.
    useEffect(() => {
        const stopDrawing = () => {
            drawingRef.current = false;
            lastToggledRef.current = null;
        };
        window.addEventListener('pointerup', stopDrawing);
        window.addEventListener('pointercancel', stopDrawing);
        return () => {
            window.removeEventListener('pointerup', stopDrawing);
            window.removeEventListener('pointercancel', stopDrawing);
        };
    }, []);

    useEffect(() => {
        const animator = animatorRef.current;
        return () => animator.cancel();
    }, []);

    const toggleCell = (cell) => {
        const key = `${cell.row}-${cell.col}`;
        if (lastToggledRef.current === key) return;
        lastToggledRef.current = key;
        setGrid((currentGrid) => toggleWall(currentGrid, cell.row, cell.col));
    };

    const handlePointerDown = (event) => {
        if (isAnimatingRef.current) return;
        event.preventDefault();
        // Release the implicit capture touch input takes on pointerdown, so
        // elementFromPoint tracking in pointermove sees the cells dragged over.
        if (event.target.hasPointerCapture?.(event.pointerId)) {
            event.target.releasePointerCapture(event.pointerId);
        }
        const cell = cellFromPointer(event);
        if (!cell) return;
        drawingRef.current = true;
        toggleCell(cell);
    };

    const handlePointerMove = (event) => {
        if (!drawingRef.current || isAnimatingRef.current) return;
        const cell = cellFromPointer(event);
        if (cell) toggleCell(cell);
    };

    // Stops any running animation and restores every cell's class to what the
    // grid model says it should be.
    const clearAnimation = (currentGrid) => {
        animatorRef.current.cancel();
        setAnimating(false);
        for (const row of currentGrid) {
            for (const node of row) {
                const element = document.getElementById(nodeElementId(node.row, node.col));
                if (element) element.className = nodeClassName(node);
            }
        }
    };

    const handleVisualize = () => {
        if (isAnimatingRef.current) return;
        clearAnimation(grid);
        setAnimating(true);
        const algorithm = getAlgorithm(algorithmId);
        setStatus(`running ${algorithm.name} …`);
        const result = runAlgorithm(algorithm, grid, layout.start, layout.finish);
        animatorRef.current.play(result, {
            onVisit: (node) => setNodeAnimationClass(node, 'node-visited'),
            onPathStep: (node) => setNodeAnimationClass(node, 'node-shortest-path'),
            onFinish: () => {
                setAnimating(false);
                setStatus(
                    result.pathNodesInOrder.length > 0
                        ? `done — visited ${result.visitedNodesInOrder.length} nodes, path length ${result.pathNodesInOrder.length}`
                        : `done — visited ${result.visitedNodesInOrder.length} nodes, no path to target`
                );
            },
        });
    };

    const handleClearPath = () => {
        clearAnimation(grid);
        setStatus(READY_STATUS);
    };

    const handleClearBoard = () => {
        clearAnimation(grid);
        setGrid((currentGrid) => clearWalls(currentGrid));
        setStatus(READY_STATUS);
    };

    const algorithms = listAlgorithms();
    const selectedAlgorithm = getAlgorithm(algorithmId);

    return (
        <div className="visualizer">
            <div className="controls">
                <label className="control-field">
                    <span className="control-label">--algorithm</span>
                    <select
                        value={algorithmId}
                        onChange={(event) => setAlgorithmId(event.target.value)}
                        disabled={isAnimating}
                    >
                        {algorithms.map((algorithm) => (
                            <option key={algorithm.id} value={algorithm.id}>
                                {algorithm.name}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="btn-run" onClick={handleVisualize} disabled={isAnimating}>
                    ./run {selectedAlgorithm.id}
                </button>
                <button onClick={handleClearPath}>clear path</button>
                <button onClick={handleClearBoard}>clear board</button>
            </div>
            <p className="status-line" role="status">
                <span className="status-marker">{isAnimating ? '[*]' : '[ok]'}</span> {status}
            </p>
            <div className="grid-area" ref={gridAreaRef}>
                <div
                    className="grid"
                    key={`${layout.rows}x${layout.cols}`}
                    style={{ '--cell-size': `${CELL_SIZE_PX}px` }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                >
                    {grid.map((row, rowIdx) => (
                        <div className="grid-row" key={rowIdx}>
                            {row.map((node) => (
                                <Node
                                    key={nodeElementId(node.row, node.col)}
                                    row={node.row}
                                    col={node.col}
                                    isStart={node.isStart}
                                    isFinish={node.isFinish}
                                    isWall={node.isWall}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <p className="legend">
                <span className="legend-start">▸</span> start&ensp;
                <span className="legend-finish">◎</span> target&ensp;
                <span className="legend-wall">█</span> wall&ensp;
                <span className="legend-visited">░</span> visited&ensp;
                <span className="legend-path">▪</span> path
            </p>
        </div>
    );
}

const setNodeAnimationClass = (node, animationClass) => {
    if (node.isStart || node.isFinish) return;
    const element = document.getElementById(nodeElementId(node.row, node.col));
    if (element) element.className = `node ${animationClass}`;
};
