// Builds the SmoothQuant trace: W8A8 and its one-step-per-tensor grid, the
// outlier channels that break it, the granularities that do and do not
// help, the smoothing transform, the α sweep (streamed), and the fold into
// LayerNorm that makes it free. Every number is computed by
// smoothquant/model.js from the current inputs.

import {
    ALPHAS,
    BITS,
    CHANNELS,
    OUTPUTS,
    PRESETS,
    SEEDS,
    SHOWN_TOKENS,
    TOKENS,
    getPreset,
    runSmoothQuant,
} from './model';
import { median } from '../quantization/model';

export const ACTS = [
    { id: 'problem', name: 'The problem' },
    { id: 'method', name: 'The method' },
    { id: 'result', name: 'The result' },
];

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const fixed = (value, digits = 2) => Number(value).toFixed(digits);
const ch = (j) => `c${j + 1}`;

export function buildSmoothQuantTrace({ preset = 'severe', seed = 1, alpha = 0.5 } = {}) {
    if (!PRESETS.some((item) => item.id === preset)) throw new Error('Pick an outlier preset.');
    if (!SEEDS.includes(seed)) throw new Error(`Pick a layer between 1 and ${SEEDS.length}.`);
    if (!ALPHAS.some((value) => Math.abs(value - alpha) < 1e-9)) {
        throw new Error('Pick a migration strength α between 0 and 1 in steps of 0.05.');
    }

    const presetInfo = getPreset(preset);
    const run = runSmoothQuant({ preset: presetInfo.id, seed, alpha });
    const { perTensor, perToken, perChannel, smoothed, outliers, best, levels } = run;
    const quietChannels = [...Array(CHANNELS).keys()].filter((j) => !outliers.includes(j));
    const loudMax = Math.max(...run.actMax);
    const typicalMax = median(quietChannels.map((j) => run.actMax[j]));
    const alphaLabel = fixed(alpha);
    const alphaIndex = ALPHAS.findIndex((value) => Math.abs(value - alpha) < 1e-9);

    const steps = [
        {
            id: 'layer',
            act: 'problem',
            title: 'One layer, weights and activations both in INT8',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'XIAO2023', detail: '§2' }],
            explanation:
                `A linear layer Y = XW with ${CHANNELS} input channels and ${OUTPUTS} outputs, calibrated ` +
                `on ${TOKENS} tokens — the first ${SHOWN_TOKENS} are drawn. SmoothQuant’s target is W8A8: ` +
                'weights and activations both in INT8, so the matrix multiply itself runs on integer ' +
                'hardware. (Weight-only methods such as GPTQ and AWQ dequantize back to 16-bit before ' +
                'multiplying.) W is drawn out × in, so column j of X and column j of W are the same ' +
                'input channel, and anything done to one can be undone in the other.',
            kind: 'values',
            data: {
                frame: 'original',
                view: 'levels',
                values: [
                    { label: 'X', value: `${TOKENS} tokens × ${CHANNELS} channels` },
                    { label: 'W', value: `${OUTPUTS} outputs × ${CHANNELS} channels` },
                    { label: 'target', value: 'W8A8 — INT8 weights and activations' },
                    { label: 'activations', value: presetInfo.label },
                ],
            },
        },
        {
            id: 'int8',
            act: 'problem',
            title: 'INT8: one step size for the whole tensor',
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: '§2, eq. 1' },
                { key: 'JACOB2018', detail: '§2.1' },
            ],
            explanation:
                'Symmetric INT8 maps a tensor onto the integers −127…127 with a single step Δ = max|X| / ' +
                '127, set by the largest magnitude anywhere in it. Here that is ' +
                `Δ_X = ${fixed(run.xStep, 3)} for the activations and Δ_W = ${fixed(run.wStep, 4)} for the ` +
                'weights. The chart on the right counts how many of the 127 positive levels each channel ' +
                'actually reaches. A channel whose values are small next to the tensor’s maximum lands on ' +
                'only a handful.',
            kind: 'formula',
            data: {
                frame: 'original',
                view: 'levels',
                lines: [
                    { tex: '\\bar X = \\Big\\lfloor \\frac{X}{\\Delta} \\Big\\rceil, \\qquad \\Delta = \\frac{\\max |X|}{2^{N-1} - 1}' },
                    `N = ${BITS} · Δ_X = ${fixed(run.xStep, 3)} · Δ_W = ${fixed(run.wStep, 4)}`,
                ],
            },
        },
        {
            id: 'outliers',
            act: 'problem',
            title: `Two channels run ${fixed(run.spread, 0)}× louder than the rest`,
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: '§3' },
                { key: 'DETTMERS2022', detail: '§4' },
            ],
            explanation:
                'Activations in large models are not evenly spread. A few channels carry values far larger ' +
                `than the rest — here ${outliers.map(ch).join(' and ')} reach ${fixed(loudMax, 1)}, ` +
                `${fixed(run.spread, 1)}× the typical channel’s ${fixed(typicalMax)} — and they are loud in ` +
                'every token, not just a few. LLM.int8() measured such outlier features emerging ' +
                'systematically as models grow; SmoothQuant’s observation is that they persist in the ' +
                'same channels. With Δ set by the outliers, the typical channel reaches only ' +
                `${run.quietLevels} of 127 levels. The weights are flat by comparison: their quietest ` +
                `channel still reaches ${Math.min(...levels.weight)}.`,
            kind: 'values',
            data: {
                frame: 'original',
                view: 'levels',
                values: [
                    { label: 'loudest channel, max |x|', value: fixed(loudMax, 1) },
                    { label: 'typical channel, max |x|', value: fixed(typicalMax) },
                    { label: 'levels, typical activation channel', value: `${run.quietLevels} of 127` },
                    { label: 'levels, quietest weight channel', value: `${Math.min(...levels.weight)} of 127` },
                ],
            },
        },
        {
            id: 'baseline',
            act: 'problem',
            title: 'Per-tensor W8A8: the quiet channels drown',
            provenance: 'paper',
            sourceRefs: [{ key: 'XIAO2023', detail: '§3' }],
            explanation:
                'Quantize both tensors per-tensor and look at the activations: the quiet channels collapse ' +
                `onto a few multiples of Δ_X = ${fixed(run.xStep, 3)}. Y is a sum of one contribution per ` +
                'channel, x_j w_jᵀ, so score each by how much of it survives. The worst channel loses ' +
                `${pct(perTensor.worst)} and the average ${pct(perTensor.mean)}, while the loud channels ` +
                `lose ${pct(Math.max(...outliers.map((j) => perTensor.perChannel[j])))} at most — the ` +
                'damage lands on the quiet ones.',
            kind: 'values',
            data: {
                frame: 'q-tensor',
                view: 'channels',
                compare: 'tensor',
                values: [
                    { label: 'worst channel loses', value: pct(perTensor.worst) },
                    { label: 'average channel loses', value: pct(perTensor.mean) },
                    { label: 'activation step Δ_X', value: fixed(run.xStep, 3) },
                ],
            },
        },
        {
            id: 'per-token',
            act: 'problem',
            title: 'Per-token scales barely help',
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: '§3' },
                { key: 'DETTMERS2022', detail: '§3.1' },
            ],
            explanation:
                'Giving each token its own Δ is cheap — it scales rows of X, an outer dimension of the ' +
                'multiply — and LLM.int8() quantizes activations this way. But the outliers sit in every ' +
                'token, so every token’s maximum is still set by them. The worst channel now loses ' +
                `${pct(perToken.worst)} (from ${pct(perTensor.worst)}), the average ` +
                `${pct(perToken.mean)}.`,
            kind: 'values',
            data: {
                frame: 'q-token',
                view: 'channels',
                compare: 'token',
                values: [
                    { label: 'per-tensor, worst / mean', value: `${pct(perTensor.worst)} / ${pct(perTensor.mean)}` },
                    { label: 'per-token, worst / mean', value: `${pct(perToken.worst)} / ${pct(perToken.mean)}` },
                ],
            },
        },
        {
            id: 'per-channel',
            act: 'problem',
            title: 'Per-channel scales would work — but the GEMM can’t apply them',
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: '§3' },
                { key: 'JACOB2018', detail: '§2.2' },
            ],
            explanation:
                'A step per input channel suits these activations: the worst channel would lose only ' +
                `${pct(perChannel.worst)}. But an INT8 matrix multiply sums over the input channels, ` +
                'Y_to = Σ_j X_tj W_jo, and a scale can come outside that sum only if it is the same for ' +
                'every j — one per token (row of X) or one per output (column of W). A different Δ for ' +
                'each channel would have to be applied inside the sum, which is exactly what integer ' +
                'GEMM kernels cannot do.',
            kind: 'formula',
            data: {
                frame: 'q-channel',
                view: 'ledger',
                ledger: 3,
                lines: [
                    { tex: 'Y = \\mathrm{diag}(\\Delta_X)\\,\\bigl(\\bar X \\bar W\\bigr)\\,\\mathrm{diag}(\\Delta_W)' },
                    'Δ_X: one per token · Δ_W: one per output channel · never one per input channel',
                ],
            },
        },
        {
            id: 'migrate',
            act: 'method',
            title: 'Move the difficulty into the weights',
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: '§4, eqs. 3–4' },
                { key: 'SQCODE', detail: 'smooth.py, smooth_ln_fcs()' },
            ],
            explanation:
                'Divide each activation channel by a factor s_j and multiply the same channel of W by ' +
                `s_j. The product is untouched — X̂Ŵ reproduces XW to within ${run.equivalenceGap.toExponential(0)} — ` +
                'but part of the outlier now lives in the weights, which had range to spare. SmoothQuant ' +
                `sets s_j = max|X_j|^α / max|W_j|^(1−α), with α the migration strength. At α = ${alphaLabel} ` +
                `the loud channels get s = ${outliers.map((j) => fixed(smoothed.s[j], 1)).join(' and ')}, and ` +
                `the spread of activation maxima falls from ${fixed(run.spread, 1)}× to ` +
                `${fixed(run.smoothedSpread, 1)}×.` +
                (Math.abs(alpha - 0.5) < 1e-9
                    ? ' At α = 0.5 the two sides meet exactly: every channel’s activation maximum equals ' +
                      'its weight maximum, √(max|X_j| · max|W_j|).'
                    : ''),
            kind: 'formula',
            data: {
                frame: 'smoothed',
                view: 'levels',
                lines: [
                    { tex: 'Y = \\bigl(X\\,\\mathrm{diag}(s)^{-1}\\bigr)\\cdot\\bigl(\\mathrm{diag}(s)\\,W\\bigr) = \\hat X\\,\\hat W' },
                    { tex: 's_j = \\max|X_j|^{\\alpha} \\,\\big/\\, \\max|W_j|^{1-\\alpha}' },
                ],
            },
        },
        {
            id: 'smoothed',
            act: 'method',
            title: `W8A8 again: worst channel ${pct(perTensor.worst)} → ${pct(smoothed.worst)}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'XIAO2023', detail: '§4' }],
            explanation:
                'Now quantize X̂ and Ŵ per-tensor — the cheapest granularity, the one that failed ' +
                `above. The typical activation channel reaches ${run.smoothedQuietLevels} levels instead ` +
                `of ${run.quietLevels}, and the weights gave up some of their range to make room. The ` +
                `worst channel loses ${pct(smoothed.worst)} and the average ${pct(smoothed.mean)}, against ` +
                `${pct(perTensor.worst)} and ${pct(perTensor.mean)} before` +
                (smoothed.worst < perToken.worst
                    ? ` — better than per-token scaling managed (${pct(perToken.worst)}), at a lower cost.`
                    : '.'),
            kind: 'values',
            data: {
                frame: 'q-smoothed',
                view: 'channels',
                compare: 'smoothed',
                values: [
                    { label: 'before, worst / mean', value: `${pct(perTensor.worst)} / ${pct(perTensor.mean)}` },
                    { label: `α = ${alphaLabel}, worst / mean`, value: `${pct(smoothed.worst)} / ${pct(smoothed.mean)}` },
                    { label: 'typical activation channel', value: `${run.quietLevels} → ${run.smoothedQuietLevels} levels` },
                ],
            },
        },
        {
            id: 'alpha',
            act: 'method',
            title: 'α: how much difficulty to move',
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: '§4' },
                { key: 'SQCODE', detail: 'README, perplexity table' },
            ],
            explanation:
                'At α = 0 all the difficulty stays with the activations: s_j = 1/max|W_j| makes every ' +
                'weight channel exactly flat and leaves the outliers where they were. At α = 1 it all ' +
                'moves: every activation channel comes out with the same maximum and the weights inherit ' +
                'the outliers. The loss is lowest in ' +
                `between. For this layer the best α is ${fixed(best.alpha)} (average loss ` +
                `${pct(best.mean)}). The paper found α = 0.5 a well-balanced default and raised it for ` +
                'models whose outliers are more extreme; the project’s own W8A8 results for Llama, ' +
                'Mistral and Falcon models use values from 0.6 to 0.9.',
            kind: 'formula',
            data: {
                frame: 'sweep',
                view: 'alpha',
                lines: [`α ∈ {0, 0.05, …, 1} — ${ALPHAS.length} settings, each smoothed then quantized W8A8`],
                result: `best α = ${fixed(best.alpha)} · yours: α = ${alphaLabel}`,
            },
            stream: { events: run.sweep.map((point) => ({ alpha: point.alpha })), tick: 200 },
        },
        {
            id: 'fuse',
            act: 'result',
            title: 'Fold s into the LayerNorm before',
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: '§4' },
                { key: 'SQCODE', detail: 'smooth.py' },
            ],
            explanation:
                'The division by s costs nothing at inference: s is folded offline into the LayerNorm ' +
                'that produces X — its gain and bias are divided by s — and into the weights of the ' +
                'linear layers that read X. The reference code does this for the inputs of the attention ' +
                'projections and of the first MLP layer. The paper then offers three efficiency levels ' +
                'that coarsen the activation scales for speed: O1 per-token and dynamic, O2 per-tensor ' +
                'and dynamic, O3 per-tensor and static — Δ fixed once from calibration data.',
            kind: 'values',
            data: {
                frame: 'q-smoothed',
                view: 'ledger',
                ledger: 4,
                values: [
                    { label: 'per-tensor W8A8', value: `worst ${pct(perTensor.worst)}` },
                    { label: 'per-token activations', value: `worst ${pct(perToken.worst)}` },
                    { label: 'per-channel (not GEMM-friendly)', value: `worst ${pct(perChannel.worst)}` },
                    { label: `SmoothQuant α = ${alphaLabel}, per-tensor`, value: `worst ${pct(smoothed.worst)}` },
                ],
            },
        },
        {
            id: 'scale',
            act: 'result',
            title: 'At 530 billion parameters',
            provenance: 'paper',
            sourceRefs: [
                { key: 'XIAO2023', detail: 'abstract; §5' },
                { key: 'SQCODE', detail: 'README' },
            ],
            explanation:
                'The paper runs W8A8 on OPT-175B, BLOOM-176B, GLM-130B and MT-NLG 530B with negligible ' +
                'loss in accuracy, reports up to 1.56× faster inference and 2× less memory than FP16, ' +
                'and serves the 530B model within a single node. Where weight-only methods shrink the ' +
                'bytes read per token, SmoothQuant makes the arithmetic itself integer — which is what ' +
                'speeds up the compute-bound work of reading a long prompt.',
            caveat: {
                provenance: 'pedagogical',
                text:
                    `This layer has ${CHANNELS} channels, two of them outliers by construction, and the page ` +
                    'scores each channel’s contribution rather than the summed output: with eight channels ' +
                    'the two loud ones dominate any sum and hide what happens to the other six. Real layers ' +
                    'have thousands of channels, and the paper judges the method by model accuracy.',
                sourceRefs: [{ key: 'XIAO2023', detail: '§5' }],
            },
            kind: 'values',
            data: {
                frame: 'q-smoothed',
                view: 'ledger',
                ledger: 4,
                values: [
                    { label: 'largest model', value: 'MT-NLG 530B, one node' },
                    { label: 'speedup vs FP16', value: 'up to 1.56×' },
                    { label: 'memory vs FP16', value: '2× less' },
                ],
            },
        },
    ];

    const shown = (M) => M.slice(0, SHOWN_TOKENS);
    return {
        steps,
        artifacts: {
            ...run,
            alphaIndex,
            shown: {
                X: shown(run.X),
                tensor: shown(perTensor.Xq),
                token: shown(perToken.Xq),
                channel: shown(perChannel.Xq),
                smoothed: shown(smoothed.Xs),
                smoothedQ: shown(smoothed.Xq),
            },
        },
    };
}
