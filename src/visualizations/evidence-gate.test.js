import { describe, expect, it } from 'vitest';
import { PROVENANCE } from './provenance';
import { findDuplicateChildIds, walkNodes } from './drilldown/model';
import { listVisualizations } from './index';

// The evidence gate, applied to every registered visualization — the CI
// translation of Tekton's "the build fails if verification fails." A step
// without a resolvable citation, an unknown provenance class, or an uncited
// caveat fails the suite; so does a visualization registered without gate
// fixtures. Phase 4a extended the same rule to drill-down maps, where it
// applies per node: an uncited component of an architecture fails CI exactly
// like an uncited step.

const checkRefs = (owner, refs, sources) => {
    expect(refs?.length, `${owner} has no sources`).toBeGreaterThan(0);
    for (const ref of refs) {
        expect(sources[ref.key], `${owner} cites unknown source "${ref.key}"`).toBeDefined();
    }
};

const checkCited = (owner, item, sources) => {
    checkRefs(owner, item.sourceRefs, sources);
    expect(
        PROVENANCE[item.provenance],
        `${owner} has unknown provenance "${item.provenance}"`
    ).toBeDefined();
    if (item.caveat) {
        checkRefs(`caveat on ${owner}`, item.caveat.sourceRefs, sources);
        expect(PROVENANCE[item.caveat.provenance]).toBeDefined();
    }
};

describe('evidence gate (all registered visualizations)', () => {
    const visualizations = listVisualizations();

    it('has visualizations registered', () => {
        expect(visualizations.map((viz) => viz.id)).toEqual(
            expect.arrayContaining(['rsa', 'bayes', 'dh'])
        );
    });

    for (const viz of visualizations) {
        describe(viz.id, () => {
            const fixtures = viz.gateFixtures();

            it('provides at least one gate fixture', () => {
                expect(fixtures.length).toBeGreaterThan(0);
            });

            for (const [index, fixture] of fixtures.entries()) {
                if (viz.buildTrace) {
                    it(`fixture ${index + 1}: every step cites and declares provenance`, () => {
                        const { steps } = viz.buildTrace(fixture);
                        expect(steps.length).toBeGreaterThan(0);
                        for (const step of steps) {
                            checkCited(`step "${step.id}"`, step, viz.sources);
                        }
                    });
                } else {
                    it(`fixture ${index + 1}: every node cites and declares provenance`, () => {
                        const { root } = viz.buildMap(fixture);
                        const nodes = walkNodes(root);
                        expect(nodes.length).toBeGreaterThan(1);
                        for (const [node, ancestors] of nodes) {
                            const path = [...ancestors, node.id].join('.');
                            checkCited(`node "${path}"`, node, viz.sources);
                            expect(node.title, `node "${path}" has no title`).toBeTruthy();
                            expect(node.summary, `node "${path}" has no summary`).toBeTruthy();
                        }
                    });

                    it(`fixture ${index + 1}: node paths are unambiguous`, () => {
                        const { root } = viz.buildMap(fixture);
                        expect(findDuplicateChildIds(root)).toEqual([]);
                    });
                }
            }

            it('every source in the database is complete', () => {
                for (const source of Object.values(viz.sources)) {
                    expect(source.key).toBeTruthy();
                    expect(source.authors).toBeTruthy();
                    expect(source.title).toBeTruthy();
                    expect(source.venue).toBeTruthy();
                    expect(source.year).toBeGreaterThan(1500);
                    expect(source.url).toMatch(/^https:\/\//);
                }
            });
        });
    }
});
