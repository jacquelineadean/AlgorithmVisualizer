import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
    it('renders the visualizer with its controls and grid', () => {
        render(<App />);

        expect(screen.getByRole('button', { name: /visualize dijkstra/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('dijkstra');
        expect(document.getElementById('node-10-15')).toHaveClass('node-start');
        expect(document.getElementById('node-10-35')).toHaveClass('node-finish');
    });
});
