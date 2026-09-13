import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../routes';

// The drill-down tier's behavior — zooming in, breadcrumbing back, and
// restoring a pasted node path — tested through the real transformer map, so
// the contract and a shipped consumer are checked together.

const renderAt = (path) =>
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('drill-down navigation', () => {
    it('zooms into a child and back out through the breadcrumb', async () => {
        const user = userEvent.setup();
        renderAt('/visualizer/transformer-arch');

        // The root shows its children as cards.
        expect(screen.getByRole('heading', { level: 3, name: /decoder-only transformer/i })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /transformer block ×/i }));

        // Now focused on the block, which lists its own components.
        expect(
            screen.getByRole('heading', { level: 3, name: /transformer block ×/i })
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /multi-head self-attention/i })).toBeInTheDocument();

        // Two levels down: a single head, which opens a live stage.
        await user.click(screen.getByRole('button', { name: /multi-head self-attention/i }));
        await user.click(screen.getByRole('button', { name: /inside one head/i }));
        expect(screen.getByRole('heading', { level: 3, name: /inside one head/i })).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: /attention weight matrix/i })
        ).toBeInTheDocument();

        // The breadcrumb walks back up.
        const crumbs = within(screen.getByRole('navigation', { name: /map location/i }));
        await user.click(crumbs.getByRole('button', { name: /decoder-only transformer/i }));
        expect(
            screen.getByRole('heading', { level: 3, name: /decoder-only transformer/i })
        ).toBeInTheDocument();
    });

    it('restores a pasted node path, and survives one that no longer resolves', () => {
        renderAt('/visualizer/transformer-arch?node=block.attention.head');
        expect(screen.getByRole('heading', { level: 3, name: /inside one head/i })).toBeInTheDocument();

        // A stale path stops at the deepest node that still exists rather
        // than rendering nothing.
        renderAt('/visualizer/transformer-arch?node=block.attention.renamed-node');
        expect(
            screen.getByRole('heading', { level: 3, name: /multi-head self-attention/i })
        ).toBeInTheDocument();
    });

    it('recomputes every metric when the configuration changes', async () => {
        const user = userEvent.setup();
        renderAt('/visualizer/transformer-arch');
        expect(screen.getByText('124.3 M')).toBeInTheDocument();

        await user.selectOptions(
            screen.getByRole('combobox', { name: /configuration/i }),
            'llama-7b'
        );
        expect(screen.queryByText('124.3 M')).not.toBeInTheDocument();
        expect(screen.getAllByText(/6\.\d\d B/).length).toBeGreaterThan(0);
    });

    it('swaps the components themselves when the configuration does', () => {
        renderAt('/visualizer/transformer-arch?config=gpt2-small&node=input');
        expect(screen.getByRole('button', { name: /learned positions/i })).toBeInTheDocument();

        // Rotary embeddings replace the learned table — and cost no parameters.
        renderAt('/visualizer/transformer-arch?config=llama-7b&node=input');
        expect(
            screen.getByRole('button', { name: /rotary position embedding/i })
        ).toBeInTheDocument();
    });
});
