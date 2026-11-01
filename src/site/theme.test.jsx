import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { currentTheme } from './theme';

afterEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.clear();
});

describe('theme toggle', () => {
    it('follows the system setting until the reader picks a theme', () => {
        // jsdom has no matchMedia, so the system setting reads as light.
        expect(currentTheme()).toBe('light');
        render(<ThemeToggle />);
        expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
    });

    it('switches theme, stores the choice and flips its own label', () => {
        render(<ThemeToggle />);
        fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }));
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
        fireEvent.click(screen.getByRole('button', { name: /switch to light theme/i }));
        expect(document.documentElement.dataset.theme).toBe('light');
        expect(localStorage.getItem('theme')).toBe('light');
    });
});
