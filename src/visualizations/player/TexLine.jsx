import { useEffect, useState } from 'react';

// Lazy KaTeX renderer for formula-heavy steps (Phase 2d). The library and
// its stylesheet load only when a page actually renders a TeX line; until
// then (and in test environments) the raw TeX shows as mono text.
let katexPromise = null;
const loadKatex = () => {
    if (!katexPromise) {
        katexPromise = Promise.all([
            import('katex'),
            import('katex/dist/katex.min.css'),
        ]).then(([module]) => module.default ?? module);
    }
    return katexPromise;
};

export default function TexLine({ tex }) {
    const [html, setHtml] = useState(null);

    useEffect(() => {
        let alive = true;
        loadKatex()
            .then((katex) => {
                if (!alive) return;
                setHtml(
                    katex.renderToString(tex, { throwOnError: false, displayMode: true })
                );
            })
            .catch(() => {
                /* keep the plain-text fallback */
            });
        return () => {
            alive = false;
        };
    }, [tex]);

    if (html === null) {
        return <div className="math-line">{tex}</div>;
    }
    // KaTeX output is generated locally from our own trace strings.
    // eslint-disable-next-line react/no-danger
    return <div className="math-line tex" dangerouslySetInnerHTML={{ __html: html }} />;
}
