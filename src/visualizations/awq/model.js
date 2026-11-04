// Pure model for AWQ on one small linear layer: group-wise round-to-nearest
// as the baseline, the "keep 1% in FP16" experiment that motivates the
// method, the per-channel scaling that replaces it, and the scale search —
// a port of _search_module_scale() in the reference llm-awq code.

import {
    argmax,
    columnAbsMean,
    columnNorm,
    gaussianSource,
    linear,
    meanSquaredError,
    quantizeGroups,
    relativeError,
    scaleColumns,
} from '../quantization/model';

export const ROWS = 4;
export const COLS = 8;
export const TOKENS = 32;
export const BITS = [3, 4];
export const GROUP_SIZES = [4, 8];
export const SEEDS = [1, 2, 3, 4, 5, 6];
export const N_GRID = 20; // the reference search's grid: α = 0, 0.05, …, 0.95
export const S_TRIALS = [1, 1.5, 2, 4, 8];

// Which channel carries the loud activations, per seed — so different seeds
// move the salient channel around rather than always lighting up the same
// column.
const SALIENT = [5, 2, 6, 1, 3, 4];

const round2 = (value) => Math.round(value * 100) / 100;

// One channel's activations run ~8× the others (the salient one); a
// different channel has the largest weights but quiet activations — the
// decoy a weight-magnitude heuristic picks.
export function makeLayer({ seed = 1 } = {}) {
    const g = gaussianSource(seed * 104729 + 5);
    const salient = SALIENT[(seed - 1) % SALIENT.length];
    const decoy = (salient + 3) % COLS;
    const magnitude = Array.from({ length: COLS }, (_, j) => {
        if (j === salient) return 7;
        if (j === decoy) return 0.35;
        return 0.6 + 0.3 * Math.abs(g());
    });
    const W = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, (_, j) => round2((j === decoy ? 1.2 : 0.5) * g()))
    );
    const X = Array.from({ length: TOKENS }, () => magnitude.map((m) => m * g()));
    return { W, X, salient, decoy };
}

// Q(W · diag(s)) · diag(s)⁻¹ — the weights the layer effectively uses once
// the scaled weights are quantized and 1/s is folded into its input.
export function scaledQuantize(W, s, bits, groupSize) {
    const { Q, grids } = quantizeGroups(scaleColumns(W, s), bits, groupSize);
    return { Weff: scaleColumns(Q, s, { invert: true }), grids };
}

// The paper's Table 1 experiment at toy size: round everything, then put
// one input channel's weights back at full precision.
export const keepChannel = (W, Q, channel) =>
    Q.map((row, r) => row.map((value, j) => (j === channel ? W[r][j] : value)));

// The reference search: s = s_X^α over a 20-point grid, normalized by
// √(max · min), scored by the layer's output MSE on the calibration set.
export function searchScales(W, X, bits, groupSize) {
    const Y = linear(X, W);
    const sX = columnAbsMean(X);
    const history = [];
    let best = null;
    for (let i = 0; i < N_GRID; i++) {
        const alpha = i / N_GRID;
        const raw = sX.map((value) => Math.max(value ** alpha, 1e-4));
        const norm = Math.sqrt(Math.max(...raw) * Math.min(...raw));
        const s = raw.map((value) => value / norm);
        const { Weff } = scaledQuantize(W, s, bits, groupSize);
        const Yq = linear(X, Weff);
        const point = { alpha, s, Weff, loss: meanSquaredError(Y, Yq), error: relativeError(Y, Yq) };
        history.push(point);
        if (!best || point.loss < best.loss) best = point;
    }
    return { sX, history, best };
}

// Each weight's share of the output error: its rounding error times how
// loud its input channel is. The quantity AWQ is built to shrink.
export const errorShare = (W, Wq, sX) =>
    W.map((row, r) => row.map((value, j) => Math.abs(Wq[r][j] - value) * sX[j]));

export function runAwq({ seed = 1, bits = 3, groupSize = 4 } = {}) {
    const { W, X, salient, decoy } = makeLayer({ seed });
    const Y = linear(X, W);
    const errorOf = (M) => relativeError(Y, linear(X, M));
    const sX = columnAbsMean(X);
    const weightNorm = columnNorm(W);
    const byActivation = argmax(sX);
    const byWeight = argmax(weightNorm);

    const { Q: rtn, grids } = quantizeGroups(W, bits, groupSize);
    const keptByActivation = keepChannel(W, rtn, byActivation);
    const keptByWeight = keepChannel(W, rtn, byWeight);

    // Scale only the salient channel by s: the paper's Table 2 experiment.
    const groupOf = Math.floor(byActivation / groupSize);
    const trials = S_TRIALS.map((factor) => {
        const s = sX.map((_, j) => (j === byActivation ? factor : 1));
        const { Weff, grids: scaledGrids } = scaledQuantize(W, s, bits, groupSize);
        const ratios = scaledGrids.map((row, r) => row[groupOf].scale / grids[r][groupOf].scale);
        return {
            s: factor,
            Weff,
            error: errorOf(Weff),
            changed: ratios.filter((ratio) => Math.abs(ratio - 1) > 1e-12).length / ratios.length,
            meanRatio: ratios.reduce((a, b) => a + b, 0) / ratios.length,
            salientError:
                W.reduce((sum, row, r) => sum + Math.abs(Weff[r][byActivation] - row[byActivation]), 0) /
                W.length,
        };
    });

    const search = searchScales(W, X, bits, groupSize);
    const { Weff: awq, grids: awqGrids } = scaledQuantize(W, search.best.s, bits, groupSize);

    return {
        W,
        X,
        Y,
        sX,
        salient,
        decoy,
        weightNorm,
        byActivation,
        byWeight,
        grids,
        rtn,
        keptByActivation,
        keptByWeight,
        trials,
        search,
        awq,
        awqGrids,
        errors: {
            rtn: errorOf(rtn),
            keepWeight: errorOf(keptByWeight),
            keepActivation: errorOf(keptByActivation),
            scale2: trials.find((trial) => trial.s === 2).error,
            awq: errorOf(awq),
        },
    };
}
