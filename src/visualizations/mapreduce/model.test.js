import { describe, expect, it } from 'vitest';
import {
    JOBS,
    getJob,
    mapTasks,
    shuffleBytes,
    tailProbability,
    tasksPerWorker,
} from './model';
import { buildMapReduceMap } from './map';
import { walkNodes } from '../drilldown/model';

describe('job shape', () => {
    it('splits a terabyte into the paper’s ~15,000 map tasks at 64 MB', () => {
        const tasks = mapTasks(getJob('sort'));
        expect(tasks).toBeGreaterThan(14000);
        expect(tasks).toBeLessThan(16000);
    });

    it('always creates far more tasks than workers', () => {
        for (const job of JOBS) {
            expect(tasksPerWorker(job), job.id).toBeGreaterThan(1);
        }
    });

    it('separates shuffle-heavy from shuffle-light jobs', () => {
        expect(shuffleBytes(getJob('sort'))).toBe(getJob('sort').inputBytes);
        expect(shuffleBytes(getJob('grep'))).toBeLessThan(getJob('grep').inputBytes / 1000);
        expect(shuffleBytes(getJob('wordcount'))).toBeLessThan(getJob('wordcount').inputBytes);
    });
});

describe('the tail', () => {
    it('makes a large job almost certainly slow at a 1% per-task rate', () => {
        expect(tailProbability(0.01, 1000)).toBeGreaterThan(0.99);
        expect(tailProbability(0.01, 1)).toBeCloseTo(0.01, 10);
        expect(tailProbability(0, 10000)).toBe(0);
    });

    it('is monotone in both the rate and the task count', () => {
        expect(tailProbability(0.02, 100)).toBeGreaterThan(tailProbability(0.01, 100));
        expect(tailProbability(0.01, 200)).toBeGreaterThan(tailProbability(0.01, 100));
    });
});

describe('buildMapReduceMap', () => {
    it('exposes the dataflow and the three systems concerns', () => {
        const { root } = buildMapReduceMap({ jobId: 'wordcount' });
        const ids = walkNodes(root).map(([node]) => node.id);
        expect(ids).toEqual(
            expect.arrayContaining([
                'input',
                'map',
                'combine',
                'shuffle',
                'reduce',
                'faults',
                'locality',
                'stragglers',
            ])
        );
    });

    it('cites every node', () => {
        for (const job of JOBS) {
            const { root } = buildMapReduceMap({ jobId: job.id });
            for (const [node] of walkNodes(root)) {
                expect(node.sourceRefs?.length, node.id).toBeGreaterThan(0);
                expect(node.provenance, node.id).toBeTruthy();
            }
        }
    });
});
