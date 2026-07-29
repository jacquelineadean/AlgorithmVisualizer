// Builds the least-squares trace: a cloud of points, a line the user can
// push around, the normal equations that pick the best one, and the
// orthogonality that makes "best" mean "projection".

import { getDataset, leastSquares, makePoints, orthogonality, sumSquares } from './model';

const fixed = (value, digits = 3) => Number(value).toFixed(digits);

export function buildRegressionTrace({ datasetId, n, seed, trialSlope, trialIntercept }) {
    if (!Number.isInteger(n) || n < 4 || n > 200) {
        throw new Error('Use between 4 and 200 observations.');
    }
    const dataset = getDataset(datasetId);
    const points = makePoints({ datasetId, n, seed });
    const fit = leastSquares(points);
    const trial = {
        slope: Number.isFinite(trialSlope) ? trialSlope : fit.slope + 0.9,
        intercept: Number.isFinite(trialIntercept) ? trialIntercept : fit.intercept - 1.6,
    };
    const trialSse = sumSquares(points, trial.slope, trial.intercept);
    const ortho = orthogonality(points, fit.slope, fit.intercept);
    const trialOrtho = orthogonality(points, trial.slope, trial.intercept);

    const steps = [
        {
            id: 'the-data',
            title: `${points.length} observations, one suspected line`,
            provenance: 'paper',
            sourceRefs: [{ key: 'LEGENDRE1805' }],
            explanation:
                `${dataset.label}. ${dataset.note} Legendre's 1805 appendix posed exactly this ` +
                'problem for comet orbits: more equations than unknowns, no line through them ' +
                'all, and a need for a principled answer rather than a draughtsman’s eye.',
            kind: 'values',
            data: {
                view: 'data',
                values: [
                    { label: 'observations', value: points.length },
                    { label: 'x̄', value: fixed(fit.meanX, 2) },
                    { label: 'ȳ', value: fixed(fit.meanY, 2) },
                ],
            },
        },
        {
            id: 'a-line-and-its-misses',
            title: 'Any line leaves residuals',
            provenance: 'paper',
            sourceRefs: [{ key: 'LEGENDRE1805' }],
            explanation:
                `Drag the trial line with the sliders. Each vertical stick is a residual — how ` +
                `far that observation sits from the line. Legendre's rule: add up their ` +
                `squares and make the total as small as possible. This line scores ` +
                `${fixed(trialSse, 1)}; squaring is what makes one big miss cost more than ` +
                'several small ones.',
            kind: 'formula',
            data: {
                view: 'trial',
                lines: [
                    { tex: 'S(a, b) = \\sum_{i=1}^{n} \\big(y_i - (a + b x_i)\\big)^2' },
                    `trial line: y = ${fixed(trial.intercept, 2)} + ${fixed(trial.slope, 2)}·x`,
                    `S(trial) = ${fixed(trialSse, 1)}`,
                ],
            },
        },
        {
            id: 'normal-equations',
            title: 'Set both derivatives to zero',
            provenance: 'theorem',
            sourceRefs: [
                { key: 'LEGENDRE1805' },
                { key: 'STRANG2016', detail: '§4.3' },
            ],
            explanation:
                'S is a quadratic bowl in the two unknowns, so its minimum is where both ' +
                'partial derivatives vanish. Those two equations are the normal equations, and ' +
                'they are linear — which is why least squares has a closed form while almost ' +
                'no other fitting criterion does.',
            kind: 'formula',
            data: {
                view: 'trial',
                caption: 'In matrix form, with X = [1  x]:',
                lines: [
                    { tex: 'X^{\\!\\top} X \\hat{\\beta} = X^{\\!\\top} y \\quad\\Longrightarrow\\quad \\hat{\\beta} = (X^{\\!\\top} X)^{-1} X^{\\!\\top} y' },
                    { tex: '\\hat{b} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2}, \\qquad \\hat{a} = \\bar{y} - \\hat{b}\\,\\bar{x}' },
                    `Sxy = ${fixed(fit.sxy, 2)},  Sxx = ${fixed(fit.sxx, 2)}`,
                ],
            },
        },
        {
            id: 'solution',
            title: 'The best line, and nothing beats it',
            provenance: 'paper',
            sourceRefs: [{ key: 'LEGENDRE1805' }, { key: 'GAUSS1809', detail: '§177' }],
            explanation:
                `ŷ = ${fixed(fit.intercept, 2)} + ${fixed(fit.slope, 2)}·x, with squared error ` +
                `${fixed(fit.sse, 1)} against the trial line's ${fixed(trialSse, 1)}. It passes ` +
                `through (x̄, ȳ) = (${fixed(fit.meanX, 2)}, ${fixed(fit.meanY, 2)}) — every ` +
                `least-squares line does — and explains ${fixed(fit.r2 * 100, 1)}% of the ` +
                'variance in y.',
            kind: 'values',
            data: {
                view: 'both',
                values: [
                    { label: 'slope b̂', value: fixed(fit.slope) },
                    { label: 'intercept â', value: fixed(fit.intercept) },
                    { label: 'SSE', value: fixed(fit.sse, 1) },
                    { label: 'R²', value: fixed(fit.r2) },
                ],
            },
        },
        {
            id: 'projection',
            title: 'Why it is a projection',
            provenance: 'theorem',
            sourceRefs: [{ key: 'STRANG2016', detail: '§4.2' }],
            explanation:
                'The n observations are one vector y in n-dimensional space. Every line you ' +
                'could draw lives in the plane spanned by the two columns of X — a 2-D slice ' +
                'of that space. Least squares picks the point of the plane closest to y, which ' +
                'is the perpendicular drop: the residual vector is orthogonal to both columns. ' +
                `Check it — at the fit both inner products are zero (${fixed(
                    ortho.dotOnes,
                    6
                )} and ${fixed(ortho.dotX, 6)}), while the trial line leaves ${fixed(
                    trialOrtho.dotX,
                    2
                )} on the table.`,
            kind: 'formula',
            data: {
                view: 'both',
                caption: 'The residual is perpendicular to the column space:',
                lines: [
                    { tex: 'X^{\\!\\top}(y - X\\hat{\\beta}) = 0 \\quad\\Longleftrightarrow\\quad \\hat{y} = X(X^{\\!\\top}X)^{-1}X^{\\!\\top} y = Hy' },
                    `1ᵀr = ${fixed(ortho.dotOnes, 6)}   (residuals sum to zero)`,
                    `xᵀr = ${fixed(ortho.dotX, 6)}   (residuals are uncorrelated with x)`,
                ],
                result: 'H is the projection onto the column space of X — idempotent, symmetric',
            },
        },
        {
            id: 'gauss',
            title: 'What Gauss added',
            provenance: 'paper',
            sourceRefs: [
                { key: 'GAUSS1809', detail: '§§175–179' },
                { key: 'STIGLER1981' },
            ],
            explanation:
                'Legendre gave the recipe; Gauss gave the reason. In 1809 he showed that if ' +
                'errors are independent with equal variance, least squares is the best linear ' +
                'unbiased estimator — and he claimed to have used the method since 1795, which ' +
                'started one of the sharpest priority disputes in mathematics. Stigler’s ' +
                'reading of the evidence: Gauss almost certainly did use it, and Legendre ' +
                'certainly published it first.',
            caveat: {
                provenance: 'pedagogical',
                text: 'Squared error is a choice, not a law. It follows from Gaussian errors and it makes the algebra linear — but it also means one distant point can pull the line further than a hundred close ones. Try the high-leverage preset, then read the same data as a robust regression would.',
                sourceRefs: [{ key: 'STIGLER1981' }, { key: 'STRANG2016', detail: '§4.3' }],
            },
            kind: 'values',
            data: {
                view: 'both',
                values: [
                    { label: 'published', value: 'Legendre 1805' },
                    { label: 'justified', value: 'Gauss 1809' },
                    { label: 'optimality', value: 'BLUE under equal-variance errors' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { points, fit, trial, trialSse, ortho, dataset },
    };
}
