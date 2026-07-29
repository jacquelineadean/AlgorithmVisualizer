// Pure model for Lloyd's algorithm: seeded point clouds, both initializers,
// and the assign/update loop recorded iteration by iteration so the stage
// can replay it without ever running the algorithm itself.

import { mulberry32 } from '../mathlib/random';

export const DATASETS = [
    {
        id: 'blobs',
        label: 'Three clear blobs',
        note: 'Well-separated clusters — Lloyd’s algorithm finds them from almost any start.',
        centers: [
            [2.2, 7.4],
            [7.6, 7.0],
            [4.8, 2.4],
        ],
        spread: 0.85,
    },
    {
        id: 'touching',
        label: 'Two blobs that touch',
        note: 'Overlapping clouds: the boundary lands somewhere defensible but arbitrary.',
        centers: [
            [3.6, 5.2],
            [6.2, 5.6],
        ],
        spread: 1.35,
    },
    {
        id: 'elongated',
        label: 'Elongated (k-means’ blind spot)',
        note: 'Squared Euclidean distance wants round clusters; these are stripes, and it cuts them across.',
        centers: [
            [3, 3],
            [3, 7],
        ],
        spread: 0.6,
        stretch: 3.2,
    },
    {
        id: 'uniform',
        label: 'No structure at all',
        note: 'A uniform cloud has no clusters — k-means will still return k of them, confidently.',
        centers: [[5, 5]],
        spread: 2.6,
        uniform: true,
    },
];

export const getDataset = (id) => DATASETS.find((set) => set.id === id) ?? DATASETS[0];

const gaussian = (rand) => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};

export function makePoints({ datasetId, n, seed }) {
    const set = getDataset(datasetId);
    const rand = mulberry32(seed);
    const points = [];
    for (let i = 0; i < n; i++) {
        const center = set.centers[i % set.centers.length];
        if (set.uniform) {
            points.push({ x: 0.6 + rand() * 8.8, y: 0.6 + rand() * 8.8 });
        } else {
            points.push({
                x: center[0] + gaussian(rand) * set.spread * (set.stretch ?? 1),
                y: center[1] + gaussian(rand) * set.spread,
            });
        }
    }
    return points;
}

const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Random initialization: k distinct observations (Forgy's rule).
function initRandom(points, k, rand) {
    const chosen = new Set();
    while (chosen.size < k) chosen.add(Math.floor(rand() * points.length));
    return [...chosen].map((index) => ({ ...points[index] }));
}

// k-means++: each new centre is drawn with probability proportional to its
// squared distance from the nearest centre already chosen.
function initPlusPlus(points, k, rand) {
    const centroids = [{ ...points[Math.floor(rand() * points.length)] }];
    while (centroids.length < k) {
        const weights = points.map((point) =>
            Math.min(...centroids.map((centroid) => dist2(point, centroid)))
        );
        const total = weights.reduce((a, b) => a + b, 0);
        let target = rand() * total;
        let index = 0;
        while (index < points.length - 1 && (target -= weights[index]) > 0) index += 1;
        centroids.push({ ...points[index] });
    }
    return centroids;
}

export const assign = (points, centroids) =>
    points.map((point) => {
        let best = 0;
        let bestDistance = Infinity;
        centroids.forEach((centroid, index) => {
            const d = dist2(point, centroid);
            if (d < bestDistance) {
                bestDistance = d;
                best = index;
            }
        });
        return best;
    });

// Empty clusters keep their old centre rather than collapsing to NaN —
// the standard guard, and worth showing rather than hiding.
export function update(points, labels, centroids) {
    return centroids.map((centroid, index) => {
        const members = points.filter((_, i) => labels[i] === index);
        if (members.length === 0) return { ...centroid, empty: true };
        return {
            x: members.reduce((sum, point) => sum + point.x, 0) / members.length,
            y: members.reduce((sum, point) => sum + point.y, 0) / members.length,
        };
    });
}

// Within-cluster sum of squares — the quantity Lloyd's algorithm is
// guaranteed to decrease at every half-step.
export const inertia = (points, labels, centroids) =>
    points.reduce((sum, point, i) => sum + dist2(point, centroids[labels[i]]), 0);

export function kmeansRun({ points, k, seed, init = 'plusplus', maxIterations = 20 }) {
    const rand = mulberry32(seed);
    const start = init === 'random' ? initRandom(points, k, rand) : initPlusPlus(points, k, rand);
    const iterations = [];
    let centroids = start;
    let labels = assign(points, centroids);
    iterations.push({
        centroids,
        labels,
        inertia: inertia(points, labels, centroids),
        moved: Infinity,
    });
    for (let step = 0; step < maxIterations; step++) {
        const nextCentroids = update(points, labels, centroids);
        const nextLabels = assign(points, nextCentroids);
        const moved = Math.max(
            ...nextCentroids.map((centroid, i) => Math.sqrt(dist2(centroid, centroids[i])))
        );
        const changed = nextLabels.filter((label, i) => label !== labels[i]).length;
        centroids = nextCentroids;
        labels = nextLabels;
        iterations.push({
            centroids,
            labels,
            inertia: inertia(points, labels, centroids),
            moved,
            changed,
        });
        if (changed === 0 && moved < 1e-9) break;
    }
    return {
        iterations,
        converged: iterations.at(-1).changed === 0,
        start,
        final: iterations.at(-1),
    };
}
