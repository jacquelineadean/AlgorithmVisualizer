import { useEffect, useState } from 'react';

// Pins the stage + transport block below the floating nav on wide viewports,
// so the graphic stays in place while the reader scrolls the step list,
// detail card, and evidence beneath it — but only when the block leaves at
// least half the viewport to read under it. The drill-down pipelines pin on
// a laptop; the full-width SVG stages pin on taller monitors; tall stages
// (the sieve's number grid, the pathfinding maze) stay in normal flow.
//
// Returns { sticky, height }: the instrument sets the class and exposes the
// height as a CSS variable so a focused step scrolls clear of the block.

const FIT = 0.5; // the block may take at most this share of the viewport
const MIN_WIDTH = 900; // below this the columns stack and pinning would smother them

export default function useStickyInstrument(ref, enabled = true) {
    const [state, setState] = useState({ sticky: false, height: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!enabled || !el || typeof window === 'undefined') return undefined;

        const measure = () => {
            const height = el.offsetHeight;
            const sticky =
                height > 0 && height <= window.innerHeight * FIT && window.innerWidth >= MIN_WIDTH;
            setState((prev) =>
                prev.sticky === sticky && prev.height === height ? prev : { sticky, height }
            );
        };

        measure();
        window.addEventListener('resize', measure);
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
        observer?.observe(el);
        return () => {
            window.removeEventListener('resize', measure);
            observer?.disconnect();
        };
    }, [ref, enabled]);

    return state;
}
