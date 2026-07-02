import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
    it('renders the visualizer with its controls and grid', () => {
        const { container } = render(<App />);

        expect(screen.getByRole('button', { name: /\.\/run dijkstra/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('dijkstra');
        expect(screen.getByRole('status')).toHaveTextContent(/ready/i);
        expect(container.querySelectorAll('.node-start')).toHaveLength(1);
        expect(container.querySelectorAll('.node-finish')).toHaveLength(1);
    });
});
