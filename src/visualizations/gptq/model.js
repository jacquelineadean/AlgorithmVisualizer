// Pure model for GPTQ on one small linear layer. Two implementations of the
// same computation live here on purpose:
//
//   obsSequential — the Optimal Brain Surgeon update applied one column at a
//                   time with an explicit inverse Hessian, eliminated after
//                   every column (the paper's eqs. 2–3, in GPTQ's fixed order);
//   gptq          — a line-by-line port of fasterquant() in the reference
//                   code: the upper Cholesky factor of H⁻¹, blocks of B
//                   columns, and lazy updates of the columns beyond a block.
//
// The tests hold them equal. That equality is the paper's Step 3 claim, and
// the page shows the second while explaining it with the first.

import {
    clone,
    gaussianSource,
    invertSPD,
    linear,
    minmaxGrid,
    quantizeTo,
    relativeError,
    upperCholesky,
    zeros,
} from '../quantization/model';

export const ROWS = 4;
export const COLS = 8;
export const TOKENS = 32;
export const PERCDAMP = 0.01; // the reference code's default dampening
export const BITS = [2, 3, 4];
export const BLOCK_SIZES = [1, 2, 4, 8];
export const SEEDS = [1, 2, 3, 4, 5, 6];

export const PRESETS = [
    {
        id: 'correlated',
        label: 'Correlated inputs',
        note: 'Eight input features driven by three shared factors, as real activations are — the errors GPTQ makes can be cancelled by neighbours that carry the same signal.',
    },
    {
        id: 'decorrelated',
        label: 'Decorrelated inputs',
        note: 'Features built from Hadamard patterns, so XXᵀ is exactly diagonal. No weight can stand in for another — watch GPTQ reduce to rounding.',
    },
];

export const getPreset = (id) => PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];

// Sylvester's construction: its columns are exactly orthogonal ±1 vectors.
const hadamard = (n) => {
    let H = [[1]];
    while (H.length < n) {
        H = [...H.map((row) => [...row, ...row]), ...H.map((row) => [...row, ...row.map((v) => -v)])];
    }
    return H;
};

// Per-feature scales for the decorrelated preset. Multiples of 1/8, so every
// product and partial sum in XᵀX is exact in floating point and its
// off-diagonal entries come out as exact zeros, not merely small ones.
const DECORRELATED_SCALES = [1.5, 0.75, 1.25, 2, 0.5, 1, 1.75, 0.625];

const round2 = (value) => Math.round(value * 100) / 100;

// A layer and the calibration inputs it sees. Weights are rounded to two
// decimals so the numbers drawn on the page are the numbers computed with.
export function makeLayer({ preset = 'correlated', seed = 1 } = {}) {
    const g = gaussianSource(seed * 7919 + 17);
    const W = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => round2(0.6 * g())));

    let X;
    if (preset === 'decorrelated') {
        const H = hadamard(TOKENS);
        // Skip column 0 (all ones) and take the next COLS patterns.
        X = H.map((row) => DECORRELATED_SCALES.map((scale, j) => scale * row[j + 1]));
    } else {
        const FACTORS = 3;
        const mixing = Array.from({ length: FACTORS }, () => Array.from({ length: COLS }, () => g()));
        X = Array.from({ length: TOKENS }, () => {
            const z = Array.from({ length: FACTORS }, () => g());
            return Array.from(
                { length: COLS },
                (_, j) => z.reduce((sum, value, k) => sum + value * mixing[k][j], 0) + 0.15 * g()
            );
        });
    }
    return { W, X };
}

// H = 2XXᵀ in the paper's orientation (X as features × samples), averaged
// over samples the way add_batch() accumulates it. With our tokens × in
// layout that is (2/N)·XᵀX: in × in, and the same for every output row.
export function hessianOf(X) {
    const n = X[0].length;
    const H = zeros(n, n);
    for (const x of X) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) H[i][j] += (2 / X.length) * x[i] * x[j];
        }
    }
    return H;
}

// λ = percdamp · mean(diag H), added to the diagonal before inverting.
export function dampen(H, percdamp = PERCDAMP) {
    const damp = (percdamp * H.reduce((sum, row, i) => sum + row[i], 0)) / H.length;
    return { H: H.map((row, i) => row.map((value, j) => (i === j ? value + damp : value))), damp };
}

// One asymmetric grid per output row, fitted to the original weights before
// anything moves (find_params(W, weight=True) with perchannel=True).
export const rowGrids = (W, bits) => W.map((row) => minmaxGrid(row, bits, { includeZero: true }));

export const roundToNearest = (W, grids) => W.map((row, i) => row.map((value) => quantizeTo(value, grids[i])));

// The matrix after `done` columns: those columns quantized, the rest as the
// algorithm has left them so far.
const blend = (Q, Wc, done) => Wc.map((row, r) => row.map((value, j) => (j < done ? Q[r][j] : value)));

// OBS/OBQ in GPTQ's fixed column order, with the inverse Hessian updated by
// Gaussian elimination after every column. Every row shares the same H⁻¹
// because every row is quantized in the same order — GPTQ's Step 1.
export function obsSequential(W, Hd, grids) {
    const rows = W.length;
    const cols = W[0].length;
    const Wc = clone(W);
    const Q = zeros(rows, cols);
    let Hinv = invertSPD(Hd);
    const states = [clone(W)];
    for (let c = 0; c < cols; c++) {
        const d = Hinv[c][c];
        const pivotRow = [...Hinv[c]];
        for (let r = 0; r < rows; r++) {
            const q = quantizeTo(Wc[r][c], grids[r]);
            const e = (Wc[r][c] - q) / d;
            // δ_F = −(w_q − quant(w_q)) / [H_F⁻¹]_qq · (H_F⁻¹)_{:,q}
            for (let j = c + 1; j < cols; j++) Wc[r][j] -= e * pivotRow[j];
            Q[r][c] = q;
            Wc[r][c] = q;
        }
        // H_{−q}⁻¹ = H⁻¹ − H⁻¹_{:,q} H⁻¹_{q,:} / [H⁻¹]_qq — row and column q go to zero.
        Hinv = Hinv.map((row, i) => row.map((value, j) => value - (row[c] * pivotRow[j]) / d));
        states.push(blend(Q, Wc, c + 1));
    }
    return { Q, states };
}

// GPTQ as the reference fasterquant() runs it. Frames record what the stage
// animates: one after each column is quantized (in-block columns updated)
// and one after each lazy tail update (the columns beyond the block).
export function gptq(W, Hd, grids, blockSize) {
    const rows = W.length;
    const cols = W[0].length;
    const U = upperCholesky(invertSPD(Hd));
    const Wc = clone(W);
    const Q = zeros(rows, cols);
    const losses = zeros(rows, cols);
    const frames = [];

    for (let i1 = 0; i1 < cols; i1 += blockSize) {
        const i2 = Math.min(i1 + blockSize, cols);
        const Err = zeros(rows, i2 - i1);
        for (let col = i1; col < i2; col++) {
            const d = U[col][col];
            for (let r = 0; r < rows; r++) {
                const w = Wc[r][col];
                const q = quantizeTo(w, grids[r]);
                Q[r][col] = q;
                losses[r][col] = (w - q) ** 2 / d ** 2 / 2;
                const e = (w - q) / d;
                for (let j = col; j < i2; j++) Wc[r][j] -= e * U[col][j];
                Err[r][col - i1] = e;
            }
            frames.push({ kind: 'column', col, block: [i1, i2], weights: blend(Q, Wc, col + 1) });
        }
        if (i2 < cols) {
            for (let r = 0; r < rows; r++) {
                for (let j = i2; j < cols; j++) {
                    let update = 0;
                    for (let k = 0; k < i2 - i1; k++) update += Err[r][k] * U[i1 + k][j];
                    Wc[r][j] -= update;
                }
            }
            frames.push({ kind: 'flush', col: i2 - 1, block: [i1, i2], weights: blend(Q, Wc, i2) });
        }
    }
    return { Q, U, losses, frames };
}

// ½ Σ_rows (w − ŵ) H (w − ŵ)ᵀ — the quadratic the OBS losses add up to.
export function quadraticError(W, Q, H) {
    let total = 0;
    W.forEach((row, r) => {
        const delta = row.map((value, j) => value - Q[r][j]);
        delta.forEach((a, i) => delta.forEach((b, j) => (total += 0.5 * a * H[i][j] * b)));
    });
    return total;
}

// Step 1's cost claim: OBQ re-derives H⁻¹ per row, O(d_row · d_col³); GPTQ
// shares it, O(max{d_row · d_col², d_col³}). The ratio is min(d_row, d_col).
export const costs = (dRow, dCol) => {
    const obq = dRow * dCol ** 3;
    const gptqCost = Math.max(dRow * dCol ** 2, dCol ** 3);
    return { obq, gptq: gptqCost, ratio: obq / gptqCost };
};

// Step 2's memory claim: how many times the columns beyond the current
// block are rewritten. One per column without batching; one per block with.
export const tailPasses = (dCol, blockSize) => Math.ceil(dCol / blockSize) - 1;

// Bytes to store `params` weights at `bits` each (scales and zero-points,
// one pair per row or group, are left out — at real widths they round away).
export const storageBytes = (params, bits) => (params * bits) / 8;

// Everything the trace narrates, computed once.
export function runGptq({ preset = 'correlated', seed = 1, bits = 3, blockSize = 4 } = {}) {
    const { W, X } = makeLayer({ preset, seed });
    const H = hessianOf(X);
    const { H: Hd, damp } = dampen(H);
    const grids = rowGrids(W, bits);
    const rtn = roundToNearest(W, grids);
    const run = gptq(W, Hd, grids, blockSize);
    const sequential = obsSequential(W, Hd, grids);
    const Y = linear(X, W);
    const errorOf = (M) => relativeError(Y, linear(X, M));
    // The curve on the result step: output error after c columns, for
    // round-to-nearest (rest untouched) and GPTQ (rest compensated).
    const curve = sequential.states.map((state, c) => ({
        columns: c,
        rtn: errorOf(W.map((row, r) => row.map((value, j) => (j < c ? rtn[r][j] : value)))),
        gptq: errorOf(state),
    }));
    return {
        W,
        X,
        H,
        Hd,
        damp,
        grids,
        rtn,
        ...run,
        sequentialQ: sequential.Q,
        curveStates: sequential.states,
        curve,
        rtnError: errorOf(rtn),
        gptqError: errorOf(run.Q),
    };
}
