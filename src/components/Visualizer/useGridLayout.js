import { useEffect, useState } from 'react';

export const CELL_SIZE_PX = 22;

const MIN_COLS = 9;
const MAX_COLS = 51;
const MIN_ROWS = 9;
const MAX_ROWS = 23;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Derives grid dimensions from the space available to the grid, so the board
// fills a desktop monitor and still fits a phone without overflowing.
// Start/finish are placed proportionally on the middle row.
export function computeLayout(width, height) {
    const cols = clamp(Math.floor(width / CELL_SIZE_PX), MIN_COLS, MAX_COLS);
    const rows = clamp(Math.floor(height / CELL_SIZE_PX), MIN_ROWS, MAX_ROWS);
    const middleRow = Math.floor(rows / 2);
    return {
        rows,
        cols,
        start: { row: middleRow, col: Math.floor(cols * 0.2) },
        finish: { row: middleRow, col: Math.floor(cols * 0.8) },
    };
}

// Measures the container and recomputes the layout on window resize
// (debounced). The returned object is referentially stable while the
// dimensions stay the same, so it is safe to use as an effect dependency.
export function useGridLayout(containerRef) {
    const [layout, setLayout] = useState(() => computeLayout(0, 0));

    useEffect(() => {
        const measure = () => {
            const element = containerRef.current;
            if (!element) return;
            const rect = element.getBoundingClientRect();
            const availableHeight = window.innerHeight - rect.top - 48;
            setLayout((previous) => {
                const next = computeLayout(rect.width, availableHeight);
                return next.rows === previous.rows && next.cols === previous.cols
                    ? previous
                    : next;
            });
        };

        measure();
        let debounce;
        const handleResize = () => {
            clearTimeout(debounce);
            debounce = setTimeout(measure, 150);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(debounce);
            window.removeEventListener('resize', handleResize);
        };
    }, [containerRef]);

    return layout;
}
