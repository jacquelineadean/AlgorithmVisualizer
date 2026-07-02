import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAnimator } from './animator';

const node = (row, col) => ({ row, col });

describe('createAnimator', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('plays the visited sweep, then the path, then finishes', () => {
        const animator = createAnimator({ visitDelayMs: 10, pathDelayMs: 50 });
        const events = [];

        animator.play(
            {
                visitedNodesInOrder: [node(0, 0), node(0, 1)],
                pathNodesInOrder: [node(0, 0)],
            },
            {
                onVisit: (n) => events.push(`visit-${n.col}`),
                onPathStep: () => events.push('path'),
                onFinish: () => events.push('finish'),
            }
        );

        vi.runAllTimers();
        expect(events).toEqual(['visit-0', 'visit-1', 'path', 'finish']);
    });

    it('cancel stops all pending callbacks', () => {
        const animator = createAnimator({ visitDelayMs: 10, pathDelayMs: 50 });
        const onVisit = vi.fn();
        const onFinish = vi.fn();

        animator.play(
            { visitedNodesInOrder: [node(0, 0), node(0, 1)], pathNodesInOrder: [] },
            { onVisit, onPathStep: () => {}, onFinish }
        );

        vi.advanceTimersByTime(5);
        animator.cancel();
        vi.runAllTimers();

        expect(onVisit).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
    });
});
