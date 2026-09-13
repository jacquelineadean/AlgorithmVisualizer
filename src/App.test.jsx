import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';

const renderAt = (path) =>
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('site shell', () => {
    it('renders the home page with nav links', () => {
        renderAt('/');
        expect(screen.getByRole('heading', { name: /see how the classics compute/i })).toBeInTheDocument();
        const nav = within(screen.getByRole('navigation', { name: /primary/i }));
        expect(nav.getByRole('link', { name: /^visualizer$/i })).toBeInTheDocument();
        expect(nav.getByRole('link', { name: /blog/i })).toBeInTheDocument();
        expect(nav.getByRole('link', { name: /github/i })).toBeInTheDocument();
    });

    it('renders the catalog with live and planned entries', () => {
        renderAt('/visualizer');
        expect(screen.getByRole('heading', { name: /pick an algorithm/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /rsa encryption/i })).toBeInTheDocument();
        expect(screen.getByText(/diffie–hellman key exchange/i)).toBeInTheDocument();
    });

    it('renders the blog index and a post', () => {
        renderAt('/blog');
        expect(screen.getByRole('heading', { name: /notes from the atlas/i })).toBeInTheDocument();
        renderAt('/blog/nothing-renders-without-a-source');
        expect(
            screen.getAllByRole('heading', { name: /nothing renders without a source/i }).length
        ).toBeGreaterThan(0);
    });
});

describe('pathfinding page', () => {
    it('renders the grid with three algorithms, streams, and citations', () => {
        renderAt('/visualizer/pathfinding');
        expect(screen.getByRole('heading', { name: /shortest paths/i })).toBeInTheDocument();
        const select = screen.getByRole('combobox', { name: /algorithm/i });
        expect(select).toHaveValue('dijkstra');
        expect(within(select).getByRole('option', { name: /a\* search/i })).toBeInTheDocument();
        expect(within(select).getByRole('option', { name: /breadth-first/i })).toBeInTheDocument();
        expect(screen.getByText(/step 1 \/ 5/i)).toBeInTheDocument();
        expect(document.getElementById('ref-DIJKSTRA59')).not.toBeNull();
        expect(document.getElementById('ref-HNR68')).not.toBeNull();
    });
});

describe('bayes page', () => {
    it('renders the population, sliders, and the classic posterior', () => {
        renderAt('/visualizer/bayes');
        expect(screen.getByRole('heading', { name: /bayes[’'] rule/i })).toBeInTheDocument();
        expect(screen.getAllByRole('slider')).toHaveLength(3);
        expect(screen.getByText(/step 1 \/ 7/i)).toBeInTheDocument();
        // Classic example sources are in the references.
        expect(document.getElementById('ref-BAYES1763')).not.toBeNull();
        expect(document.getElementById('ref-GH1995')).not.toBeNull();
    });
});

describe('sorting pages', () => {
    it('renders quicksort with streamed steps and citations', () => {
        renderAt('/visualizer/quicksort');
        expect(screen.getByRole('heading', { name: /^quicksort$/i })).toBeInTheDocument();
        expect(screen.getByText(/step 1 \/ 4/i)).toBeInTheDocument();
        expect(document.getElementById('ref-HOARE61')).not.toBeNull();
    });

    it('renders merge sort', () => {
        renderAt('/visualizer/mergesort');
        expect(screen.getByRole('heading', { name: /^merge sort$/i })).toBeInTheDocument();
        expect(document.getElementById('ref-KNUTH98')).not.toBeNull();
    });
});

describe('deep links', () => {
    it('restores inputs and step from the URL', () => {
        renderAt('/visualizer/rsa?m=HI&p=11&q=13&e=7&s=2');
        // n = 11 × 13 = 143 appears once keygen reaches the modulus step (s=2).
        expect(screen.getByText(/step 2 \/ 13/i)).toBeInTheDocument();
        expect(screen.getByText('143')).toBeInTheDocument();
    });

    it('falls back to defaults on invalid params', () => {
        renderAt('/visualizer/rsa?p=999&q=abc&s=notanumber');
        expect(screen.getByText(/step 1 \/ 13/i)).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /prime p/i })).toHaveValue('61');
    });
});

describe('diffie–hellman page', () => {
    it('renders through the generic visualizer route with the worked example', () => {
        renderAt('/visualizer/dh');
        expect(
            screen.getByRole('heading', { name: /diffie–hellman key exchange/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/step 1 \/ 10/i)).toBeInTheDocument();
        expect(document.getElementById('ref-DH76')).not.toBeNull();
        expect(document.getElementById('ref-RFC3526')).not.toBeNull();
    });

    it('shows a not-found card for unknown ids', () => {
        renderAt('/visualizer/nonsense');
        expect(screen.getByRole('heading', { name: /not in the atlas/i })).toBeInTheDocument();
    });
});

describe('rsa page', () => {
    it('renders the step player on the classic example and steps through', async () => {
        renderAt('/visualizer/rsa');
        expect(screen.getByRole('heading', { name: /^rsa encryption$/i })).toBeInTheDocument();
        // Classic worked example values appear once keygen steps exist.
        expect(screen.getByText(/step 1 \/ 13/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /derive the private exponent/i })).toBeInTheDocument();
        // Every step button is reachable; the references list all sources.
        expect(document.getElementById('ref-RSA78')).not.toBeNull();
        expect(document.getElementById('ref-RFC8017')).not.toBeNull();
    });
});

describe('catalog by domain', () => {
    it('shows only one domain\'s entries with ?domain=', () => {
        renderAt('/visualizer?domain=cryptography');
        expect(screen.getByRole('heading', { level: 1, name: /^cryptography$/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /rsa encryption/i })).toBeInTheDocument();
        expect(screen.queryByText(/bayes[’'] rule/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /quicksort/i })).not.toBeInTheDocument();

        // The filter row marks the active domain and offers the way back.
        const filter = within(screen.getByRole('navigation', { name: /^domains$/i }));
        expect(filter.getByRole('link', { name: /cryptography/i })).toHaveAttribute('aria-current', 'page');
        expect(filter.getByRole('link', { name: /all domains/i })).not.toHaveAttribute('aria-current');
    });

    it('falls back to the full catalog for an unknown domain', () => {
        renderAt('/visualizer?domain=nope');
        expect(screen.getByRole('heading', { name: /pick an algorithm/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /rsa encryption/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: /^quicksort$/i })).toBeInTheDocument();
    });

    it('takes a home-page domain card to that domain only', async () => {
        const user = userEvent.setup();
        renderAt('/');
        await user.click(screen.getByRole('link', { name: /distributed systems/i }));
        expect(screen.getByRole('heading', { level: 1, name: /distributed systems/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /raft consensus/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /rsa encryption/i })).not.toBeInTheDocument();
    });

    it('links each catalog heading to its own domain', async () => {
        const user = userEvent.setup();
        renderAt('/visualizer');
        await user.click(screen.getByRole('link', { name: /^sorting & order$/i }));
        expect(screen.getByRole('heading', { level: 1, name: /sorting & order/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: /^quicksort$/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /rsa encryption/i })).not.toBeInTheDocument();
    });
});

describe('step transport', () => {
    it('steps with the icon buttons and plays through automatically until paused', () => {
        vi.useFakeTimers();
        try {
            renderAt('/visualizer/bayes');
            expect(screen.getByText(/step 1 \/ 7/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /previous step/i })).toBeDisabled();

            fireEvent.click(screen.getByRole('button', { name: /next step/i }));
            expect(screen.getByText(/step 2 \/ 7/i)).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
            expect(screen.getByRole('button', { name: /^pause$/i })).toBeInTheDocument();
            act(() => {
                vi.advanceTimersByTime(2600);
            });
            expect(screen.getByText(/step 3 \/ 7/i)).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: /^pause$/i }));
            act(() => {
                vi.advanceTimersByTime(10000);
            });
            expect(screen.getByText(/step 3 \/ 7/i)).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });
});
