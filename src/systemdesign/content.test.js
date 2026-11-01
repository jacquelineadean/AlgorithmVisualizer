import { describe, expect, it } from 'vitest';
import { PROVENANCE } from '../visualizations/provenance';
import { CATEGORIES, DEFAULT_CATEGORY, getSystem, SYSTEMS, systemsByCategory } from '.';
import { LABS } from './labs';
import { citationsOf, findTray, sectionsOf, textOf, traysOf } from './model';
import { SOURCES } from './sources';
import { BLOCKS } from './ui/Blocks';

// The content gate for the System Design Visualizer: the same evidence rule
// the algorithm pages follow (every section cites a resolvable source and
// declares its provenance), plus the structural checks that keep a system
// navigable: unique ids, known block kinds and labs, internal links and
// layer references that resolve, and no podcast-specific references
// outside the citations themselves.

const PODCAST = /\b(episodes?|podcasts?|spotify|show notes|listen on)\b|\bthe host\b|\brubric\b/i;

const checkRefs = (owner, refs) => {
    expect(refs?.length, `${owner} has no sources`).toBeGreaterThan(0);
    for (const ref of refs) expect(SOURCES[ref.key], `${owner} cites unknown source "${ref.key}"`).toBeDefined();
};

// Every internal /systems link in a string, from [label](/path) markup.
const linksIn = (text) => [...String(text).matchAll(/\]\((\/[^)]+)\)/g)].map((m) => m[1]);

function resolve(path) {
    const [pathname, query = ''] = path.split('?');
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'systems') return `not a /systems path: ${path}`;
    if (parts.length === 1) return null;
    const system = getSystem(parts[1]);
    if (!system) return `unknown system in ${path}`;
    const tray = findTray(system, parts[2]);
    if (!tray) return `unknown layer in ${path}`;
    const tab = new URLSearchParams(query).get('tab');
    if (tab && !(tray.sections ?? []).some((s) => s.id === tab)) return `unknown tab in ${path}`;
    return null;
}

function* blocksOf(system) {
    for (const [tray, section] of sectionsOf(system)) for (const block of section.blocks) yield [tray, section, block];
}

describe('catalog', () => {
    it('has exactly the two categories, Fundamentals first and default', () => {
        expect(CATEGORIES.map((c) => c.id)).toEqual(['fundamentals', 'ai']);
        expect(DEFAULT_CATEGORY).toBe('fundamentals');
    });

    it('puts every system in a known category, and every category has a system', () => {
        for (const s of SYSTEMS) expect(CATEGORIES.map((c) => c.id)).toContain(s.category);
        for (const c of CATEGORIES) expect(systemsByCategory(c.id).length).toBeGreaterThan(0);
    });

    it('gives every system a unique id', () => {
        const ids = SYSTEMS.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('builds the AI category around the seven-layer inference stack', () => {
        const stack = getSystem('ai-inference-stack');
        expect(stack.category).toBe('ai');
        expect(stack.layers.map((l) => l.code)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']);
    });

    it('gives every source an https link', () => {
        for (const [key, s] of Object.entries(SOURCES)) {
            expect(s.key).toBe(key);
            expect(s.url, key).toMatch(/^https:\/\//);
        }
    });
});

for (const system of SYSTEMS) {
    describe(`system: ${system.id}`, () => {
        it('has a name, summary, intro and at least one layer', () => {
            for (const field of ['name', 'kicker', 'summary', 'intro']) expect(system[field], field).toBeTruthy();
            expect(system.layers.length).toBeGreaterThan(0);
        });

        it('gives every tray a unique id, a code, a name, a title and sections with unique ids', () => {
            const ids = traysOf(system).map((t) => t.id);
            expect(new Set(ids).size, 'duplicate tray ids').toBe(ids.length);
            for (const tray of traysOf(system)) {
                for (const field of ['code', 'name', 'title']) expect(tray[field], `${tray.id}.${field}`).toBeTruthy();
                expect(tray.sections?.length, `${tray.id} has no sections`).toBeGreaterThan(0);
                const sids = tray.sections.map((s) => s.id);
                expect(new Set(sids).size, `${tray.id} has duplicate section ids`).toBe(sids.length);
            }
        });

        it('passes the evidence gate: every section cites and declares provenance', () => {
            for (const [tray, section] of sectionsOf(system)) {
                const owner = `${system.id}/${tray.id}#${section.id}`;
                expect(section.label, `${owner} has no label`).toBeTruthy();
                checkRefs(owner, section.sourceRefs);
                expect(PROVENANCE[section.provenance], `${owner} has unknown provenance "${section.provenance}"`).toBeDefined();
                if (section.caveat) {
                    checkRefs(`caveat on ${owner}`, section.caveat.sourceRefs);
                    expect(PROVENANCE[section.caveat.provenance]).toBeDefined();
                    expect(section.caveat.text).toBeTruthy();
                }
                expect(section.blocks.length, `${owner} is empty`).toBeGreaterThan(0);
            }
            expect(citationsOf(system).length).toBeGreaterThan(0);
        });

        it('uses only known block kinds and registered labs', () => {
            for (const [tray, section, block] of blocksOf(system)) {
                const owner = `${system.id}/${tray.id}#${section.id}`;
                expect(BLOCKS[block.kind], `${owner} uses unknown block "${block.kind}"`).toBeDefined();
                if (block.kind === 'lab') expect(LABS[block.lab], `${owner} uses unknown lab "${block.lab}"`).toBeDefined();
                if (block.lab === 'request-trace') {
                    for (const layer of system.layers) expect(system.trace?.steps?.[layer.id]?.head, `trace step for ${layer.id}`).toBeTruthy();
                }
            }
        });

        it('points every layer reference at a tray that exists', () => {
            const check = (owner, id) => expect(findTray(system, id), `${owner} names unknown layer "${id}"`).not.toBeNull();
            for (const [tray, section, block] of blocksOf(system)) {
                const owner = `${system.id}/${tray.id}#${section.id}`;
                if (block.kind === 'drill') for (const step of block.steps) if (step.layer) check(owner, step.layer);
                if (block.kind === 'table' && block.layerColumn) for (const row of block.rows) check(owner, row[0]);
                if (block.lab === 'glossary') for (const term of block.props.terms) for (const id of term.layers) check(owner, id);
            }
        });

        it('resolves every internal link', () => {
            const paths = [...linksIn(textOf(system))];
            for (const [, , block] of blocksOf(system)) if (block.kind === 'links') paths.push(...block.items.map((i) => i.to));
            for (const path of paths) expect(resolve(path), path).toBeNull();
        });

        it('keeps quiz answers inside their options', () => {
            for (const [, , block] of blocksOf(system)) {
                if (block.kind !== 'quiz') continue;
                for (const q of block.questions) {
                    expect(q.answer).toBeGreaterThanOrEqual(0);
                    expect(q.answer).toBeLessThan(q.options.length);
                }
            }
        });

        it('carries no podcast-specific references outside its citations', () => {
            const text = textOf(system);
            const hit = PODCAST.exec(text);
            expect(hit ? text.slice(Math.max(0, hit.index - 60), hit.index + 60) : null).toBeNull();
        });
    });
}
