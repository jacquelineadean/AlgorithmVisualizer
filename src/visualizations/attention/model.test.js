import { describe, expect, it } from 'vitest';
import {
    D_K,
    SENTENCES,
    argmaxRow,
    attentionHead,
    getSentence,
    matmul,
    softmaxRows,
    spread,
    transpose,
} from './model';
import { buildAttentionTrace } from './trace';

describe('linear algebra helpers', () => {
    it('multiplies and transposes', () => {
        expect(
            matmul(
                [
                    [1, 2],
                    [3, 4],
                ],
                [
                    [5, 6],
                    [7, 8],
                ]
            )
        ).toEqual([
            [19, 22],
            [43, 50],
        ]);
        expect(transpose([[1, 2, 3]])).toEqual([[1], [2], [3]]);
    });
});

describe('softmax', () => {
    it('produces rows that sum to one', () => {
        const rows = softmaxRows([
            [1, 2, 3],
            [0, 0, 0],
        ]);
        for (const row of rows) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        expect(rows[1]).toEqual([1 / 3, 1 / 3, 1 / 3]);
    });

    it('is shift-invariant, which is what makes it numerically stable', () => {
        const base = softmaxRows([[1, 2, 3]])[0];
        const shifted = softmaxRows([[1001, 1002, 1003]])[0];
        base.forEach((value, i) => expect(shifted[i]).toBeCloseTo(value, 12));
    });

    it('zeroes everything above the diagonal when masked', () => {
        const weights = softmaxRows(
            [
                [1, 1, 1],
                [1, 1, 1],
                [1, 1, 1],
            ],
            { causal: true }
        );
        expect(weights[0]).toEqual([1, 0, 0]);
        expect(weights[1][2]).toBe(0);
        expect(weights[2].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    });
});

describe('attention head', () => {
    it('keeps every attention row a probability distribution', () => {
        for (const sentence of SENTENCES) {
            for (const causal of [false, true]) {
                const head = attentionHead({ embeddings: sentence.embeddings, causal });
                for (const row of head.weights) {
                    expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
                    expect(Math.min(...row)).toBeGreaterThanOrEqual(0);
                }
            }
        }
    });

    it('scales the raw scores by exactly √dₖ', () => {
        const { embeddings } = getSentence('animal');
        const scaled = attentionHead({ embeddings });
        const unscaled = attentionHead({ embeddings, scale: false });
        scaled.scores.forEach((row, i) =>
            row.forEach((value, j) =>
                expect(value).toBeCloseTo(unscaled.scores[i][j] / Math.sqrt(D_K), 12)
            )
        );
        expect(spread(scaled.scores)).toBeLessThan(spread(unscaled.scores));
    });

    it('resolves "it" to the animate noun — the head the example is built to show', () => {
        const sentence = getSentence('animal');
        const head = attentionHead({ embeddings: sentence.embeddings });
        const itRow = sentence.tokens.indexOf('it');
        expect(sentence.tokens[argmaxRow(head.weights[itRow])]).toBe('animal');
    });

    it('produces an output that is a convex combination of the value rows', () => {
        const sentence = getSentence('river');
        const head = attentionHead({ embeddings: sentence.embeddings });
        head.output.forEach((row, i) => {
            row.forEach((value, d) => {
                const manual = head.weights[i].reduce(
                    (sum, weight, j) => sum + weight * head.V[j][d],
                    0
                );
                expect(value).toBeCloseTo(manual, 12);
                const column = head.V.map((vRow) => vRow[d]);
                expect(value).toBeGreaterThanOrEqual(Math.min(...column) - 1e-12);
                expect(value).toBeLessThanOrEqual(Math.max(...column) + 1e-12);
            });
        });
    });
});

describe('buildAttentionTrace', () => {
    it('walks the head end to end and validates the query index', () => {
        const { steps } = buildAttentionTrace({ sentenceId: 'animal', causal: false, focusRow: 3 });
        expect(steps.map((step) => step.id)).toEqual([
            'tokens',
            'qkv',
            'scores',
            'scale',
            'softmax',
            'mix',
            'causal',
            'heads',
        ]);
        expect(() =>
            buildAttentionTrace({ sentenceId: 'animal', causal: false, focusRow: 9 })
        ).toThrow(/query token/);
    });

    it('changes the mask step’s title with the mask', () => {
        const masked = buildAttentionTrace({ sentenceId: 'animal', causal: true, focusRow: 3 });
        expect(masked.steps.find((step) => step.id === 'causal').title).toMatch(/Masked/);
    });
});
