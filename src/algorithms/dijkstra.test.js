import { describe, it, expect } from 'vitest';
import { createGrid, toggleWall } from '../engine/grid';
import { runAlgorithm } from '../engine/run';
import dijkstra from './dijkstra';

const coords = (nodes) => nodes.map((node) => [node.row, node.col]);

describe('dijkstra', () => {
    it('finds the shortest path when the finish node is left of the start', () => {
        // Regression test: the original neighbor lookup never explored the
        // left neighbor, so paths could not move toward a lower column.
        const config = { rows: 5, cols: 5, start: { row: 2, col: 3 }, finish: { row: 2, col: 1 } };
        const grid = createGrid(config);

        const { pathNodesInOrder } = runAlgorithm(dijkstra, grid, config.start, config.finish);

        expect(coords(pathNodesInOrder)).toEqual([
            [2, 3],
            [2, 2],
            [2, 1],
        ]);
    });

    it('routes around walls with a shortest path', () => {
        const config = { rows: 3, cols: 5, start: { row: 1, col: 0 }, finish: { row: 1, col: 4 } };
        let grid = createGrid(config);
        // Vertical wall between start and finish, open only at the top row.
        grid = toggleWall(grid, 1, 2);
        grid = toggleWall(grid, 2, 2);

        const { pathNodesInOrder } = runAlgorithm(dijkstra, grid, config.start, config.finish);

        // Manhattan distance is 4; the detour over the wall adds 2 moves.
        expect(pathNodesInOrder.length).toBe(7);
        expect(coords(pathNodesInOrder)[0]).toEqual([1, 0]);
        expect(coords(pathNodesInOrder)[6]).toEqual([1, 4]);
        expect(pathNodesInOrder.some((node) => node.isWall)).toBe(false);
    });

    it('returns an empty path when the finish node is unreachable', () => {
        const config = { rows: 3, cols: 5, start: { row: 1, col: 0 }, finish: { row: 1, col: 4 } };
        let grid = createGrid(config);
        // Wall spanning the full grid height.
        grid = toggleWall(grid, 0, 2);
        grid = toggleWall(grid, 1, 2);
        grid = toggleWall(grid, 2, 2);

        const result = runAlgorithm(dijkstra, grid, config.start, config.finish);

        // The original implementation returned undefined here and crashed the
        // animation; the engine must always produce arrays.
        expect(Array.isArray(result.visitedNodesInOrder)).toBe(true);
        expect(result.visitedNodesInOrder.length).toBeGreaterThan(0);
        expect(result.pathNodesInOrder).toEqual([]);
    });

    it('does not mutate the grid passed to the engine', () => {
        const config = { rows: 4, cols: 4, start: { row: 0, col: 0 }, finish: { row: 3, col: 3 } };
        const grid = createGrid(config);

        runAlgorithm(dijkstra, grid, config.start, config.finish);

        for (const row of grid) {
            for (const node of row) {
                expect(node.isVisited).toBe(false);
                expect(node.distance).toBe(Infinity);
                expect(node.previousNode).toBeNull();
            }
        }
    });
});
