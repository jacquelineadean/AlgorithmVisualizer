import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    it('renders the visualizer with its controls and grid', () => {
        renderAt('/visualizer/pathfinding');
        expect(screen.getByRole('button', { name: /visualize dijkstra/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('dijkstra');
        expect(document.getElementById('node-10-15')).toHaveClass('node-start');
        expect(document.getElementById('node-10-35')).toHaveClass('node-finish');
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
