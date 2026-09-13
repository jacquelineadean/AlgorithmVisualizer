import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Caveat, EvidenceRow, EvidenceSection } from '../evidence/Evidence';
import { pathOf, resolvePath } from './model';
import './Drilldown.css';

// The third renderer tier (Phase 4a): for systems that are *architectures*
// rather than step sequences. Where <TraceInstrument> plays a trace, this
// plays a tree — breadcrumb zoom, child cards, per-node evidence, and a
// focused stage on the nodes that carry one.
//
// It is the same bargain as the trace contract: the visualization supplies
// content (a map, sources, stage renderers), the instrument owns behavior
// (current node, deep links, keyboard navigation, evidence layout). The
// evidence gate applies per node, so an uncited component cannot ship.
//
// Contract documented in docs/CONTRACTS.md.

function NodeCard({ node, sources, selected, onOpen }) {
    const isLeaf = !node.children?.length;
    return (
        <button
            type="button"
            className={`dd-card${selected ? ' selected' : ''}${isLeaf ? ' leaf' : ''}`}
            onClick={onOpen}
        >
            <span className="dd-card-head">
                <span className="dd-card-title">{node.title}</span>
                <span className={`dd-dot prov-dot-${node.provenance}`} aria-hidden="true" />
            </span>
            <span className="dd-card-summary">{node.summary}</span>
            <span className="dd-card-foot">
                <span className="dd-card-refs">
                    {node.sourceRefs.map((ref) => ref.key).join(' · ')}
                </span>
                <span className="dd-card-more">
                    {isLeaf ? (node.stage ? 'open ›' : 'detail ›') : `${node.children.length} inside ›`}
                </span>
            </span>
        </button>
    );
}

export default function DrilldownInstrument({
    map, // { root } — rebuilt by the caller when inputs change
    sources,
    controls, // node rendered in the controls card
    stageKinds = {}, // { kind: Component } for node.stage
    error,
    urlParams, // extra inputs serialized alongside ?node=
    ariaLabel = 'Architecture map',
    evidenceIntro = 'Every node above cites at least one of these sources — the per-node gate fails otherwise. Provenance classes:',
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [path, setPath] = useState(() => searchParams.get('node') ?? '');
    const [cursor, setCursor] = useState(0);
    const root = map?.root;
    const gridRef = useRef(null);

    const chain = useMemo(() => (root ? resolvePath(root, path) : []), [root, path]);
    const node = chain.at(-1);
    const children = node?.children ?? [];
    const canonicalPath = chain.length ? pathOf(chain) : '';

    // Single write point for the hash query, matching TraceInstrument's
    // contract: inputs plus the canonical node path, replace-style.
    const urlJson = JSON.stringify(urlParams ?? {});
    useEffect(() => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                for (const [key, value] of Object.entries(urlParams ?? {})) {
                    next.set(key, String(value));
                }
                if (canonicalPath) next.set('node', canonicalPath);
                else next.delete('node');
                return next;
            },
            { replace: true }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlJson, canonicalPath, setSearchParams]);

    const openChild = (child) => {
        setPath(canonicalPath ? `${canonicalPath}.${child.id}` : child.id);
        setCursor(0);
    };

    const goTo = (index) => {
        setPath(pathOf(chain.slice(0, index + 1)));
        setCursor(0);
    };

    const goUp = () => {
        if (chain.length > 1) goTo(chain.length - 2);
    };

    // Keyboard: ↑/↓ move the cursor over children, →/Enter descend,
    // ←/Backspace ascend. Form fields and browser shortcuts are never
    // hijacked — same guards as the step player.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const tag = event.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
            if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
                goUp();
            } else if (children.length) {
                if (event.key === 'ArrowDown') {
                    setCursor((c) => Math.min(c + 1, children.length - 1));
                } else if (event.key === 'ArrowUp') {
                    setCursor((c) => Math.max(c - 1, 0));
                } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
                    if (event.target === document.body) openChild(children[cursor]);
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
        } catch {
            /* Clipboard unavailable — ignore. */
        }
    };

    if (error || !root) {
        return (
            <div className="dd">
                <div className="card ti-controls">{controls}</div>
                <div className="card ti-error">{error ?? 'No map to render.'}</div>
                <EvidenceSection sources={sources} intro={evidenceIntro} />
            </div>
        );
    }

    const StageView = node.stage ? stageKinds[node.stage.kind] : null;
    const layout = node.layout ?? 'grid';

    return (
        <div className="dd">
            {controls && <div className="card ti-controls">{controls}</div>}

            <nav className="dd-crumbs" aria-label="Map location">
                {chain.map((item, index) => (
                    <span key={item.id} className="dd-crumb-wrap">
                        {index > 0 && <span className="dd-crumb-sep">›</span>}
                        <button
                            type="button"
                            className={`dd-crumb${index === chain.length - 1 ? ' current' : ''}`}
                            onClick={() => goTo(index)}
                        >
                            {item.title}
                        </button>
                    </span>
                ))}
                <span className="dd-crumb-actions">
                    {chain.length > 1 && (
                        <button type="button" className="pill-button secondary dd-up" onClick={goUp}>
                            ‹ Up
                        </button>
                    )}
                    <button type="button" className="pill-button secondary dd-up" onClick={copyLink}>
                        Copy link
                    </button>
                </span>
            </nav>

            <div className="card dd-node">
                <div className="dd-node-head">
                    <div>
                        <h3>{node.title}</h3>
                        <p className="dd-node-summary">{node.summary}</p>
                    </div>
                    <EvidenceRow
                        provenance={node.provenance}
                        refs={node.sourceRefs}
                        sources={sources}
                    />
                </div>
                {node.detail && <p className="dd-node-detail">{node.detail}</p>}
                {node.metrics && (
                    <dl className="value-grid">
                        {node.metrics.map((metric) => (
                            <div className="value-item" key={metric.label}>
                                <dt>{metric.label}</dt>
                                <dd>{String(metric.value)}</dd>
                            </div>
                        ))}
                    </dl>
                )}
                {StageView && (
                    <div className="dd-stage">
                        <StageView data={node.stage.data} node={node} />
                    </div>
                )}
                <Caveat caveat={node.caveat} sources={sources} />
            </div>

            {children.length > 0 && (
                <div
                    className={`dd-grid layout-${layout}`}
                    ref={gridRef}
                    role="group"
                    aria-label={`${node.title} — components`}
                >
                    {children.map((child, index) => (
                        <div className="dd-cell" key={child.id}>
                            {layout === 'flow' && index > 0 && (
                                <span className="dd-arrow" aria-hidden="true">
                                    →
                                </span>
                            )}
                            <NodeCard
                                node={child}
                                sources={sources}
                                selected={index === cursor}
                                onOpen={() => openChild(child)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <p className="dd-hint" aria-label={ariaLabel}>
                Click a component to zoom in · ↑↓ to move, → to enter, ← to go back · every
                node carries its own citation.
            </p>

            <EvidenceSection sources={sources} intro={evidenceIntro} />
        </div>
    );
}
