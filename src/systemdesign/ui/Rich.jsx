import { Link } from 'react-router-dom';

// Inline markup for system content: **bold**, `code`, and [label](/path)
// links. Internal paths render as router links; nothing else is parsed, so
// content strings stay plain text everywhere else (tests, search, titles).

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

export default function Rich({ text }) {
    if (text == null) return null;
    const parts = String(text).split(TOKEN);
    return parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
            const [, label, to] = link;
            return to.startsWith('/') ? (
                <Link key={i} to={to} className="sd-inline-link">
                    {label}
                </Link>
            ) : (
                <a key={i} href={to} target="_blank" rel="noreferrer">
                    {label}
                </a>
            );
        }
        return part;
    });
}

// Plain text with the markup stripped, for titles and accessible names.
export const plain = (text) =>
    String(text ?? '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
