import { describe, it, expect } from 'vitest';
import { createGrid, toggleWall, clearWalls, getNeighbors } from './grid';

const CONFIG = { rows: 4, cols: 6, start: { row: 1, col: 1 }, finish: { row: 2, col: 4 } };

describe('createGrid', () => {
    it('creates a grid with the requested dimensions and marked endpoints', () => {
        const grid = createGrid(CONFIG);

        expect(grid.length).toBe(4);
        expect(grid[0].length).toBe(6);
        expect(grid[1][1].isStart).toBe(true);
        expect(grid[2][4].isFinish).toBe(true);
        expect(grid.flat().filter((node) => node.isStart).length).toBe(1);
        expect(grid.flat().filter((node) => node.isFinish).length).toBe(1);
    });
});

describe('toggleWall', () => {
    it('toggles a wall without mutating the original grid', () => {
        const grid = createGrid(CONFIG);
        const newGrid = toggleWall(grid, 0, 0);

        expect(newGrid[0][0].isWall).toBe(true);
        expect(grid[0][0].isWall).toBe(false);
        expect(newGrid[0][1]).toBe(grid[0][1]);
    });

    it('refuses to place walls on the start and finish nodes', () => {
        const grid = createGrid(CONFIG);

        expect(toggleWall(grid, 1, 1)).toBe(grid);
        expect(toggleWall(grid, 2, 4)).toBe(grid);
    });
});

describe('clearWalls', () => {
    it('removes every wall', () => {
        let grid = createGrid(CONFIG);
        grid = toggleWall(grid, 0, 0);
        grid = toggleWall(grid, 3, 5);

        const cleared = clearWalls(grid);

        expect(cleared.flat().some((node) => node.isWall)).toBe(false);
    });
});

describe('getNeighbors', () => {
    it('returns all four orthogonal neighbors for an interior node', () => {
        const grid = createGrid(CONFIG);
        const neighbors = getNeighbors(grid, grid[1][2]);

        const coords = neighbors.map((node) => [node.row, node.col]);
        expect(coords).toContainEqual([0, 2]);
        expect(coords).toContainEqual([2, 2]);
        expect(coords).toContainEqual([1, 1]);
        expect(coords).toContainEqual([1, 3]);
        expect(coords.length).toBe(4);
    });

    it('clips neighbors at the grid edges', () => {
        const grid = createGrid(CONFIG);
        const neighbors = getNeighbors(grid, grid[0][0]);

        const coords = neighbors.map((node) => [node.row, node.col]);
        expect(coords).toContainEqual([1, 0]);
        expect(coords).toContainEqual([0, 1]);
        expect(coords.length).toBe(2);
    });
});
