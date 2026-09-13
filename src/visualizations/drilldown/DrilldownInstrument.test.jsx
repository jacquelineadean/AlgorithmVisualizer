import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

// The phase player: the pipeline graphic stays put while the transport
// walks every phase and sub-phase in pre-order — by hand, or on play.
describe('phase player', () => {
    it('steps through the LLM inference pipeline in pre-order, sub-phases included', async () => {
        const user = userEvent.setup();
        renderAt('/visualizer/llm-inference');
        expect(screen.getByText(/phase 1 \/ 16/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: /serving one request/i })).toBeInTheDocument();

        // Rail boxes and breadcrumbs share names, so rail queries are scoped.
        const rails = within(screen.getByRole('group', { name: /llm inference pipeline map/i }));
        const next = screen.getByRole('button', { name: /next phase/i });
        await user.click(next);
        expect(screen.getByRole('heading', { level: 3, name: /^tokenize$/i })).toBeInTheDocument();
        await user.click(next);
        expect(screen.getByRole('heading', { level: 3, name: /prefill — read the prompt/i })).toBeInTheDocument();

        // Prefill's sub-phases come before the next top-level phase…
        await user.click(next);
        expect(screen.getByRole('heading', { level: 3, name: /all positions at once/i })).toBeInTheDocument();
        expect(screen.getByText(/phase 4 \/ 16/i)).toBeInTheDocument();
        // …and the rail beneath Prefill marks the current one.
        expect(rails.getByRole('button', { name: /all positions at once/i })).toHaveAttribute(
            'aria-current',
            'step'
        );

        await user.click(screen.getByRole('button', { name: /previous phase/i }));
        expect(screen.getByRole('heading', { level: 3, name: /prefill — read the prompt/i })).toBeInTheDocument();
        expect(rails.getByRole('button', { name: /prefill — read the prompt/i })).toHaveAttribute(
            'aria-current',
            'step'
        );
    });

    it('jumps to any phase from the rails and restores it from the deep link', async () => {
        const user = userEvent.setup();
        renderAt('/visualizer/llm-inference');
        await user.click(screen.getByRole('button', { name: /^sampling — logits to a token$/i }));
        expect(screen.getByText(/phase 11 \/ 16/i)).toBeInTheDocument();
        expect(screen.getByRole('slider', { name: /temperature/i })).toBeInTheDocument();

        renderAt('/visualizer/llm-inference?node=decode.batching-gain');
        expect(screen.getAllByText(/phase 10 \/ 16/i).length).toBeGreaterThan(0);
    });

    it('draws every rail whatever the phase, so the graphic never changes height', async () => {
        const user = userEvent.setup();
        const { container } = renderAt('/visualizer/llm-inference');
        const pipe = within(screen.getByRole('group', { name: /llm inference pipeline map/i }));
        const rails = () => container.querySelectorAll('.pipe-rail').length;
        expect(rails()).toBe(2);
        await user.click(pipe.getByRole('button', { name: /^tokenize$/i }));
        expect(rails()).toBe(2); // a leaf: the second rail is an empty track
        expect(container.querySelector('.pipe-rail.is-empty')).not.toBeNull();
        await user.click(pipe.getByRole('button', { name: /prefill — read the prompt/i }));
        expect(rails()).toBe(2);
        expect(pipe.getByRole('button', { name: /build the kv cache/i })).toBeInTheDocument();
    });

    it('plays through the pipeline end to end and stops on the last phase', () => {
        vi.useFakeTimers();
        try {
            renderAt('/visualizer/llm-inference');
            fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
            expect(screen.getByRole('button', { name: /^pause$/i })).toBeInTheDocument();

            act(() => {
                vi.advanceTimersByTime(3200);
            });
            expect(screen.getByText(/phase 2 \/ 16/i)).toBeInTheDocument();

            for (let i = 0; i < 14; i += 1) {
                act(() => {
                    vi.advanceTimersByTime(3200);
                });
            }
            expect(screen.getByText(/phase 16 \/ 16/i)).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 3, name: /detokenize and stream/i })).toBeInTheDocument();
            // Playback stops by itself at the end.
            expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /next phase/i })).toBeDisabled();
        } finally {
            vi.useRealTimers();
        }
    });
});
