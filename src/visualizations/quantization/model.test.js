import { describe, expect, it } from 'vitest';
import {
    absmaxStep,
    cholesky,
    codeOf,
    columnAbsMax,
    columnAbsMean,
    gaussianSource,
    gridLevels,
    invertSPD,
    linear,
    matmul,
    minmaxGrid,
    quantizeGroups,
    quantizePerColumn,
    quantizePerRow,
    quantizePerTensor,
    quantizeTo,
    relativeError,
    scaleColumns,
    transpose,
    upperCholesky,
} from './model';

const SPD = [
    [4, 2, 0.6],
    [2, 5, 1.5],
    [0.6, 1.5, 3],
];

const expectMatrixClose = (A, B, digits = 12) =>
    A.forEach((row, i) => row.forEach((value, j) => expect(value).toBeCloseTo(B[i][j], digits)));

const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

describe('linear algebra', () => {
    it('factors a symmetric positive-definite matrix both ways', () => {
        const L = cholesky(SPD);
        expectMatrixClose(matmul(L, transpose(L)), SPD);
        L.forEach((row, i) => row.forEach((value, j) => j > i && expect(value).toBe(0)));
        const U = upperCholesky(SPD);
        expectMatrixClose(matmul(transpose(U), U), SPD);
    });

    it('inverts through the factor', () => {
        expectMatrixClose(matmul(SPD, invertSPD(SPD)), identity(3));
    });

    it('refuses a matrix that is not positive definite', () => {
        expect(() =>
            cholesky([
                [1, 2],
                [2, 1],
            ])
        ).toThrow(/positive definite/);
    });

    it('computes a linear layer as X Wᵀ', () => {
        const X = [
            [1, 2],
            [3, 4],
        ];
        const W = [
            [1, 0],
            [0, 1],
            [1, 1],
        ];
        expect(linear(X, W)).toEqual([
            [1, 2, 3],
            [3, 4, 7],
        ]);
    });
});

describe('asymmetric min–max grids (GPTQ quant.py, llm-awq pseudo_quantize_tensor)', () => {
    it('spreads 2^b levels over the range and rounds to the nearest', () => {
        // lo = −0.5, hi = 1.0, 2 bits → scale 0.5, zero-point 1.
        const grid = minmaxGrid([-0.5, 0.3, 1.0], 2, { includeZero: true });
        expect(grid).toEqual({ scale: 0.5, zero: 1, maxq: 3 });
        expect(gridLevels(grid)).toEqual([-0.5, 0, 0.5, 1]);
        expect(quantizeTo(0.3, grid)).toBe(0.5);
        expect(codeOf(0.3, grid)).toBe(2);
    });

    it('keeps zero exactly representable when asked to, as GPTQ does', () => {
        const grid = minmaxGrid([0.2, 0.6, 1.0], 3, { includeZero: true });
        expect(quantizeTo(0, grid)).toBe(0);
        expect(gridLevels(grid)[0]).toBe(0);
    });

    it('never errs by more than half a step inside the range', () => {
        const g = gaussianSource(7);
        for (const bits of [2, 3, 4, 8]) {
            const values = Array.from({ length: 64 }, () => g());
            const grid = minmaxGrid(values, bits);
            for (const value of values) {
                expect(Math.abs(quantizeTo(value, grid) - value)).toBeLessThanOrEqual(grid.scale / 2 + 1e-12);
            }
        }
    });

    it('gives each group of columns its own grid', () => {
        const W = [
            [0.1, -0.2, 3, -4],
            [1, 2, 3, 4],
        ];
        const { grids, Q } = quantizeGroups(W, 3, 2);
        expect(grids.map((row) => row.length)).toEqual([2, 2]);
        // The first group of row 0 is tiny, so its step is far finer than the second's.
        expect(grids[0][0].scale).toBeLessThan(grids[0][1].scale / 10);
        expect(Q[0][0]).toBeCloseTo(0.1, 1);
    });
});

describe('symmetric absmax quantizers (SmoothQuant fake_quant.py)', () => {
    it('uses Δ = max|x| / (2^(b−1) − 1)', () => {
        expect(absmaxStep([-12.7, 3], 8)).toBeCloseTo(0.1, 15);
        expect(absmaxStep([0, 0], 8)).toBeCloseTo(1e-5 / 127, 20);
    });

    it('scales per tensor, per row (token), or per column (channel)', () => {
        const A = [
            [1, -50],
            [0.5, 20],
        ];
        const tensor = quantizePerTensor(A, 8);
        expect(tensor.step).toBeCloseTo(50 / 127, 15);
        const rows = quantizePerRow(A, 8);
        expect(rows.steps.map((s) => s * 127)).toEqual([50, 20].map((v) => expect.closeTo(v, 12)));
        const cols = quantizePerColumn(A, 8);
        expect(cols.steps.map((s) => s * 127)).toEqual([1, 50].map((v) => expect.closeTo(v, 12)));
        // Only per-column keeps the quiet column's values nearly intact.
        expect(Math.abs(cols.Q[1][0] - 0.5)).toBeLessThan(Math.abs(tensor.Q[1][0] - 0.5));
        for (const run of [tensor, rows, cols]) {
            run.Q.forEach((row, i) => row.forEach((value, j) => expect(Math.abs(value - A[i][j])).toBeLessThanOrEqual(50 / 254 + 1e-12)));
        }
    });
});

describe('statistics and helpers', () => {
    it('draws reproducible, standard-normal samples', () => {
        const a = gaussianSource(42);
        const b = gaussianSource(42);
        const draws = Array.from({ length: 20000 }, () => a());
        expect(draws.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => b()));
        const mean = draws.reduce((s, v) => s + v, 0) / draws.length;
        const variance = draws.reduce((s, v) => s + (v - mean) ** 2, 0) / draws.length;
        expect(Math.abs(mean)).toBeLessThan(0.03);
        expect(Math.abs(variance - 1)).toBeLessThan(0.05);
    });

    it('summarizes channels and rescales them', () => {
        const X = [
            [1, -4],
            [-3, 2],
        ];
        expect(columnAbsMax(X)).toEqual([3, 4]);
        expect(columnAbsMean(X)).toEqual([2, 3]);
        expect(scaleColumns(X, [2, 0.5])).toEqual([
            [2, -2],
            [-6, 1],
        ]);
        expect(scaleColumns(X, [2, 0.5], { invert: true })).toEqual([
            [0.5, -8],
            [-1.5, 4],
        ]);
    });

    it('reports relative error as ‖Y − Ŷ‖ / ‖Y‖', () => {
        expect(relativeError([[3, 4]], [[3, 4]])).toBe(0);
        expect(relativeError([[3, 4]], [[0, 0]])).toBe(1);
    });
});
