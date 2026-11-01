import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../routes';
import { SYSTEMS } from '.';
import { trayPath, traysOf } from './model';

// jsdom has no layout or canvas: silence the scroll-restore call and give
// the KV layout canvas no context, which it already handles.
beforeAll(() => {
    window.scrollTo = () => {};
    HTMLCanvasElement.prototype.getContext = () => null;
});

// System design routes load lazily, so wait for the page to render.
const renderAt = async (path) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    const view = render(<RouterProvider router={router} />);
    const { container } = view;
    await waitFor(() => expect(container.querySelector('.sd-index, .sd-page')).not.toBeNull(), { timeout: 10000 });
    return { router, ...view };
};

describe('system design index', () => {
    it('opens on Fundamentals with its systems', async () => {
        await renderAt('/systems');
        expect(screen.getByRole('heading', { name: /explore a system, layer by layer/i })).toBeInTheDocument();
        const cats = within(screen.getByRole('navigation', { name: /categories/i }));
        expect(cats.getByRole('link', { name: /fundamentals/i })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('heading', { level: 3, name: /^four mental models$/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: /^kafka log$/i })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 3, name: /the ai inference stack/i })).toBeNull();
    });

    it('switches to the AI category from the query string', async () => {
        await renderAt('/systems?category=ai');
        expect(screen.getByRole('heading', { level: 3, name: /the ai inference stack/i })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 3, name: /^four mental models$/i })).toBeNull();
    });

    it('falls back to Fundamentals for an unknown category', async () => {
        await renderAt('/systems?category=nope');
        expect(screen.getByRole('heading', { level: 3, name: /^four mental models$/i })).toBeInTheDocument();
    });
});

describe('system page', () => {
    it('shows the rack, the overview and the cited sources', async () => {
        await renderAt('/systems/ai-inference-stack');
        expect(screen.getByRole('heading', { level: 1, name: /the ai inference stack/i })).toBeInTheDocument();
        const rack = within(screen.getByRole('navigation', { name: /^layers$/i }));
        expect(rack.getByRole('link', { name: /overview/i })).toHaveAttribute('aria-current', 'page');
        for (const name of ['Your app', 'AI gateway', 'Inference platform', 'Inference engine', 'Framework', 'Kernels', 'GPU']) {
            expect(rack.getByRole('link', { name: new RegExp(name) })).toBeInTheDocument();
        }
        expect(document.getElementById('ref-KWON2023')).not.toBeNull();
    });

    it('opens a tab from ?tab= and switches tabs by click', async () => {
        await renderAt('/systems/ai-inference-stack/l4?tab=spec');
        const tabs = within(screen.getByRole('tablist'));
        expect(tabs.getByRole('tab', { name: /spec/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText(/an operating system: a scheduler/i)).toBeInTheDocument();
        fireEvent.click(tabs.getByRole('tab', { name: /practice/i }));
        expect(tabs.getByRole('tab', { name: /practice/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', { name: /design drill/i })).toBeInTheDocument();
    });

    it('walks to the next layer with the arrow key', async () => {
        const { router } = await renderAt('/systems/kafka-log/d1');
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        await waitFor(() => expect(router.state.location.pathname).toBe('/systems/kafka-log/d2'));
        await screen.findByRole('heading', { level: 2, name: /topics, partitions/i });
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        await screen.findByRole('heading', { level: 2, name: /a durable, ordered log/i });
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        await waitFor(() => expect(router.state.location.pathname).toBe('/systems/kafka-log'));
    });

    it('reports an unknown system or layer', async () => {
        await renderAt('/systems/nope');
        expect(screen.getByRole('heading', { name: /not in the atlas/i })).toBeInTheDocument();
        await renderAt('/systems/kafka-log/d9');
        expect(screen.getAllByRole('heading', { name: /not in the atlas/i }).length).toBeGreaterThan(0);
    });
});

// Every tab of every tray of every system renders without throwing, with
// its evidence row. This is the smoke test for all the labs.
for (const system of SYSTEMS) {
    describe(`renders every tab: ${system.id}`, () => {
        for (const tray of traysOf(system)) {
            it(tray.id, async () => {
                for (const section of tray.sections) {
                    const { unmount } = await renderAt(`${trayPath(system.id, tray.id)}?tab=${section.id}`);
                    expect(screen.getByRole('heading', { level: 2, name: tray.title })).toBeInTheDocument();
                    expect(screen.queryByText(/missing lab/i)).toBeNull();
                    unmount();
                }
            });
        }
    });
}
