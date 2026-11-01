import { useSyncExternalStore } from 'react';

// The reader's theme. With no stored choice the page follows the system
// setting. The toggle stores 'light' or 'dark' and sets data-theme on
// <html>, which theme.css reads; index.html applies a stored choice before
// the first paint so the page never flashes the wrong theme.

const KEY = 'theme';
const listeners = new Set();

const darkQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export function currentTheme() {
    if (typeof document === 'undefined') return 'light';
    const chosen = document.documentElement.dataset.theme;
    if (chosen === 'light' || chosen === 'dark') return chosen;
    return darkQuery()?.matches ? 'dark' : 'light';
}

export function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(KEY, theme);
    } catch {
        // Storage can be blocked; the choice then lasts until the page reloads.
    }
    listeners.forEach((listener) => listener());
}

function subscribe(listener) {
    listeners.add(listener);
    const query = darkQuery();
    query?.addEventListener?.('change', listener);
    return () => {
        listeners.delete(listener);
        query?.removeEventListener?.('change', listener);
    };
}

export const useTheme = () => useSyncExternalStore(subscribe, currentTheme, () => 'light');

// A theme token's current value, for canvas and WebGL code that cannot read CSS.
export function themeVar(name, fallback = '') {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
