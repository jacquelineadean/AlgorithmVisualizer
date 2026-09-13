import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Caveat, EvidenceRow, EvidenceSection } from '../evidence/Evidence';
import Transport from '../player/Transport';
import useStickyInstrument from '../player/useStickyInstrument';
import PipelineStage from './PipelineStage';
import { maxDepth, pathOf, resolvePath, sequenceOf } from './model';
import '../player/StepPlayer.css';
import './Drilldown.css';

// The third renderer tier (Phase 4a, reworked as a phase player): for
// systems that are *architectures* rather than step sequences. Where
// <TraceInstrument> plays a trace, this plays a tree — but with the same
// instrument shape: a fixed graphic (the pipeline, drawn as rails) and a
// transport that steps through every phase and sub-phase in pre-order, or
// plays through end to end. Below it, the focused node's prose, metrics,
// live panel, and citations.
//
// It is the same bargain as the trace contract: the visualization supplies
// content (a map, sources, stage renderers), the instrument owns behavior
// (cursor, autoplay, deep links, keyboard navigation, layout). The evidence
// gate applies per node, so an uncited component cannot ship.
//
// Contract documented in docs/CONTRACTS.md.

export default function DrilldownInstrument({
    map, // { root } — rebuilt by the caller when inputs change
    sources,
    controls, // node rendered in the controls card
    stageKinds = {}, // { kind: Component } for node.stage
    error,
    urlParams, // extra inputs serialized alongside ?node=
    ariaLabel = 'Architecture map',
    playIntervalMs = 3200,
    evidenceIntro = 'Every node above cites at least one of these sources — the per-node gate fails otherwise. Provenance classes:',
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    // Deep links carry the node path; read once on mount. A path that no
    // longer resolves degrades to the deepest node that still exists.
    const [path, setPath] = useState(() => searchParams.get('node') ?? '');
    const [playing, setPlaying] = useState(false);
    const [copied, setCopied] = useState(false);
    const root = map?.root;
    const instrumentRef = useRef(null);
    const { sticky, height: instrumentHeight } = useStickyInstrument(instrumentRef, !!root && !error);

    const sequence = useMemo(() => (root ? sequenceOf(root) : []), [root]);
    const depth = useMemo(() => (root ? maxDepth(root) : 0), [root]);
    const chain = useMemo(() => (root ? resolvePath(root, path) : []), [root, path]);
    const node = chain.at(-1);
    const canonicalPath = chain.length ? pathOf(chain) : '';
    const cursor = Math.max(
        0,
        sequence.findIndex((entry) => entry.path === canonicalPath)
    );
    const last = sequence.length - 1;

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

    const goTo = (index) => {
        setPlaying(false);
        const entry = sequence[Math.max(0, Math.min(index, last))];
        if (entry) setPath(entry.path);
    };
    const goPrev = () => goTo(cursor - 1);
    const goNext = () => goTo(cursor + 1);
    const goUp = () => {
        if (chain.length > 1) goTo(sequence.findIndex((entry) => entry.node === chain.at(-2)));
    };
    const goDown = () => {
        const child = node?.children?.[0];
        if (child) goTo(sequence.findIndex((entry) => entry.node === child));
    };

    // Play from the current phase; at the end, play again from the start.
    const togglePlay = () => {
        if (playing) {
            setPlaying(false);
            return;
        }
        if (cursor >= last) setPath('');
        setPlaying(true);
    };

    // Autoplay walks the pre-order sequence and stops on the last phase.
    useEffect(() => {
        if (!playing || sequence.length === 0) return undefined;
        if (cursor >= last) {
            setPlaying(false);
            return undefined;
        }
        const id = setTimeout(() => setPath(sequence[cursor + 1].path), playIntervalMs);
        return () => clearTimeout(id);
    }, [playing, cursor, last, sequence, playIntervalMs]);

    // Keyboard: ←/→ previous and next phase (as on the trace player), ↑ up
    // a level, ↓ into the first sub-phase, Backspace up. Form fields and
    // browser shortcuts are never hijacked — same guards as the step player.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const tag = event.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
            if (event.key === 'ArrowRight') goNext();
            else if (event.key === 'ArrowLeft') goPrev();
            else if (event.key === 'ArrowUp' || event.key === 'Backspace') goUp();
            else if (event.key === 'ArrowDown') goDown();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* Clipboard unavailable (permissions, non-secure context) — ignore. */
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
    const inside = node.children?.length ?? 0;

    return (
        <div className="dd" style={{ '--instrument-height': `${instrumentHeight}px` }}>
            {controls && <div className="card ti-controls">{controls}</div>}

            <div ref={instrumentRef} className={`ti-instrument${sticky ? ' is-sticky' : ''}`}>
                <div className="card ti-stage dd-pipeline">
                    <PipelineStage
                        root={root}
                        chain={chain}
                        sequence={sequence}
                        cursor={cursor}
                        depth={depth}
                        playing={playing}
                        onSelect={goTo}
                        ariaLabel={ariaLabel}
                    />
                </div>
                <Transport
                    unit="Phase"
                    index={cursor}
                    count={sequence.length}
                    playing={playing}
                    canPrev={cursor > 0}
                    canNext={cursor < last}
                    onPrev={goPrev}
                    onNext={goNext}
                    onTogglePlay={togglePlay}
                    onCopy={copyLink}
                    copied={copied}
                />
            </div>

            <div className="card dd-node">
                <nav className="dd-crumbs" aria-label="Map location">
                    {chain.map((item, index) => (
                        <span key={item.id} className="dd-crumb-wrap">
                            {index > 0 && <span className="dd-crumb-sep">›</span>}
                            <button
                                type="button"
                                className={`dd-crumb${index === chain.length - 1 ? ' current' : ''}`}
                                onClick={() =>
                                    goTo(sequence.findIndex((entry) => entry.node === item))
                                }
                            >
                                {item.title}
                            </button>
                        </span>
                    ))}
                    {chain.length > 1 && (
                        <span className="dd-crumb-actions">
                            <button
                                type="button"
                                className="pill-button secondary dd-up"
                                onClick={goUp}
                            >
                                ‹ Up a level
                            </button>
                        </span>
                    )}
                </nav>
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
                {inside > 0 && (
                    <p className="dd-inside">
                        {inside} sub-phase{inside === 1 ? '' : 's'} inside —{' '}
                        {node.children.map((child) => child.title).join(' · ')}. Next steps into
                        the first; the rail above jumps to any.
                    </p>
                )}
            </div>

            <p className="dd-hint">
                Click any phase on the rails to jump there · ← → step · ↑ up a level · ↓ into
                the sub-phases · play walks the whole pipeline · every node carries its own
                citation.
            </p>

            <EvidenceSection sources={sources} intro={evidenceIntro} />
        </div>
    );
}
