import { describe, expect, it } from 'vitest';
import { PROVENANCE, SOURCES } from './sources';

// Until the grid tool migrates onto the trace model (Phase 2), its evidence
// gate checks the citation database itself.
describe('pathfinding sources', () => {
    it('every source is complete', () => {
        expect(Object.keys(SOURCES).length).toBeGreaterThan(0);
        for (const source of Object.values(SOURCES)) {
            expect(source.key).toBeTruthy();
            expect(source.authors).toBeTruthy();
            expect(source.title).toBeTruthy();
            expect(source.venue).toBeTruthy();
            expect(source.year).toBeGreaterThan(1800);
            expect(source.url).toMatch(/^https:\/\//);
            expect(SOURCES[source.key]).toBe(source);
        }
    });

    it('shares the site-wide provenance classes', () => {
        expect(Object.keys(PROVENANCE)).toEqual(['paper', 'theorem', 'modern', 'pedagogical']);
    });
});
