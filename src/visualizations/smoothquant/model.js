// Pure model for SmoothQuant on one small linear layer: activations with a
// few outlier channels, W8A8 at the granularities the paper compares, and
// the smoothing transform — a port of smooth_ln_fcs() and the absmax
// fake-quantizers in the reference code.
//
// Scoring. Y = X Wᵀ is a sum of one contribution per input channel,
// Y = Σ_j x_j w_jᵀ. This page scores how much of each contribution survives
// quantization, rather than the summed output: with eight channels the two
// loud ones dominate any sum and hide what happens to the other six, which is
// the damage the paper is about.

import {
    absmaxStep,
    columnAbsMax,
    gaussianSource,
    linear,
    median,
    quantizePerColumn,
    quantizePerRow,
    quantizePerTensor,
    scaleColumns,
} from '../quantization/model';

export const TOKENS = 64; // the calibration batch every statistic comes from
export const SHOWN_TOKENS = 6; // the rows the stage draws
export const CHANNELS = 8;
export const OUTPUTS = 4;
export const BITS = 8;
export const ALPHAS = Array.from({ length: 21 }, (_, i) => i / 20);
export const DEFAULT_ALPHA = 0.5;
export const SEEDS = [1, 2, 3, 4, 5, 6];

export const PRESETS = [
    {
        id: 'moderate',
        label: 'Moderate outliers (~13×)',
        magnitude: 20,
        note: 'Two channels run about thirteen times louder than the typical one.',
    },
    {
        id: 'severe',
        label: 'Severe outliers (~40×)',
        magnitude: 60,
        note: 'Two channels run about forty times louder than the typical one.',
    },
];

export const getPreset = (id) => PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];

// Outliers live in fixed channels: the same two columns are loud in every
// token, each with a consistent sign — the pattern the paper's Figure 4
// shows for OPT-13B.
export const OUTLIER_CHANNELS = [1, 5];

const round2 = (value) => Math.round(value * 100) / 100;

export function makeLayer({ preset = 'moderate', seed = 1 } = {}) {
    const { magnitude } = getPreset(preset);
    const g = gaussianSource(seed * 3571 + 29);
    const signs = OUTLIER_CHANNELS.map(() => (g() >= 0 ? 1 : -1));
    const X = Array.from({ length: TOKENS }, () =>
        Array.from({ length: CHANNELS }, (_, j) => {
            const k = OUTLIER_CHANNELS.indexOf(j);
            if (k >= 0) return round2(signs[k] * magnitude * (0.85 + 0.15 * Math.abs(g())));
            return round2(0.8 * g());
        })
    );
    // Weights are flat: no channel stands out, as in the paper's Figure 4.
    const W = Array.from({ length: OUTPUTS }, () => Array.from({ length: CHANNELS }, () => round2(0.3 * g())));
    return { X, W, outliers: OUTLIER_CHANNELS };
}

// s_j = max|X_j|^α / max|W_j|^(1−α), clamped as smooth_ln_fcs does. W is
// out × in here, so max|W_j| is the max over column j.
export function smoothingFactors(X, W, alpha) {
    const actMax = columnAbsMax(X);
    const weightMax = columnAbsMax(W).map((value) => Math.max(value, 1e-5));
    return actMax.map((a, j) => Math.max(a ** alpha / weightMax[j] ** (1 - alpha), 1e-5));
}

// X̂ = X diag(s)⁻¹ and Ŵ = diag(s) W in the paper's layout — for an out × in
// W that is multiplying column j by s_j. The product X̂Ŵ is unchanged.
export const smooth = (X, W, s) => ({
    Xs: scaleColumns(X, s, { invert: true }),
    Ws: scaleColumns(W, s),
});

// W8A8: activations at the given granularity, weights per-tensor (the
// weight setting of all three SmoothQuant efficiency levels).
export function w8a8(X, W, { activation = 'tensor', bits = BITS } = {}) {
    const xq =
        activation === 'token'
            ? quantizePerRow(X, bits)
            : activation === 'channel'
            ? quantizePerColumn(X, bits)
            : quantizePerTensor(X, bits);
    const wq = quantizePerTensor(W, bits);
    return { Xq: xq.Q, Wq: wq.Q, xStep: xq.step ?? null, wStep: wq.step };
}

// ‖x̂_j ŵ_jᵀ − x_j w_jᵀ‖ / ‖x_j w_jᵀ‖ for every channel j: how much of each
// channel's contribution to the output is lost to quantization.
export function channelErrors(X, W, Xq, Wq) {
    return X[0].map((_, j) => {
        let lost = 0;
        let kept = 0;
        for (let t = 0; t < X.length; t++) {
            for (let o = 0; o < W.length; o++) {
                const exact = X[t][j] * W[o][j];
                lost += (Xq[t][j] * Wq[o][j] - exact) ** 2;
                kept += exact * exact;
            }
        }
        return Math.sqrt(lost / kept);
    });
}

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

// One granularity or one α, scored: per-channel errors, their mean and worst.
const score = (X, W, run) => {
    const perChannel = channelErrors(X, W, run.Xq, run.Wq);
    return { ...run, perChannel, mean: mean(perChannel), worst: Math.max(...perChannel) };
};

export function smoothAndQuantize(X, W, alpha) {
    const s = smoothingFactors(X, W, alpha);
    const { Xs, Ws } = smooth(X, W, s);
    return { s, Xs, Ws, ...score(Xs, Ws, w8a8(Xs, Ws)) };
}

// How many of the 127 positive INT8 levels a channel reaches under a
// per-tensor step: its max over the step.
export const levelsUsed = (columnMax, step) => columnMax.map((value) => Math.round(value / step));

export function runSmoothQuant({ preset = 'moderate', seed = 1, alpha = DEFAULT_ALPHA } = {}) {
    const { X, W, outliers } = makeLayer({ preset, seed });
    const Y = linear(X, W);
    const quietOf = (values) => values.filter((_, j) => !outliers.includes(j));

    const actMax = columnAbsMax(X);
    const weightMax = columnAbsMax(W);

    const perTensor = score(X, W, w8a8(X, W, { activation: 'tensor' }));
    const perToken = score(X, W, w8a8(X, W, { activation: 'token' }));
    const perChannel = score(X, W, w8a8(X, W, { activation: 'channel' }));
    const smoothed = smoothAndQuantize(X, W, alpha);

    // Every α on the grid, with what the stage needs to draw it: the shown
    // rows of X̂ and its quantized form, Ŵ, and the per-channel statistics.
    const sweep = ALPHAS.map((a) => {
        const run = smoothAndQuantize(X, W, a);
        return {
            alpha: a,
            s: run.s,
            Xs: run.Xs.slice(0, SHOWN_TOKENS),
            Ws: run.Ws,
            Xq: run.Xq.slice(0, SHOWN_TOKENS),
            Wq: run.Wq,
            actMax: columnAbsMax(run.Xs),
            weightMax: columnAbsMax(run.Ws),
            xStep: run.xStep,
            wStep: run.wStep,
            perChannel: run.perChannel,
            mean: run.mean,
            worst: run.worst,
        };
    });
    const best = sweep.reduce((a, b) => (b.mean < a.mean ? b : a));

    const smoothedActMax = columnAbsMax(smoothed.Xs);
    const smoothedWeightMax = columnAbsMax(smoothed.Ws);
    const xStep = absmaxStep(X.flat(), BITS);
    const wStep = absmaxStep(W.flat(), BITS);

    return {
        X,
        W,
        Y,
        outliers,
        alpha,
        actMax,
        weightMax,
        smoothedActMax,
        smoothedWeightMax,
        perTensor,
        perToken,
        perChannel,
        smoothed,
        sweep,
        best,
        xStep,
        wStep,
        levels: {
            act: levelsUsed(actMax, xStep),
            weight: levelsUsed(weightMax, wStep),
            smoothedAct: levelsUsed(smoothedActMax, smoothed.xStep),
            smoothedWeight: levelsUsed(smoothedWeightMax, smoothed.wStep),
        },
        spread: Math.max(...actMax) / median(quietOf(actMax)),
        smoothedSpread: Math.max(...smoothedActMax) / median(quietOf(smoothedActMax)),
        weightSpread: Math.max(...smoothedWeightMax) / median(quietOf(smoothedWeightMax)),
        quietLevels: Math.round(median(quietOf(actMax)) / xStep),
        smoothedQuietLevels: Math.round(median(quietOf(smoothedActMax)) / smoothed.xStep),
        equivalenceGap: Math.max(
            ...linear(smoothed.Xs, smoothed.Ws).flatMap((row, i) =>
                row.map((value, j) => Math.abs(value - Y[i][j]))
            )
        ),
    };
}
