import { useMemo } from 'react';

// The drill-down tier's fixed graphic: the map drawn as rails. Rail 0 is the
// top-level flow of phases; each rail below it shows the sub-phases of
// whichever phase on the rail above is on the current path. The number of
// rails is the map's depth, reserved up front, so the block never changes
// height as the reader moves — the transport under it stays where it is.
//
// Every box is a button (click = jump there). States read left to right:
// done → on-path → current → upcoming, with the arrows filling in as the
// flow passes and a dot sliding into the phase just entered. Purely
// presentational: the instrument owns the cursor.

// Boxes carry the phase name; the qualifier after the dash lives in the
// tooltip and the accessible name ("Prefill — read the prompt").
const shortTitle = (title) => title.split(' — ')[0];

export default function PipelineStage({
    root,
    chain, // [root, …, current node]
    sequence, // pre-order entries from sequenceOf(root)
    cursor, // index of the current node in that sequence
    depth, // rails to draw — maxDepth(root)
    playing,
    onSelect, // (index) => void
    ariaLabel,
}) {
    const indexOf = useMemo(
        () => new Map(sequence.map((entry) => [entry.node, entry.index])),
        [sequence]
    );
    const onPath = new Set(chain);
    const current = chain.at(-1);
    const rails = Array.from({ length: depth }, (_, level) => ({
        parent: chain[level],
        items: chain[level]?.children ?? [],
    }));

    const stateOf = (node) => {
        if (node === current) return 'current';
        if (onPath.has(node)) return 'on-path';
        return indexOf.get(node) < cursor ? 'done' : 'upcoming';
    };

    const phases = root.children?.length ?? 0;

    return (
        <div className={`pipe${playing ? ' is-playing' : ''}`} role="group" aria-label={ariaLabel}>
            <button
                type="button"
                className={`pipe-root${current === root ? ' current' : ''}`}
                onClick={() => onSelect(0)}
                aria-current={current === root ? 'step' : undefined}
                aria-label={root.title}
            >
                <span className="pipe-root-title">{root.title}</span>
                <span className="pipe-root-meta">
                    overview · {phases} phases · {sequence.length} stops
                </span>
            </button>

            {rails.map((rail, level) => (
                <div key={level} className={`pipe-rail${rail.items.length ? '' : ' is-empty'}`}>
                    <div className="pipe-rail-label">
                        {level === 0
                            ? 'phases'
                            : rail.parent
                              ? `↳ inside ${shortTitle(rail.parent.title)}`
                              : '↳ sub-phases'}
                    </div>
                    {rail.items.length ? (
                        <ol className="pipe-flow">
                            {rail.items.map((node, i) => {
                                const state = stateOf(node);
                                const index = indexOf.get(node);
                                const passed = index <= cursor;
                                const entering = index === cursor;
                                const inside = node.children?.length;
                                return (
                                    <li key={node.id} className="pipe-cell">
                                        {i > 0 && (
                                            <span
                                                // Re-keyed per move so the dot animates each time.
                                                key={entering ? `entering-${cursor}` : 'arrow'}
                                                className={`pipe-arrow${passed ? ' passed' : ''}${
                                                    entering ? ' entering' : ''
                                                }`}
                                                aria-hidden="true"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className={`pipe-box ${state}`}
                                            onClick={() => onSelect(index)}
                                            aria-current={state === 'current' ? 'step' : undefined}
                                            // The name is the title alone; the foot is meta.
                                            aria-label={node.title}
                                            title={node.title}
                                        >
                                            <span className="pipe-box-title">
                                                {shortTitle(node.title)}
                                            </span>
                                            <span className="pipe-box-foot">
                                                <span
                                                    className={`dd-dot prov-dot-${node.provenance}`}
                                                    aria-hidden="true"
                                                />
                                                {inside
                                                    ? `${inside} inside`
                                                    : node.stage
                                                      ? 'live panel'
                                                      : 'detail'}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <div className="pipe-track" aria-hidden="true" />
                    )}
                </div>
            ))}
        </div>
    );
}
