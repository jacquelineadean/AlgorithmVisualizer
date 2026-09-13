// Pure model for least squares: seeded datasets, the normal-equation
// solution, and the orthogonality identities that make the fit a projection.

import { mulberry32 } from '../mathlib/random';

export const DATASETS = [
    {
        id: 'linear',
        label: 'Linear with noise',
        note: 'The textbook case: a straight relationship blurred by measurement error.',
        slope: 1.5,
        intercept: 2,
        noise: 1.6,
        outlier: null,
    },
    {
        id: 'weak',
        label: 'Weak relationship',
        note: 'Same line, far more noise — the fit is still unbiased, just less certain.',
        slope: 0.7,
        intercept: 4,
        noise: 3.4,
        outlier: null,
    },
    {
        id: 'outlier',
        label: 'One high-leverage point',
        note: 'A single far-out observation drags the whole line: squared error punishes distance quadratically.',
        slope: 1.5,
        intercept: 2,
        noise: 1.2,
        outlier: { x: 9.4, y: 2 },
    },
    {
        id: 'curved',
        label: 'Curved (model misspecified)',
        note: 'The truth bends; a straight line is the best *line*, which is not the same as a good model.',
        slope: 0,
        intercept: 0,
        noise: 1.1,
        curve: 0.42,
        outlier: null,
    },
];

export const getDataset = (id) => DATASETS.find((set) => set.id === id) ?? DATASETS[0];

export function makePoints({ datasetId, n, seed }) {
    const set = getDataset(datasetId);
    const rand = mulberry32(seed);
    const points = [];
    for (let i = 0; i < n; i++) {
        const x = 0.5 + (9 * i) / Math.max(1, n - 1);
        // Box–Muller for symmetric noise, so residuals are not skewed.
        const u = Math.max(rand(), 1e-9);
        const noise = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
        const base = set.curve
            ? set.curve * (x - 1) * (x - 1) + 1.5
            : set.intercept + set.slope * x;
        points.push({ x, y: base + noise * set.noise });
    }
    if (set.outlier) points.push({ ...set.outlier, flagged: true });
    return points;
}

export const sumSquares = (points, slope, intercept) =>
    points.reduce((sum, point) => sum + (point.y - (intercept + slope * point.x)) ** 2, 0);

// Ordinary least squares through the normal equations for X = [1  x].
export function leastSquares(points) {
    const n = points.length;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
    const sxx = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    const sxy = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
    const slope = sxx === 0 ? 0 : sxy / sxx;
    const intercept = meanY - slope * meanX;
    const sse = sumSquares(points, slope, intercept);
    const sst = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
    return {
        slope,
        intercept,
        sse,
        sst,
        r2: sst === 0 ? 1 : 1 - sse / sst,
        meanX,
        meanY,
        sxx,
        sxy,
        n,
    };
}

export const residuals = (points, slope, intercept) =>
    points.map((point) => ({ ...point, fit: intercept + slope * point.x, r: point.y - (intercept + slope * point.x) }));

// The two normal equations, restated as orthogonality: the residual vector
// is perpendicular to both columns of the design matrix. Both sums are zero
// at the optimum — that *is* the projection.
export function orthogonality(points, slope, intercept) {
    const rows = residuals(points, slope, intercept);
    return {
        dotOnes: rows.reduce((sum, row) => sum + row.r, 0),
        dotX: rows.reduce((sum, row) => sum + row.r * row.x, 0),
    };
}
