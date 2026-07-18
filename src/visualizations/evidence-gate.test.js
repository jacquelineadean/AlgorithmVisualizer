import { describe, expect, it } from 'vitest';
import { PROVENANCE } from './provenance';
import { listVisualizations } from './index';

// The evidence gate, applied to every registered visualization — the CI
// translation of Tekton's "the build fails if verification fails." A step
// without a resolvable citation, an unknown provenance class, or an uncited
// caveat fails the suite; so does a visualization registered without gate
// fixtures.

const checkRefs = (owner, refs, sources) => {
    expect(refs?.length, `${owner} has no sources`).toBeGreaterThan(0);
    for (const ref of refs) {
        expect(sources[ref.key], `${owner} cites unknown source "${ref.key}"`).toBeDefined();
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
                it(`fixture ${index + 1}: every step cites and declares provenance`, () => {
                    const { steps } = viz.buildTrace(fixture);
                    expect(steps.length).toBeGreaterThan(0);
                    for (const step of steps) {
                        checkRefs(`step "${step.id}"`, step.sourceRefs, viz.sources);
                        expect(
                            PROVENANCE[step.provenance],
                            `step "${step.id}" has unknown provenance "${step.provenance}"`
                        ).toBeDefined();
                        if (step.caveat) {
                            checkRefs(
                                `caveat on "${step.id}"`,
                                step.caveat.sourceRefs,
                                viz.sources
                            );
                            expect(PROVENANCE[step.caveat.provenance]).toBeDefined();
                        }
                    }
                });
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
