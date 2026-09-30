// Shared quantization model for the GPTQ, AWQ, and SmoothQuant entries:
// the quantizers each method's reference implementation uses, the small
// dense linear algebra GPTQ needs, and the error measures all three report.
// Pure and UI-free, like sorting/model.js for the two sorts.
//
// Layout convention, shared by every page so the pictures line up: a linear
// layer's weight W is out × in (PyTorch's nn.Linear layout), calibration
// activations X are tokens × in, and the layer computes Y = X Wᵀ. Column j
// of W and column j of X are the same input channel.

import { mulberry32 } from '../mathlib/random';

/* --- Seeded data ---------------------------------------------------------- */

// Standard normal draws (Box–Muller) from the shared seeded PRNG, so a
// layer is a pure function of its seed and every shared URL reproduces it.
export function gaussianSource(seed) {
    const rand = mulberry32(seed);
    return () => {
        let u = 0;
        while (u === 0) u = rand();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    };
}

/* --- Dense linear algebra (row-major arrays of arrays) --------------------- */

export const zeros = (rows, cols) => Array.from({ length: rows }, () => new Array(cols).fill(0));

export const clone = (A) => A.map((row) => [...row]);

export const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));

export const matmul = (A, B) =>
    A.map((row) => B[0].map((_, j) => row.reduce((sum, value, k) => sum + value * B[k][j], 0)));

export const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);

// Y = X Wᵀ: every token's input row against every output channel's weights.
export const linear = (X, W) => X.map((x) => W.map((w) => dot(x, w)));

// Lower-triangular L with A = L Lᵀ. Throws if A is not positive definite,
// which for a Hessian means the dampening was not enough.
export function cholesky(A) {
    const n = A.length;
    const L = zeros(n, n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = A[i][j];
            for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
            if (i === j) {
                if (!(sum > 0)) throw new Error('Matrix is not positive definite.');
                L[i][i] = Math.sqrt(sum);
            } else {
                L[i][j] = sum / L[j][j];
            }
        }
    }
    return L;
}

// Inverse of a symmetric positive-definite matrix through its Cholesky
// factor — the torch.cholesky_inverse step of GPTQ's reference code.
export function invertSPD(A) {
    const n = A.length;
    const L = cholesky(A);
    // Solve L Y = I (forward), then Lᵀ X = Y (backward), column by column.
    const inverse = zeros(n, n);
    for (let c = 0; c < n; c++) {
        const y = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            let sum = i === c ? 1 : 0;
            for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
            y[i] = sum / L[i][i];
        }
        for (let i = n - 1; i >= 0; i--) {
            let sum = y[i];
            for (let k = i + 1; k < n; k++) sum -= L[k][i] * inverse[k][c];
            inverse[i][c] = sum / L[i][i];
        }
    }
    return inverse;
}

// Upper-triangular U with A = Uᵀ U (torch.linalg.cholesky(A, upper=True)).
export const upperCholesky = (A) => transpose(cholesky(A));

/* --- Error measures -------------------------------------------------------- */

export const meanSquaredError = (A, B) => {
    let sum = 0;
    let count = 0;
    A.forEach((row, i) =>
        row.forEach((value, j) => {
            sum += (value - B[i][j]) ** 2;
            count += 1;
        })
    );
    return sum / count;
};

const frobenius = (A) => Math.sqrt(A.flat().reduce((sum, value) => sum + value * value, 0));

// ‖Y − Ŷ‖ / ‖Y‖ — the number every page reports as "output error".
export const relativeError = (Y, Yhat) =>
    frobenius(Y.map((row, i) => row.map((value, j) => value - Yhat[i][j]))) / frobenius(Y);

/* --- Quantizers ------------------------------------------------------------ */

// Asymmetric (zero-point) grid over a set of weights: 2^b evenly spaced
// levels spanning [min, max]. GPTQ's quant.py widens the range to include 0
// before fitting; llm-awq's pseudo_quantize_tensor does not — for any group
// that straddles zero the two produce the same grid.
export function minmaxGrid(values, bits, { includeZero = false } = {}) {
    const maxq = 2 ** bits - 1;
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (includeZero) {
        lo = Math.min(lo, 0);
        hi = Math.max(hi, 0);
        if (lo === 0 && hi === 0) {
            lo = -1;
            hi = 1;
        }
    }
    const scale = Math.max(hi - lo, 1e-5) / maxq;
    const zero = Math.min(maxq, Math.max(0, -Math.round(lo / scale)));
    return { scale, zero, maxq };
}

// Integer code for a value on a grid, clamped to [0, 2^b − 1].
export const codeOf = (value, { scale, zero, maxq }) =>
    Math.min(maxq, Math.max(0, Math.round(value / scale) + zero));

// Round to the nearest grid level: scale · (clamp(round(w/scale) + z) − z).
// (Math.round breaks exact .5 ties upward where torch.round breaks them to
// even; for real-valued weights a tie has probability zero.)
export const quantizeTo = (value, grid) => grid.scale * (codeOf(value, grid) - grid.zero);

// Every level a grid can represent, lowest first.
export const gridLevels = ({ scale, zero, maxq }) =>
    Array.from({ length: maxq + 1 }, (_, q) => scale * (q - zero));

// Group-wise round-to-nearest over the input dimension: each row of W is cut
// into runs of `groupSize` columns and each run gets its own grid (AWQ's
// INT4-g128 layout, at toy size).
export function quantizeGroups(W, bits, groupSize) {
    const grids = W.map((row) => {
        const perRow = [];
        for (let start = 0; start < row.length; start += groupSize) {
            perRow.push(minmaxGrid(row.slice(start, start + groupSize), bits));
        }
        return perRow;
    });
    const Q = W.map((row, i) => row.map((value, j) => quantizeTo(value, grids[i][Math.floor(j / groupSize)])));
    return { Q, grids };
}

// Symmetric absmax step Δ = max|x| / (2^(b−1) − 1), as in SmoothQuant's eq. 1
// and its fake_quant.py (which clamps the max at 1e-5 first).
export const absmaxStep = (values, bits) =>
    Math.max(1e-5, ...values.map(Math.abs)) / (2 ** (bits - 1) - 1);

export const roundToStep = (value, step) => Math.round(value / step) * step;

// Per-tensor: one Δ for the whole matrix.
export function quantizePerTensor(A, bits) {
    const step = absmaxStep(A.flat(), bits);
    return { Q: A.map((row) => row.map((value) => roundToStep(value, step))), step };
}

// Per-row: one Δ per row — per-token for activations, per-output-channel for
// weights stored out × in. Both scale an *outer* dimension of the matmul.
export function quantizePerRow(A, bits) {
    const steps = A.map((row) => absmaxStep(row, bits));
    return { Q: A.map((row, i) => row.map((value) => roundToStep(value, steps[i]))), steps };
}

// Per-column: one Δ per input channel — the inner dimension, which a GEMM
// sums over and therefore cannot rescale. Computed only as the reference
// point SmoothQuant argues from.
export function quantizePerColumn(A, bits) {
    const steps = transpose(A).map((column) => absmaxStep(column, bits));
    return { Q: A.map((row) => row.map((value, j) => roundToStep(value, steps[j]))), steps };
}

/* --- Channel statistics ---------------------------------------------------- */

export const columnAbsMax = (A) => transpose(A).map((column) => Math.max(...column.map(Math.abs)));

export const columnAbsMean = (A) =>
    transpose(A).map((column) => column.reduce((sum, value) => sum + Math.abs(value), 0) / column.length);

export const columnNorm = (A) =>
    transpose(A).map((column) => Math.sqrt(column.reduce((sum, value) => sum + value * value, 0)));

export const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const argmax = (values) => values.indexOf(Math.max(...values));

// Multiply column j of A by s[j] (or divide, with `invert`).
export const scaleColumns = (A, s, { invert = false } = {}) =>
    A.map((row) => row.map((value, j) => (invert ? value / s[j] : value * s[j])));
