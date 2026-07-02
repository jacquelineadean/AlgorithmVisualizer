// Grid model shared by the visualizer UI and the pathfinding algorithms.
// A grid is a 2D array of node objects; algorithms operate on a cloned copy
// so the grid held in React state is never mutated.

export const nodeElementId = (row, col) => `node-${row}-${col}`;

export function createNode(row, col, { start, finish }) {
    return {
        row,
        col,
        isStart: row === start.row && col === start.col,
        isFinish: row === finish.row && col === finish.col,
        isWall: false,
        distance: Infinity,
        isVisited: false,
        previousNode: null,
    };
}

export function createGrid({ rows, cols, start, finish }) {
    const grid = [];
    for (let row = 0; row < rows; row++) {
        const currentRow = [];
        for (let col = 0; col < cols; col++) {
            currentRow.push(createNode(row, col, { start, finish }));
        }
        grid.push(currentRow);
    }
    return grid;
}

// Returns a new grid with the wall state of one node flipped.
// Start and finish nodes can never become walls.
export function toggleWall(grid, row, col) {
    const node = grid[row][col];
    if (node.isStart || node.isFinish) return grid;
    const newGrid = grid.slice();
    newGrid[row] = newGrid[row].slice();
    newGrid[row][col] = { ...node, isWall: !node.isWall };
    return newGrid;
}

export function clearWalls(grid) {
    return grid.map((row) =>
        row.map((node) => (node.isWall ? { ...node, isWall: false } : node))
    );
}

// Deep-copies the grid with all search state reset, giving algorithms a
// working copy they are free to mutate.
export function cloneGridForSearch(grid) {
    return grid.map((row) =>
        row.map((node) => ({
            ...node,
            distance: Infinity,
            isVisited: false,
            previousNode: null,
        }))
    );
}

// The four orthogonal neighbors of a node, in-bounds only.
export function getNeighbors(grid, node) {
    const { row, col } = node;
    const neighbors = [];
    if (row > 0) neighbors.push(grid[row - 1][col]);
    if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
    if (col > 0) neighbors.push(grid[row][col - 1]);
    if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
    return neighbors;
}

// Walks previousNode links back from the finish node. Returns an empty array
// when the finish node was never reached.
export function reconstructPath(finishNode) {
    if (!finishNode.isVisited) return [];
    const path = [];
    let currentNode = finishNode;
    while (currentNode !== null) {
        path.unshift(currentNode);
        currentNode = currentNode.previousNode;
    }
    return path;
}
