// Pure model for one attention head. Everything is fixed and small: four
// tokens, four-dimensional embeddings, and hand-set projection matrices
// chosen so the resulting weights are legible ("it" attends to the noun it
// refers to). No training, no randomness — the arithmetic is the lesson.

export const SENTENCES = [
    {
        id: 'animal',
        tokens: ['The', 'animal', 'crossed', 'it'],
        note: 'Which noun does “it” point at? A head that resolves reference puts its weight there.',
        // Semantic slots: [animacy, motion, determiner, reference]
        embeddings: [
            [0.1, 0.0, 1.0, 0.0], // The
            [1.0, 0.2, 0.1, 0.0], // animal
            [0.1, 1.0, 0.0, 0.0], // crossed
            [0.2, 0.1, 0.1, 1.0], // it
        ],
    },
    {
        id: 'river',
        tokens: ['The', 'river', 'was', 'wide'],
        note: 'A predicative sentence: “wide” leans on the subject it describes.',
        embeddings: [
            [0.1, 0.0, 1.0, 0.0],
            [0.9, 0.1, 0.1, 0.2],
            [0.0, 0.3, 0.2, 0.4],
            [0.3, 0.0, 0.0, 0.9],
        ],
    },
];

export const getSentence = (id) => SENTENCES.find((item) => item.id === id) ?? SENTENCES[0];

// Projections into a 3-dimensional head space. Q asks "what am I looking
// for", K advertises "what I am", V carries "what I would contribute".
export const WQ = [
    [0.2, 0.1, 0.0],
    [0.1, 0.6, 0.1],
    [0.0, 0.0, 0.2],
    [1.1, 0.2, 0.3],
];
export const WK = [
    [1.0, 0.1, 0.1],
    [0.2, 0.9, 0.2],
    [0.1, 0.1, 0.8],
    [0.1, 0.2, 0.2],
];
export const WV = [
    [0.4, 0.0, 0.2],
    [0.9, 0.3, 0.1],
    [0.1, 0.8, 0.2],
    [0.2, 0.1, 0.7],
];

export const D_K = WK[0].length;

export const matmul = (A, B) =>
    A.map((row) => B[0].map((_, j) => row.reduce((sum, value, k) => sum + value * B[k][j], 0)));

export const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));

// Numerically stable softmax over each row, with optional causal masking.
export function softmaxRows(matrix, { causal = false } = {}) {
    return matrix.map((row, i) => {
        const masked = row.map((value, j) => (causal && j > i ? -Infinity : value));
        const peak = Math.max(...masked);
        const exps = masked.map((value) => (value === -Infinity ? 0 : Math.exp(value - peak)));
        const total = exps.reduce((a, b) => a + b, 0);
        return exps.map((value) => value / total);
    });
}

// The whole head: Q, K, V, scaled scores, weights, and the output rows.
export function attentionHead({ embeddings, causal = false, scale = true, temperature = 1 }) {
    const Q = matmul(embeddings, WQ);
    const K = matmul(embeddings, WK);
    const V = matmul(embeddings, WV);
    const raw = matmul(Q, transpose(K));
    const denominator = (scale ? Math.sqrt(D_K) : 1) * temperature;
    const scores = raw.map((row) => row.map((value) => value / denominator));
    const weights = softmaxRows(scores, { causal });
    const output = matmul(weights, V);
    return { Q, K, V, raw, scores, weights, output, denominator };
}

// Where each token puts most of its attention — the one-line summary.
export const argmaxRow = (row) => row.indexOf(Math.max(...row));

// Variance of the raw scores, which is the argument for dividing by √dₖ:
// without it the logits grow with dimension and softmax saturates.
export const spread = (matrix) => {
    const values = matrix.flat();
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};
