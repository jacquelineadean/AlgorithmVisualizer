import { setTheme, useTheme } from './theme';

// One button: the icon shows the theme it switches to.
export default function ThemeToggle() {
    const theme = useTheme();
    const next = theme === 'dark' ? 'light' : 'dark';
    return (
        <button type="button" className="theme-toggle" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
            {next === 'light' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="4.2" />
                    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8z" />
                </svg>
            )}
        </button>
    );
}
