import { describe, expect, it } from 'vitest';
import { outcomes, quorumAvailable, quorumOverlaps, scenario } from './model';
import { buildCapTrace } from './trace';

describe('the scenario', () => {
    it('holds both properties when the network works', () => {
        for (const choiceId of ['cp', 'ap']) {
            const result = scenario({ choiceId, partitioned: false });
            expect(result.linearizable).toBe(true);
            expect(result.available).toBe(true);
            expect(result.readValue).toBe('v1');
        }
    });

    it('gives up availability under CP and consistency under AP', () => {
        const cp = scenario({ choiceId: 'cp', partitioned: true });
        expect(cp.linearizable).toBe(true);
        expect(cp.available).toBe(false);
        expect(cp.readAnswered).toBe(false);

        const ap = scenario({ choiceId: 'ap', partitioned: true });
        expect(ap.available).toBe(true);
        expect(ap.linearizable).toBe(false);
        expect(ap.readValue).toBe('v0'); // stale
    });

    it('never produces the forbidden cell: partitioned, consistent, and available', () => {
        for (const outcome of outcomes()) {
            if (!outcome.partitioned) continue;
            expect(outcome.linearizable && outcome.available).toBe(false);
        }
    });

    it('enumerates all four cases', () => {
        expect(outcomes()).toHaveLength(4);
        expect(outcomes().filter((outcome) => outcome.partitioned)).toHaveLength(2);
    });
});

describe('quorums', () => {
    it('overlaps exactly when R + W > N', () => {
        expect(quorumOverlaps(3, 2, 2)).toBe(true);
        expect(quorumOverlaps(3, 1, 3)).toBe(true);
        expect(quorumOverlaps(3, 1, 1)).toBe(false);
        expect(quorumOverlaps(5, 3, 2)).toBe(false);
        expect(quorumOverlaps(5, 3, 3)).toBe(true);
    });

    it('trades overlap for availability: smaller quorums survive smaller majorities', () => {
        // Two of five replicas reachable.
        expect(quorumAvailable(5, 1, 1, 2)).toBe(true);
        expect(quorumAvailable(5, 3, 3, 2)).toBe(false);
        expect(quorumOverlaps(5, 1, 1)).toBe(false);
        expect(quorumOverlaps(5, 3, 3)).toBe(true);
    });
});

describe('buildCapTrace', () => {
    it('reflects the chosen policy in the decision step and validates quorums', () => {
        const cp = buildCapTrace({ choiceId: 'cp', n: 3, r: 2, w: 2 });
        expect(cp.artifacts.strong).toBe(true);
        expect(cp.steps.find((step) => step.id === 'choice').title).toMatch(/consistency/i);

        const ap = buildCapTrace({ choiceId: 'ap', n: 5, r: 1, w: 1 });
        expect(ap.artifacts.strong).toBe(false);
        expect(ap.steps.find((step) => step.id === 'choice').title).toMatch(/availability/i);

        expect(() => buildCapTrace({ choiceId: 'cp', n: 3, r: 9, w: 1 })).toThrow(/quorums/);
        expect(() => buildCapTrace({ choiceId: 'cp', n: 0, r: 1, w: 1 })).toThrow(/replicas/);
    });
});
