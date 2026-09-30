// Builds the AWQ trace: an uneven layer, the rounding baseline, the
// "which 1% to protect" experiment, the scaling trick that replaces mixed
// precision, the α search (streamed point by point), and the fold that makes
// the scales free at inference. Every number is computed by awq/model.js.

import { BITS, COLS, GROUP_SIZES, N_GRID, ROWS, S_TRIALS, SEEDS, TOKENS, errorShare, runAwq } from './model';
import { linear, median, scaleColumns } from '../quantization/model';

export const ACTS = [
    { id: 'problem', name: 'The problem' },
    { id: 'method', name: 'The method' },
    { id: 'result', name: 'The result' },
];

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const fixed = (value, digits = 2) => Number(value).toFixed(digits);
const ch = (j) => `c${j + 1}`;

export function buildAwqTrace({ seed = 1, bits = 3, groupSize = 4 } = {}) {
    if (!BITS.includes(bits)) throw new Error(`Pick ${BITS.join(' or ')} bits per weight.`);
    if (!GROUP_SIZES.includes(groupSize)) throw new Error(`Pick a group size of ${GROUP_SIZES.join(' or ')}.`);
    if (!SEEDS.includes(seed)) throw new Error(`Pick a layer between 1 and ${SEEDS.length}.`);

    const run = runAwq({ seed, bits, groupSize });
    const { errors, sX, byActivation: loud, byWeight: heavy, trials, search } = run;
    const levels = 2 ** bits;
    const others = sX.filter((_, j) => j !== loud);
    const loudness = sX[loud] / median(others);
    const shareRtn = errorShare(run.W, run.rtn, sX);
    const loudShare =
        shareRtn.reduce((sum, row) => sum + row[loud], 0) / shareRtn.flat().reduce((a, b) => a + b, 0);
    const trial2 = trials.find((trial) => trial.s === 2);
    const bestTrial = trials.reduce((a, b) => (b.error < a.error ? b : a));
    const best = search.best;
    const groupCount = COLS / groupSize;
    const gap = Math.max(
        ...linear(scaleColumns(run.X, best.s, { invert: true }), scaleColumns(run.W, best.s)).flatMap((row, i) =>
            row.map((value, j) => Math.abs(value - run.Y[i][j]))
        )
    );

    const steps = [
        {
            id: 'layer',
            act: 'problem',
            title: 'A layer whose inputs are uneven',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'LIN2024', detail: '§3.1' }],
            explanation:
                `A linear layer with ${ROWS} output rows and ${COLS} input channels, and ${TOKENS} ` +
                'calibration tokens. The weights look unremarkable, but the inputs do not: channel ' +
                `${ch(loud)} averages |x| = ${fixed(sX[loud])}, ${fixed(loudness, 1)}× the typical channel. ` +
                'Large language models are full of such channels. The weights that multiply them matter ' +
                'more than the rest — an error there is amplified by every token that passes through.',
            kind: 'values',
            data: {
                frame: 'original',
                view: 'ledger',
                ledger: 0,
                bars: 'act',
                values: [
                    { label: 'weights', value: `${ROWS} × ${COLS}` },
                    { label: 'calibration tokens', value: TOKENS },
                    { label: `loudest channel`, value: `${ch(loud)}: mean |x| ${fixed(sX[loud])}` },
                    { label: 'typical channel', value: `mean |x| ${fixed(median(others))}` },
                ],
            },
        },
        {
            id: 'rtn',
            act: 'problem',
            title: `Round to nearest, ${groupSize} channels per group`,
            provenance: 'modern',
            sourceRefs: [
                { key: 'JACOB2018', detail: '§2.1' },
                { key: 'AWQCODE', detail: 'quantizer.py, pseudo_quantize_tensor()' },
                { key: 'LIN2024', detail: '§5' },
            ],
            explanation:
                `Each row is cut into groups of ${groupSize} input channels (${groupCount} per row), and each ` +
                `group gets its own ${levels}-level grid with a zero-point — INT${bits}, the way AWQ’s ` +
                'reference code stores weights (real deployments use groups of 128). Rounding every weight ' +
                `to its group’s nearest level leaves the output ${pct(errors.rtn)} off. The cell tint shows ` +
                'where that comes from: each weight’s rounding error times how loud its channel is. Channel ' +
                `${ch(loud)}’s weights carry ${pct(loudShare)} of it.`,
            kind: 'formula',
            data: {
                frame: 'rtn',
                view: 'ledger',
                ledger: 1,
                bars: 'act',
                lines: [
                    { tex: 'Q(w) = \\Delta\\,\\bigl(\\mathrm{clamp}(\\lfloor w/\\Delta \\rceil + z,\\; 0,\\; 2^b - 1) - z\\bigr)' },
                    `Δ = (max − min) / ${levels - 1} over each group of ${groupSize}`,
                ],
                result: `output error ${pct(errors.rtn)}`,
            },
        },
        {
            id: 'salient',
            act: 'problem',
            title: 'Keep one channel in FP16 — but which one?',
            provenance: 'paper',
            sourceRefs: [{ key: 'LIN2024', detail: '§3.1, Table 1' }],
            explanation:
                'The paper’s first observation: leaving a tiny fraction of weights unquantized — 0.1% to ' +
                '1% of channels — recovers most of the loss, if you pick the right ones. Picking by weight ' +
                `magnitude chooses ${ch(heavy)}, the channel with the largest weights; keeping it in FP16 ` +
                `moves the error from ${pct(errors.rtn)} to ${pct(errors.keepWeight)}. Picking by ` +
                `activation magnitude chooses ${ch(loud)}, and the error falls to ` +
                `${pct(errors.keepActivation)}. What makes a weight salient is the input it sees, not its ` +
                'own size — hence activation-aware.',
            kind: 'values',
            data: {
                frame: 'keep',
                view: 'ledger',
                ledger: 3,
                bars: 'both',
                values: [
                    { label: 'round everything', value: pct(errors.rtn) },
                    { label: `keep ${ch(heavy)} (largest weights)`, value: pct(errors.keepWeight) },
                    { label: `keep ${ch(loud)} (loudest inputs)`, value: pct(errors.keepActivation) },
                    { label: 'kept in FP16', value: `1 of ${COLS} channels` },
                ],
            },
        },
        {
            id: 'scale-instead',
            act: 'method',
            title: 'Mixed precision is awkward — scale instead',
            provenance: 'paper',
            sourceRefs: [
                { key: 'LIN2024', detail: '§3.2' },
                { key: 'DETTMERS2022', detail: '§3.2' },
            ],
            explanation:
                'Storing a few channels in FP16 among INT' +
                `${bits} ones makes kernels messy — LLM.int8() pays for exactly that with a separate ` +
                'FP16 matrix multiply for its outlier dimensions. AWQ finds an equivalent that keeps every ' +
                'weight quantized: multiply a salient weight by s > 1 and divide its input by s. The ' +
                'product is unchanged, but rounding error is roughly fixed in absolute size (up to Δ/2), ' +
                'so relative to the scaled-up weight it shrinks by about 1/s — provided the group’s step Δ ' +
                'barely changes, which holds when one weight among many is scaled.',
            kind: 'formula',
            data: {
                frame: 'keep',
                view: 'ledger',
                ledger: 3,
                bars: 'act',
                lines: [
                    { tex: 'Q(w \\cdot s)\\,\\frac{x}{s} \\;=\\; \\Delta\'\\,\\mathrm{Round}\\!\\Big(\\frac{w s}{\\Delta\'}\\Big)\\frac{x}{s}' },
                    { tex: '\\frac{\\text{error with } s}{\\text{error without}} \\;\\approx\\; \\frac{\\Delta\'}{\\Delta}\\cdot\\frac{1}{s}' },
                ],
            },
        },
        {
            id: 'trial',
            act: 'method',
            title: `Scale ${ch(loud)} alone by s = ${S_TRIALS.slice(1).join(', ')}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'LIN2024', detail: '§3.2, Table 2' }],
            explanation:
                (trial2.error < errors.rtn
                    ? `Doubling ${ch(loud)}’s weights (s = 2) cuts the error from ${pct(errors.rtn)} to ` +
                      `${pct(trial2.error)}. `
                    : `Here s = 2 does not help: ${pct(trial2.error)} against ${pct(errors.rtn)}. `) +
                'The table explains it. Scaling one weight up can make it its group’s new extreme, ' +
                'which stretches the group’s step Δ′ and coarsens the grid for every other weight in ' +
                `the group: at s = 2, Δ′ changed in ${pct(trial2.changed)} of the affected groups, by ` +
                `${fixed(trial2.meanRatio)}× on average. The paper measured the same trade-off on OPT-6.7B ` +
                'with groups of 128, where one weight rarely sets the extreme; in groups of ' +
                `${groupSize} it often does. The best single value here is s = ${bestTrial.s} ` +
                `(${pct(bestTrial.error)}).`,
            kind: 'values',
            data: {
                frame: 'scale2',
                view: 'trials',
                ledger: 3,
                bars: 'act',
                values: trials.map((trial) => ({
                    label: `s = ${trial.s}`,
                    value: `${pct(trial.error)} · Δ′/Δ ${fixed(trial.meanRatio)}`,
                })),
            },
        },
        {
            id: 'search',
            act: 'method',
            title: 'Search the scales: s = s_X^α',
            provenance: 'paper',
            sourceRefs: [
                { key: 'LIN2024', detail: '§3.2, “Searching to scale”' },
                { key: 'AWQCODE', detail: 'auto_scale.py, _search_module_scale()' },
            ],
            explanation:
                'Rather than hand-pick channels and a factor, scale every channel by its own average ' +
                'input magnitude raised to a power: s = s_X^α. α = 0 is plain rounding; α = 1 protects ' +
                'channels in proportion to their loudness and over-scales them. Rounding makes the loss ' +
                'non-differentiable, so the paper does not use gradients: it tries a grid of α and keeps ' +
                `the one with the lowest output error on the calibration set. The reference code tries ` +
                `${N_GRID} values, 0 to ${fixed((N_GRID - 1) / N_GRID)}. Here the best is ` +
                `α* = ${fixed(best.alpha)}, at ${pct(best.error)}.`,
            kind: 'formula',
            data: {
                frame: 'search',
                view: 'alpha',
                ledger: 4,
                bars: 'scale',
                lines: [
                    { tex: '\\mathbf{s} = \\mathbf{s_X}^{\\alpha}, \\qquad \\alpha^* = \\operatorname*{argmin}_{\\alpha}\\; \\bigl\\lVert Q(W\\,\\mathrm{diag}(\\mathbf{s}))\\,(\\mathrm{diag}(\\mathbf{s})^{-1} X) - WX \\bigr\\rVert' },
                    's_X: mean |x| per input channel · s normalized by √(max s · min s), as in the reference code',
                ],
                result: `α* = ${fixed(best.alpha)} → ${pct(best.error)}`,
            },
            stream: { events: search.history.map((point) => ({ alpha: point.alpha })), tick: 240 },
        },
        {
            id: 'fold',
            act: 'method',
            title: 'Fold 1/s into the layer before',
            provenance: 'paper',
            sourceRefs: [
                { key: 'LIN2024', detail: '§3.2' },
                { key: 'AWQCODE', detail: 'auto_scale.py, scale_ln_fcs()' },
            ],
            explanation:
                'The division of the input by s never runs at inference time. The channel scales are ' +
                'folded offline into whatever produces this layer’s input — a LayerNorm’s gain, or the ' +
                'previous linear layer’s weights — so the deployed layer is an ordinary INT' +
                `${bits} matrix multiply on Q(W·diag(s)). Mathematically nothing changed: the scaled ` +
                `layer reproduces the original outputs to within ${gap.toExponential(0)} before ` +
                `quantization. The loudest channel got s = ${fixed(best.s[loud])}; the quietest, ` +
                `${fixed(Math.min(...best.s))}.`,
            kind: 'values',
            data: {
                frame: 'awq',
                view: 'ledger',
                ledger: 4,
                bars: 'scale',
                values: best.s.map((value, j) => ({ label: `s for ${ch(j)}`, value: fixed(value) })),
            },
        },
        {
            id: 'result',
            act: 'result',
            title:
                errors.awq < errors.rtn
                    ? `AWQ ${pct(errors.awq)} vs RTN ${pct(errors.rtn)}`
                    : `AWQ = RTN here: ${pct(errors.awq)}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'LIN2024', detail: '§5' }],
            explanation:
                (errors.awq < errors.rtn
                    ? `Every weight in INT${bits}, no FP16 exceptions, and the output error falls from ` +
                      `${pct(errors.rtn)} to ${pct(errors.awq)} — ${fixed(errors.rtn / errors.awq, 1)}× less. `
                    : `Here the search picked α = 0 — plain rounding was already the best scaling on the ` +
                      `grid — so AWQ returns exactly the round-to-nearest weights (${pct(errors.awq)}). `) +
                `For comparison, keeping ${ch(loud)} entirely in FP16 gave ${pct(errors.keepActivation)}. ` +
                'Scaling is a softer protection than full precision, and it spreads over every channel, ' +
                'not just one. The ledger lays out the whole argument in one column.',
            kind: 'values',
            data: {
                frame: 'awq',
                view: 'ledger',
                ledger: 4,
                bars: 'scale',
                values: [
                    { label: 'round to nearest', value: pct(errors.rtn) },
                    { label: `FP16 ${ch(loud)} (mixed precision)`, value: pct(errors.keepActivation) },
                    { label: `AWQ, α* = ${fixed(best.alpha)}`, value: pct(errors.awq) },
                    { label: 'storage', value: `INT${bits} weights + one scale & zero per group` },
                ],
            },
        },
        {
            id: 'why',
            act: 'result',
            title: 'No backpropagation, no reconstruction',
            provenance: 'paper',
            sourceRefs: [
                { key: 'LIN2024', detail: '§1, §3.2, §4' },
                { key: 'FRANTAR2023' },
                { key: 'AWQCODE', detail: 'README' },
            ],
            explanation:
                'AWQ measures one statistic per channel and searches one number per layer. It never fits ' +
                'the weights to reproduce the calibration outputs, as GPTQ’s reconstruction does, which ' +
                'the paper argues makes it less prone to overfitting the calibration set: it needs less ' +
                'calibration data and carries over to instruction-tuned and multi-modal models. The ' +
                'paper pairs it with TinyChat, an inference engine whose kernels dequantize INT4 weights ' +
                'on the fly; the project reports Llama-3-8B running 2.7× faster than FP16 on an RTX 4090 ' +
                'and 2.9× on a Jetson Orin.',
            caveat: {
                provenance: 'pedagogical',
                text:
                    `One salient channel of ${COLS} is ${fixed(100 / COLS, 1)}% of the layer, where the paper ` +
                    'protects around 1%; groups here hold ' +
                    `${groupSize} weights, where deployments use 128. The reference code also follows the ` +
                    'scale search with a search over each group’s clipping range, and calibrates on ' +
                    'samples of the Pile rather than a handful of tokens.',
                sourceRefs: [{ key: 'AWQCODE', detail: 'auto_clip.py, pre_quant.py' }],
            },
            kind: 'values',
            data: {
                frame: 'awq',
                view: 'ledger',
                ledger: 4,
                bars: 'scale',
                values: [
                    { label: 'statistics needed', value: 'mean |x| per input channel' },
                    { label: 'parameters searched', value: `α, one per layer (${N_GRID} tries)` },
                    { label: 'gradients', value: 'none' },
                ],
            },
        },
    ];

    // Each frame's error shares, for the cell tints — on one scale across every
    // frame, so a cell that dims really did improve.
    const shareOf = (M) => errorShare(run.W, M, sX);
    const shares = {
        original: shareOf(run.W),
        rtn: shareRtn,
        keep: shareOf(run.keptByActivation),
        scale2: shareOf(trial2.Weff),
        awq: shareOf(run.awq),
        search: search.history.map((point) => shareOf(point.Weff)),
    };
    const shareMax = Math.max(1e-9, ...[shares.rtn, shares.keep, shares.scale2, shares.awq, ...shares.search].flat(2));

    return {
        steps,
        artifacts: { ...run, bits, groupSize, trial2, shares, shareMax },
    };
}
