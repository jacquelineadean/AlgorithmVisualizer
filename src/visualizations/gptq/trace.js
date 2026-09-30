// Builds the GPTQ trace: the layer-wise problem, the Optimal Brain Surgeon
// update it rests on, GPTQ's three changes to it, and the column sweep
// itself streamed frame by frame. Every number in the prose is computed by
// gptq/model.js from the current inputs.

import {
    BITS,
    BLOCK_SIZES,
    COLS,
    ROWS,
    SEEDS,
    TOKENS,
    costs,
    getPreset,
    runGptq,
    storageBytes,
    tailPasses,
} from './model';
import { gridLevels } from '../quantization/model';

export const ACTS = [
    { id: 'problem', name: 'The problem' },
    { id: 'algorithm', name: 'The algorithm' },
    { id: 'result', name: 'The result' },
];

// OPT-175B's model width — the paper's largest dense layers are this wide.
export const REAL_WIDTH = 12288;
export const REAL_BLOCK = 128;
export const REAL_PARAMS = 175e9;

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const fixed = (value, digits = 2) => Number(value).toFixed(digits);
const count = (value) => value.toLocaleString('en-US');

export function buildGptqTrace({ preset = 'correlated', seed = 1, bits = 3, blockSize = 4 } = {}) {
    if (!BITS.includes(bits)) throw new Error(`Pick ${BITS.join(', ')} bits per weight.`);
    if (!BLOCK_SIZES.includes(blockSize)) {
        throw new Error(`Pick a block size of ${BLOCK_SIZES.join(', ')} columns.`);
    }
    if (!SEEDS.includes(seed)) throw new Error(`Pick a layer between 1 and ${SEEDS.length}.`);

    const presetInfo = getPreset(preset);
    const run = runGptq({ preset: presetInfo.id, seed, bits, blockSize });
    const levels = 2 ** bits;

    // Strongest correlation between two input features: H_ij / √(H_ii H_jj).
    let correlation = 0;
    run.H.forEach((row, i) =>
        row.forEach((value, j) => {
            if (i !== j) correlation = Math.max(correlation, Math.abs(value) / Math.sqrt(row[i] * run.H[j][j]));
        })
    );

    // The first OBS update, row 1: where the weight went and how far the rest moved.
    const obsState = run.curveStates[1];
    const firstShift = Math.max(...obsState[0].slice(1).map((value, j) => Math.abs(value - run.W[0][j + 1])));
    const matchesSequential = Math.max(
        ...run.Q.flatMap((row, r) => row.map((value, j) => Math.abs(value - run.sequentialQ[r][j])))
    );
    const agreement = matchesSequential === 0 ? 'exactly' : `within ${matchesSequential.toExponential(0)}`;

    const small = costs(ROWS, COLS);
    const big = costs(REAL_WIDTH, REAL_WIDTH);
    const passes = tailPasses(COLS, blockSize);
    const flushes = run.frames.filter((frame) => frame.kind === 'flush').length;
    const ratio = run.rtnError / run.gptqError;
    const outcome =
        Math.abs(run.rtnError - run.gptqError) < 1e-12 ? 'tie' : run.gptqError < run.rtnError ? 'win' : 'loss';
    const grid0 = run.grids[0];
    const largestMove = (M) => Math.max(...M.flatMap((row, r) => row.map((value, j) => Math.abs(value - run.W[r][j]))));
    const rtnMove = largestMove(run.rtn);
    const gptqMove = largestMove(run.Q);

    const steps = [
        {
            id: 'layer',
            act: 'problem',
            title: 'A layer, and the inputs it sees',
            provenance: 'pedagogical',
            sourceRefs: [{ key: 'FRANTAR2023', detail: '§3, “Layer-Wise Quantization”' }],
            explanation:
                `A linear layer with ${ROWS} output rows and ${COLS} input columns — ${ROWS * COLS} weights — ` +
                `and ${TOKENS} calibration tokens passed through it. ${presetInfo.note} The job is to ` +
                `store every weight as one of ${levels} levels (${bits} bits) while changing what the layer ` +
                'outputs as little as possible. Real layers are thousands of columns wide; eight keep every ' +
                'number on the page readable.',
            kind: 'values',
            data: {
                view: 'ruler',
                frame: 'original',
                values: [
                    { label: 'weights', value: `${ROWS} × ${COLS}` },
                    { label: 'calibration tokens', value: TOKENS },
                    { label: 'bits per weight', value: `${bits} → ${levels} levels per row` },
                    { label: 'inputs', value: presetInfo.label },
                ],
            },
        },
        {
            id: 'objective',
            act: 'problem',
            title: 'Match the outputs, not the weights',
            provenance: 'paper',
            sourceRefs: [
                { key: 'FRANTAR2023', detail: '§3, eq. 1' },
                { key: 'NAGEL2020', detail: '§3' },
            ],
            explanation:
                'Rounding each weight to its nearest level minimizes how far each weight moves, but that ' +
                'is not what anyone cares about. What matters is the layer’s output on real inputs. GPTQ — ' +
                'like AdaRound before it — solves a layer-wise reconstruction problem: find weights on the ' +
                'grid whose outputs ŴX stay closest to WX on a small calibration set. A weight is then free ' +
                'to round the “wrong” way whenever its neighbours can make up for it.',
            kind: 'formula',
            data: {
                view: 'ruler',
                frame: 'original',
                lines: [
                    { tex: '\\operatorname*{argmin}_{\\widehat{W}} \\; \\lVert WX - \\widehat{W}X \\rVert_2^2' },
                    'X: calibration inputs (features × tokens) · Ŵ: weights restricted to the grid',
                ],
            },
        },
        {
            id: 'rtn',
            act: 'problem',
            title: 'Round to nearest: the baseline',
            provenance: 'modern',
            sourceRefs: [
                { key: 'JACOB2018', detail: '§2.1' },
                { key: 'GPTQCODE', detail: 'quant.py' },
            ],
            explanation:
                `Each row gets its own grid: ${levels} evenly spaced levels from the row’s minimum to its ` +
                `maximum, widened to include 0 and offset by an integer zero-point so that 0 stays exact. ` +
                'Rounding every weight to its nearest level, independently, is round-to-nearest (RTN) — ' +
                'the baseline every paper in this family reports against. The ruler shows each row’s ' +
                `levels as ticks and every weight snapped to one. It leaves the layer’s output ` +
                `${pct(run.rtnError)} off.`,
            kind: 'formula',
            data: {
                view: 'ruler',
                frame: 'rtn',
                lines: [
                    { tex: '\\hat w = s\\,\\bigl(\\mathrm{clamp}(\\lfloor w/s \\rceil + z,\\; 0,\\; 2^b - 1) - z\\bigr)' },
                    `row 1: scale s = ${fixed(grid0.scale, 3)}, zero-point z = ${grid0.zero}`,
                ],
                result: `output error ${pct(run.rtnError)}`,
            },
        },
        {
            id: 'hessian',
            act: 'problem',
            title: 'The error is a quadratic in H = 2XXᵀ',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'FRANTAR2023', detail: '§3, “Optimal Brain Quantization”' },
                { key: 'HASSIBI1992' },
            ],
            explanation:
                'The objective splits into one independent problem per row, and each is an exact ' +
                'quadratic: nudging a row’s weights by δ changes its output error by ½δHδᵀ, with ' +
                `H = 2XXᵀ. H depends only on the inputs — one ${COLS} × ${COLS} matrix shared by all ` +
                `${ROWS} rows. Its off-diagonal entries measure how much two input features move together, ` +
                'and that is the lever GPTQ pulls: an error in one weight can be cancelled by adjusting a ' +
                'weight whose input is correlated with it. ' +
                (correlation > 1e-9
                    ? `Here the most correlated pair of features has |ρ| = ${fixed(correlation)}.`
                    : 'Here every off-diagonal entry is exactly zero — no feature can stand in for another.'),
            kind: 'formula',
            data: {
                view: 'hessian',
                frame: 'original',
                lines: [
                    { tex: '\\lVert (w - \\hat w)X \\rVert^2 = \\tfrac12\\,(w - \\hat w)\\,H\\,(w - \\hat w)^{\\top}, \\qquad H = 2XX^{\\top}' },
                    `strongest feature correlation |ρ| = ${fixed(correlation)}`,
                ],
            },
        },
        {
            id: 'obs',
            act: 'algorithm',
            title: 'Quantize one weight, let the rest compensate',
            provenance: 'paper',
            sourceRefs: [
                { key: 'HASSIBI1992' },
                { key: 'FRANTAR2022', detail: '§4' },
                { key: 'FRANTAR2023', detail: '§3, eqs. 2–3' },
            ],
            explanation:
                'Optimal Brain Surgeon answered this in 1992 for pruning, and Optimal Brain Compression ' +
                'carried it over to rounding: when one weight is forced to a value, the best adjustment of ' +
                'every weight not yet quantized has a closed form in the inverse Hessian. Quantizing ' +
                `column 1 moves row 1’s first weight from ${fixed(run.W[0][0])} to ${fixed(obsState[0][0])}; ` +
                `the other ${COLS - 1} weights in that row shift by up to ${fixed(firstShift, 3)} to absorb ` +
                `the error. After this one column the output is ${pct(run.curve[1].gptq)} off — against ` +
                `${pct(run.curve[1].rtn)} had column 1 simply been rounded.`,
            kind: 'formula',
            data: {
                view: 'ruler',
                frame: 'obs',
                lines: [
                    { tex: '\\delta_F = -\\,\\frac{w_q - \\mathrm{quant}(w_q)}{[H_F^{-1}]_{qq}}\\,(H_F^{-1})_{:,q}' },
                    'q: the weight being quantized · F: the weights not yet quantized',
                ],
            },
        },
        {
            id: 'order',
            act: 'algorithm',
            title: 'Every row in the same order',
            provenance: 'paper',
            sourceRefs: [
                { key: 'FRANTAR2023', detail: '§4, Step 1 “Arbitrary Order Insight”' },
                { key: 'ZHANG2022', detail: 'Table 1' },
            ],
            explanation:
                'OBQ quantized each row greedily, always taking the weight whose rounding hurt least, so ' +
                'every row followed its own order and needed its own shrinking inverse Hessian. GPTQ ' +
                'observed that on large layers the greedy order barely beats an arbitrary one, and chose ' +
                'the simplest: every row, column by column, left to right. Then all rows share H⁻¹, ' +
                `updated once per column rather than once per weight. For this ${ROWS} × ${COLS} layer ` +
                `that is ${count(small.gptq)} operations instead of ${count(small.obq)} (${small.ratio}× ` +
                `fewer); at OPT-175B’s width of ${count(REAL_WIDTH)}, ${count(big.ratio)}× fewer.`,
            kind: 'values',
            data: {
                view: 'hessian',
                frame: 'obs',
                values: [
                    { label: 'OBQ: d_row · d_col³', value: count(small.obq) },
                    { label: 'GPTQ: max(d_row · d_col², d_col³)', value: count(small.gptq) },
                    { label: 'saving here', value: `${small.ratio}×` },
                    { label: `saving at ${count(REAL_WIDTH)} × ${count(REAL_WIDTH)}`, value: `${count(big.ratio)}×` },
                ],
            },
        },
        {
            id: 'sweep',
            act: 'algorithm',
            title: 'Sweep the columns',
            provenance: 'paper',
            sourceRefs: [
                { key: 'FRANTAR2023', detail: '§4, Algorithm 1' },
                { key: 'GPTQCODE', detail: 'gptq.py, fasterquant()' },
            ],
            explanation:
                'Column by column: round the column to each row’s grid, divide its error by the ' +
                'diagonal entry of the Cholesky factor, and subtract that error times the factor’s row ' +
                'from every column still to come. On the ruler, each weight snaps to a tick as its column ' +
                'comes up, while the weights to its right slide to cover the error. ' +
                (flushes === 0
                    ? 'With one block covering the whole layer, every update lands immediately.'
                    : `With blocks of ${blockSize}, columns inside the current block update at once and ` +
                      'the columns beyond it wait (faded) for one combined update at the block’s end — ' +
                      `${flushes} such update${flushes > 1 ? 's' : ''} here.`),
            kind: 'formula',
            data: {
                view: 'ruler',
                frame: 'stream',
                lines: [
                    { tex: 'e = \\bigl(W_{:,j} - Q_{:,j}\\bigr) / U_{jj}' },
                    { tex: 'W_{:,\\,j:} \\;\\mathrel{-}=\\; e \\cdot U_{j,\\,j:}' },
                    'U: upper Cholesky factor of H⁻¹',
                ],
            },
            stream: { events: run.frames.map((frame) => ({ kind: frame.kind, col: frame.col })), tick: 560 },
        },
        {
            id: 'lazy',
            act: 'algorithm',
            title: 'Lazy batches: same answer, fewer trips to memory',
            provenance: 'paper',
            sourceRefs: [{ key: 'FRANTAR2023', detail: '§4, Step 2 “Lazy Batch-Updates”' }],
            explanation:
                'Rewriting the whole remaining matrix after every column does almost no arithmetic per ' +
                'number read, so at scale the GPU waits on memory rather than computing. But column j’s ' +
                'rounding only depends on updates from columns before it, so updates to columns beyond ' +
                'the current block can be deferred and applied as one batched multiply when the block ' +
                `ends. The answer does not change: these weights match a one-column-at-a-time run ` +
                `${agreement}. ` +
                (blockSize === 1
                    ? `With B = 1 this run is that unbatched form: the columns past each one are rewritten ` +
                      `after every column, ${passes} times. Try a larger B. `
                    : `The columns past the block are rewritten ${passes} time${passes === 1 ? '' : 's'} ` +
                      `instead of ${COLS - 1}. `) +
                `With the default B = ${REAL_BLOCK} on a ${count(REAL_WIDTH)}-column layer, that is ` +
                `${count(tailPasses(REAL_WIDTH, REAL_BLOCK))} times instead of ${count(REAL_WIDTH - 1)}.`,
            kind: 'values',
            data: {
                view: 'ruler',
                frame: 'final',
                values: [
                    { label: 'block size B', value: `${blockSize} column${blockSize > 1 ? 's' : ''}` },
                    { label: 'tail rewrites', value: `${passes} (vs ${COLS - 1} unbatched)` },
                    { label: 'same weights as unbatched?', value: `yes — ${agreement}` },
                    {
                        label: `at ${count(REAL_WIDTH)} columns, B = ${REAL_BLOCK}`,
                        value: `${count(tailPasses(REAL_WIDTH, REAL_BLOCK))} vs ${count(REAL_WIDTH - 1)}`,
                    },
                ],
            },
        },
        {
            id: 'cholesky',
            act: 'algorithm',
            title: 'Cholesky: every row of H⁻¹ it will need, up front',
            provenance: 'paper',
            sourceRefs: [
                { key: 'FRANTAR2023', detail: '§4, Step 3 “Cholesky Reformulation”' },
                { key: 'GPTQCODE', detail: 'gptq.py, percdamp' },
            ],
            explanation:
                'Updating H⁻¹ by elimination over thousands of columns accumulates rounding error, and at ' +
                'billion-parameter scale that was enough to wreck the result. But the sweep only ever ' +
                'reads one row of the shrinking inverse — row j, when quantizing column j — and those rows ' +
                'are, up to a scale, exactly the rows of the upper Cholesky factor U of H⁻¹. So GPTQ ' +
                'computes U once, after adding a small dampening λ, 1% of H’s mean diagonal (here ' +
                `${fixed(run.damp, 3)}), to keep it well conditioned. This page runs both forms; they ` +
                `produce the same weights ${agreement}.`,
            kind: 'formula',
            data: {
                view: 'cholesky',
                frame: 'final',
                lines: [
                    { tex: 'H^{-1} = U^{\\top}U, \\qquad [H_F^{-1}]_{j,F} = U_{jj}\\,U_{j,F}' },
                    `λ = 0.01 · mean(diag H) = ${fixed(run.damp, 3)}`,
                ],
            },
        },
        {
            id: 'result',
            act: 'result',
            title:
                outcome === 'tie'
                    ? `GPTQ = RTN: ${pct(run.gptqError)} both ways`
                    : `GPTQ ${pct(run.gptqError)} vs RTN ${pct(run.rtnError)}`,
            provenance: 'paper',
            sourceRefs: [{ key: 'FRANTAR2023', detail: '§5' }],
            explanation:
                outcome === 'tie'
                    ? 'Identical, to the last bit. With H diagonal every compensation term is zero, and ' +
                      'GPTQ is round-to-nearest with extra steps. Its power comes entirely from ' +
                      'correlated inputs — which the activations inside real models always are.'
                    : outcome === 'win'
                    ? `GPTQ leaves the output ${pct(run.gptqError)} off where rounding left it ` +
                      `${pct(run.rtnError)} — ${fixed(ratio, 1)}× less error from the same grid, the ` +
                      'same bits, and the same storage. ' +
                      (gptqMove > rtnMove
                          ? `It gets there by moving weights further, not less: its largest move is ` +
                            `${fixed(gptqMove)} against rounding’s ${fixed(rtnMove)}. `
                          : '') +
                      'The curve shows where it strains: early on, the ' +
                      'compensated error stays low because many weights remain to absorb it, while the ' +
                      'last columns have almost nobody left and their error lands as it falls. In a real ' +
                      'layer those last columns are a vanishing fraction of thousands.'
                    : `Here GPTQ ends at ${pct(run.gptqError)} against rounding’s ${pct(run.rtnError)} — ` +
                      'it lost. That can happen: GPTQ is greedy, each step optimal only given the ones ' +
                      'before it, and on an eight-column layer the last columns have almost nobody left ' +
                      'to absorb their error (see the curve’s final jump). The paper’s argument is about ' +
                      'wide layers, where those columns are a vanishing fraction. Try another layer.',
            kind: 'values',
            data: {
                view: 'curve',
                frame: 'final',
                values: [
                    { label: 'round to nearest', value: pct(run.rtnError) },
                    { label: 'GPTQ', value: pct(run.gptqError) },
                    {
                        label: 'error ratio',
                        value: outcome === 'tie' ? '1.0× (identical)' : `${fixed(ratio, 2)}×`,
                    },
                    { label: 'storage', value: `${bits} bits per weight, both` },
                ],
            },
        },
        {
            id: 'scale',
            act: 'result',
            title: 'At 175 billion parameters',
            provenance: 'paper',
            sourceRefs: [
                { key: 'FRANTAR2023', detail: 'abstract; §5' },
                { key: 'GPTQCODE', detail: 'README' },
            ],
            explanation:
                'The paper quantizes OPT-175B and BLOOM-176B to 3 or 4 bits per weight in about four GPU ' +
                'hours, calibrated on 128 random 2,048-token segments of C4, with little loss in ' +
                'perplexity — enough to run a 175-billion-parameter model on a single GPU. Only weights are ' +
                'quantized; activations stay 16-bit, and kernels dequantize weights on the fly inside the ' +
                'matrix multiply. That pays off in generation, where each new token must read every ' +
                'weight from memory: the paper reports end-to-end inference about 3.25× faster than ' +
                `FP16 on an A100 and 4.5× on an A6000. At ${bits} bits the weights of a 175B model take ` +
                `${fixed(storageBytes(REAL_PARAMS, bits) / 1e9, 1)} GB instead of ` +
                `${fixed(storageBytes(REAL_PARAMS, 16) / 1e9, 0)} GB.`,
            caveat: {
                provenance: 'pedagogical',
                text:
                    `This layer has ${ROWS * COLS} weights and ${TOKENS} calibration tokens; a real one has ` +
                    'tens of millions of weights, blocks of 128 columns, and 128 × 2,048 calibration tokens. ' +
                    'Deployments usually also give each group of 128 weights its own grid, and often use ' +
                    '“act-order”, which quantizes columns in decreasing order of H’s diagonal — both are ' +
                    'options in the reference code.',
                sourceRefs: [{ key: 'GPTQCODE', detail: 'opt.py --groupsize, --act-order' }],
            },
            kind: 'values',
            data: {
                view: 'curve',
                frame: 'final',
                values: [
                    { label: 'FP16 weights, 175B', value: `${fixed(storageBytes(REAL_PARAMS, 16) / 1e9, 0)} GB` },
                    {
                        label: `${bits}-bit weights, 175B`,
                        value: `${fixed(storageBytes(REAL_PARAMS, bits) / 1e9, 1)} GB`,
                    },
                    { label: 'compression', value: `${fixed(16 / bits, 1)}×` },
                ],
            },
        },
    ];

    // Lanes on the ruler hold still across steps: each spans the row's grid
    // plus every position its weights occupy in any frame.
    const laneDomains = run.W.map((row, r) => {
        const seen = [
            ...row,
            ...gridLevels(run.grids[r]),
            ...run.frames.flatMap((frame) => frame.weights[r]),
            ...run.curveStates.flatMap((state) => state[r]),
        ];
        const lo = Math.min(...seen);
        const hi = Math.max(...seen);
        const pad = (hi - lo) * 0.04 || 0.1;
        return [lo - pad, hi + pad];
    });
    const allFrames = [run.W, run.rtn, obsState, run.Q, ...run.frames.map((frame) => frame.weights)];
    const deltaMax = Math.max(
        1e-9,
        ...allFrames.flatMap((M) => M.flatMap((row, r) => row.map((value, j) => Math.abs(value - run.W[r][j]))))
    );
    const weightMax = Math.max(...allFrames.flatMap((M) => M.flat().map(Math.abs)));

    return {
        steps,
        artifacts: {
            ...run,
            bits,
            blockSize,
            obsState,
            laneDomains,
            levels: run.grids.map(gridLevels),
            deltaMax,
            weightMax,
            outcome,
        },
    };
}
