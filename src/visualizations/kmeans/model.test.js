import { describe, expect, it } from 'vitest';
import { DATASETS, assign, inertia, kmeansRun, makePoints, update } from './model';
import { buildKmeansTrace } from './trace';

const run = (options) =>
    kmeansRun({ points: makePoints({ datasetId: 'blobs', n: 150, seed: 12 }), ...options });

describe('Lloyd’s algorithm', () => {
    it('never increases inertia — the guarantee the page claims', () => {
        for (const set of DATASETS) {
            for (const init of ['random', 'plusplus']) {
                const points = makePoints({ datasetId: set.id, n: 120, seed: 4 });
                const { iterations } = kmeansRun({ points, k: 3, seed: 4, init });
                for (let i = 1; i < iterations.length; i++) {
                    expect(iterations[i].inertia).toBeLessThanOrEqual(
                        iterations[i - 1].inertia + 1e-9
                    );
                }
            }
        }
    });

    it('terminates with a stable assignment', () => {
        const { iterations, converged } = run({ k: 3, seed: 12 });
        expect(converged).toBe(true);
        const last = iterations.at(-1);
        expect(assign(makePoints({ datasetId: 'blobs', n: 150, seed: 12 }), last.centroids)).toEqual(
            last.labels
        );
    });

    it('recovers the planted blobs from k-means++ seeding', () => {
        const points = makePoints({ datasetId: 'blobs', n: 180, seed: 7 });
        const { final } = kmeansRun({ points, k: 3, seed: 7, init: 'plusplus' });
        const centres = [...final.centroids].sort((a, b) => a.x - b.x);
        const planted = [...DATASETS[0].centers].sort((a, b) => a[0] - b[0]);
        centres.forEach((centre, i) => {
            expect(Math.hypot(centre.x - planted[i][0], centre.y - planted[i][1])).toBeLessThan(0.6);
        });
    });

    it('places each centre at the mean of its members', () => {
        const points = makePoints({ datasetId: 'touching', n: 90, seed: 2 });
        const { final } = kmeansRun({ points, k: 2, seed: 2 });
        const recomputed = update(points, final.labels, final.centroids);
        recomputed.forEach((centre, i) => {
            expect(centre.x).toBeCloseTo(final.centroids[i].x, 8);
            expect(centre.y).toBeCloseTo(final.centroids[i].y, 8);
        });
    });

    it('scores k-means++ no worse than random seeding on average', () => {
        let plus = 0;
        let random = 0;
        for (let seed = 1; seed <= 12; seed++) {
            const points = makePoints({ datasetId: 'blobs', n: 120, seed });
            plus += kmeansRun({ points, k: 3, seed, init: 'plusplus' }).final.inertia;
            random += kmeansRun({ points, k: 3, seed, init: 'random' }).final.inertia;
        }
        expect(plus).toBeLessThanOrEqual(random);
    });

    it('computes inertia as the within-cluster sum of squares', () => {
        const points = [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
        ];
        expect(inertia(points, [0, 0], [{ x: 1, y: 0 }])).toBeCloseTo(2, 12);
    });
});

describe('buildKmeansTrace', () => {
    it('streams one event per remaining iteration and validates k', () => {
        const { steps, artifacts } = buildKmeansTrace({
            datasetId: 'blobs',
            n: 120,
            k: 3,
            seed: 12,
            init: 'plusplus',
        });
        const streamed = steps.flatMap((step) => step.stream?.events ?? []);
        expect(streamed).toHaveLength(artifacts.run.iterations.length - 2);
        expect(() =>
            buildKmeansTrace({ datasetId: 'blobs', n: 120, k: 9, seed: 1, init: 'random' })
        ).toThrow(/k between/);
    });
});
