import { useCallback, useEffect, useRef, useState } from 'react';
import Node, { nodeClassName } from '../Node/Node';
import { createGrid, toggleWall, clearWalls, nodeElementId } from '../../engine/grid';
import { runAlgorithm } from '../../engine/run';
import { createAnimator } from '../../engine/animator';
import { getAlgorithm, listAlgorithms } from '../../algorithms';

import './Visualizer.css';

const DEFAULT_CONFIG = {
    rows: 20,
    cols: 50,
    start: { row: 10, col: 15 },
    finish: { row: 10, col: 35 },
};

// Animation classes are applied straight to the DOM (bypassing React state)
// so that animating ~1000 nodes doesn't trigger a re-render per frame.
// Node is memoized, so untouched nodes are not re-rendered by React and the
// animation classes survive wall edits elsewhere in the grid.
const setNodeAnimationClass = (node, animationClass) => {
    if (node.isStart || node.isFinish) return;
    const element = document.getElementById(nodeElementId(node.row, node.col));
    if (element) element.className = `node ${animationClass}`;
};

export default function Visualizer({ config = DEFAULT_CONFIG }) {
    const [grid, setGrid] = useState(() => createGrid(config));
    const [algorithmId, setAlgorithmId] = useState(() => listAlgorithms()[0].id);
    const [isAnimating, setIsAnimating] = useState(false);
    const isAnimatingRef = useRef(false);
    const mousePressedRef = useRef(false);
    const animatorRef = useRef(null);
    if (animatorRef.current === null) animatorRef.current = createAnimator();

    const setAnimating = (value) => {
        isAnimatingRef.current = value;
        setIsAnimating(value);
    };

    // End wall-drawing drags even when the mouse is released outside the grid.
    useEffect(() => {
        const handleMouseUp = () => {
            mousePressedRef.current = false;
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    useEffect(() => {
        const animator = animatorRef.current;
        return () => animator.cancel();
    }, []);

    const handleMouseDown = useCallback((row, col) => {
        if (isAnimatingRef.current) return;
        mousePressedRef.current = true;
        setGrid((currentGrid) => toggleWall(currentGrid, row, col));
    }, []);

    const handleMouseEnter = useCallback((row, col) => {
        if (isAnimatingRef.current || !mousePressedRef.current) return;
        setGrid((currentGrid) => toggleWall(currentGrid, row, col));
    }, []);

    // Stops any running animation and restores every node's class to what the
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
        const result = runAlgorithm(getAlgorithm(algorithmId), grid, config.start, config.finish);
        animatorRef.current.play(result, {
            onVisit: (node) => setNodeAnimationClass(node, 'node-visited'),
            onPathStep: (node) => setNodeAnimationClass(node, 'node-shortest-path'),
            onFinish: () => setAnimating(false),
        });
    };

    const handleClearPath = () => clearAnimation(grid);

    const handleClearBoard = () => {
        clearAnimation(grid);
        setGrid((currentGrid) => clearWalls(currentGrid));
    };

    const algorithms = listAlgorithms();
    const selectedAlgorithm = getAlgorithm(algorithmId);

    return (
        <div className="visualizer">
            <div className="controls">
                <label>
                    Algorithm{' '}
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
                <button onClick={handleVisualize} disabled={isAnimating}>
                    Visualize {selectedAlgorithm.name}
                </button>
                <button onClick={handleClearPath}>Clear Path</button>
                <button onClick={handleClearBoard}>Clear Board</button>
            </div>
            {selectedAlgorithm.description && (
                <p className="algorithm-description">{selectedAlgorithm.description}</p>
            )}
            <div className="grid">
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
                                onMouseDown={handleMouseDown}
                                onMouseEnter={handleMouseEnter}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
