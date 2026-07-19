import { describe, expect, it } from 'vitest';
import { helixGeometry } from './helix';
import { modPowSteps } from '../mathlib/modular';

// The Phase 3 verification discipline: geometry recomputed from the trace,
// never hand-placed. These assertions recompute positions from first
// principles and must match what the renderer draws.
describe('helixGeometry', () => {
    const work = modPowSteps(72n, 17n, 3233n);
    const { points, ring, radius, pitch } = helixGeometry({ rows: work.rows, mod: 3233n });

    it('derives one point per square-and-multiply row', () => {
        expect(points).toHaveLength(work.rows.length);
        for (const [i, point] of points.entries()) {
            expect(point.value).toBe(Number(work.rows[i].value));
        }
    });

    it('places every value at angle 2π·v/n on the circle of the given radius', () => {
        for (const point of points) {
            const angle = (point.value / 3233) * Math.PI * 2;
            expect(point.x).toBeCloseTo(radius * Math.cos(angle), 10);
            expect(point.z).toBeCloseTo(radius * Math.sin(angle), 10);
            expect(Math.hypot(point.x, point.z)).toBeCloseTo(radius, 10);
        }
    });

    it('climbs one pitch per iteration', () => {
        for (const [i, point] of points.entries()) {
            expect(point.y).toBeCloseTo(i * pitch, 10);
        }
    });

    it('closes the reference ring at height zero', () => {
        expect(ring[0]).toEqual(ring.at(-1));
        for (const [x, y, z] of ring) {
            expect(y).toBe(0);
            expect(Math.hypot(x, z)).toBeCloseTo(radius, 10);
        }
    });

    it('rejects a degenerate modulus', () => {
        expect(() => helixGeometry({ rows: [], mod: 0n })).toThrow(/positive/);
    });
});
