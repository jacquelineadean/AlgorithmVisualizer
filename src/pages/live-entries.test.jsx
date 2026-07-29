import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../routes';
import { CATALOG, liveEntries } from '../catalog';
import { getVisualization } from '../visualizations';

// Every catalog card that claims to be live must actually render, and every
// registered visualization must have a card. Model tests cover the maths;
// this is the check that the components themselves mount — the failure mode
// a pure-model suite cannot see.

const renderAt = (path) =>
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('every live catalog entry', () => {
    const live = liveEntries();

    it('covers every domain at least twice, and 20+ entries in total', () => {
        expect(live.length).toBeGreaterThanOrEqual(20);
        const byDomain = new Map();
        for (const entry of live) {
            byDomain.set(entry.domain, (byDomain.get(entry.domain) ?? 0) + 1);
        }
        for (const [domain, count] of byDomain) {
            expect(count, `${domain} has only ${count} live entry`).toBeGreaterThanOrEqual(2);
        }
    });

    it('is registered, routed, and introduced', () => {
        for (const entry of live) {
            expect(getVisualization(entry.id), `${entry.id} is not registered`).toBeDefined();
            expect(entry.route).toBe(`/visualizer/${entry.id}`);
            expect(entry.intro, `${entry.id} has no intro`).toBeTruthy();
        }
    });

    it('has no registered visualization missing a live card', () => {
        const cards = new Set(live.map((entry) => entry.id));
        for (const entry of CATALOG) {
            if (entry.status === 'live') continue;
            expect(getVisualization(entry.id), `${entry.id} is registered but marked planned`).toBeUndefined();
        }
        expect(cards.size).toBe(live.length);
    });

    for (const entry of live) {
        it(`renders /visualizer/${entry.id}`, () => {
            renderAt(entry.route);
            expect(
                screen.getByRole('heading', { level: 1, name: entry.name })
            ).toBeInTheDocument();
            // Trace pages show a step player; map pages show breadcrumbs.
            const viz = getVisualization(entry.id);
            if (viz.buildTrace) {
                expect(screen.getByText(/step 1 \//i)).toBeInTheDocument();
            } else {
                expect(screen.getByRole('navigation', { name: /map location/i })).toBeInTheDocument();
            }
            // And the evidence section, with at least one resolvable reference.
            expect(screen.getByRole('heading', { name: /^evidence$/i })).toBeInTheDocument();
            const firstKey = Object.keys(viz.sources)[0];
            expect(document.getElementById(`ref-${firstKey}`)).not.toBeNull();
        });
    }
});
