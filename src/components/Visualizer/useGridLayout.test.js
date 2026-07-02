import { describe, it, expect } from 'vitest';
import { computeLayout, CELL_SIZE_PX } from './useGridLayout';

describe('computeLayout', () => {
    it('sizes the grid to the available space', () => {
        const { rows, cols } = computeLayout(CELL_SIZE_PX * 40, CELL_SIZE_PX * 20);

        expect(cols).toBe(40);
        expect(rows).toBe(20);
    });

    it('clamps to a usable minimum on tiny or unmeasured viewports', () => {
        const { rows, cols } = computeLayout(0, 0);

        expect(cols).toBeGreaterThanOrEqual(9);
        expect(rows).toBeGreaterThanOrEqual(9);
    });

    it('clamps to a maximum on very large viewports', () => {
        const { rows, cols } = computeLayout(10000, 10000);

        expect(cols).toBeLessThanOrEqual(51);
        expect(rows).toBeLessThanOrEqual(23);
    });

    it('places start and finish on the middle row, inside the grid', () => {
        for (const [width, height] of [[0, 0], [375, 600], [1440, 900], [10000, 10000]]) {
            const { rows, cols, start, finish } = computeLayout(width, height);

            expect(start.row).toBe(Math.floor(rows / 2));
            expect(finish.row).toBe(start.row);
            expect(start.col).toBeGreaterThanOrEqual(0);
            expect(finish.col).toBeLessThan(cols);
            expect(start.col).toBeLessThan(finish.col);
        }
    });
});
