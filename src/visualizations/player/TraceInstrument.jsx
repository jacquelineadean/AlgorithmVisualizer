import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Caveat, EvidenceRow, EvidenceSection } from '../evidence/Evidence';
import './StepPlayer.css';

// The shared instrument every trace-based visualization renders through:
// controls card → stage → player controls → step list + detail card →
// evidence section. A visualization supplies content (trace, sources,
// stage, controls, custom detail kinds); this component owns behavior
// (current step, autoplay, keyboard navigation, layout).
//
// Contract documented in docs/CONTRACTS.md.

const fmt = (v) => String(v);

/* --- Built-in step.kind renderers ----------------------------------------- */

function ValuesView({ data }) {
    return (
        <dl className="value-grid">
            {data.values.map(({ label, value }) => (
                <div className="value-item" key={label}>
                    <dt>{label}</dt>
                    <dd>{fmt(value)}</dd>
                </div>
            ))}
        </dl>
    );
}

function FormulaView({ data }) {
    return (
        <div className="math-block">
            {data.caption && <div className="math-caption">{data.caption}</div>}
            {data.lines.map((line, i) => (
                <div className="math-line" key={i}>
                    {line}
                </div>
            ))}
            {data.result != null && <div className="math-line result">{data.result}</div>}
        </div>
    );
}

function BlocksView({ data }) {
    return (
        <div className="block-chips">
            {data.blocks.map((block, i) => (
                <span className={`block-chip${block.masked ? ' masked' : ''}`} key={i}>
                    {block.masked ? fmt(block.to) : `${fmt(block.from)} → ${fmt(block.to)}`}
                </span>
            ))}
        </div>
    );
}

// Square-and-multiply working table (RSA encryption/decryption, DH publics
// and shared secrets — the second consumer that earned it built-in status).
function SqmulView({ data }) {
    return (
        <div>
            {data.mapping && (
                <div className="block-chips">
                    {data.mapping.map(({ char, from, to }, i) => (
                        <span className="block-chip" key={i}>
                            {char ? `${char}: ` : ''}
                            {fmt(from)} → {fmt(to)}
                        </span>
                    ))}
                </div>
            )}
            <div className="math-block">
                <div className="math-caption">{data.focus.caption}</div>
                <table className="sqmul-table">
                    <thead>
                        <tr>
                            <th>bit</th>
                            <th>square</th>
                            <th>× base?</th>
                            <th>value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.focus.rows.map((row, i) => (
                            <tr key={i}>
                                <td>{row.bit}</td>
                                <td>{fmt(row.squared)}</td>
                                <td>{row.bit === '1' ? 'yes' : '—'}</td>
                                <td>{fmt(row.value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="math-line result">result = {fmt(data.focus.result)}</div>
            </div>
        </div>
    );
}

export const BUILTIN_KINDS = {
    values: ValuesView,
    formula: FormulaView,
    blocks: BlocksView,
    sqmul: SqmulView,
};

/* --- Pieces ---------------------------------------------------------------- */

function StepDetailCard({ step, sources, kinds }) {
    const KindView = step.kind ? kinds[step.kind] : null;
    return (
        <div className="step-detail">
            <div className="step-detail-head">
                <h3>{step.title}</h3>
                <EvidenceRow
                    provenance={step.provenance}
                    refs={step.sourceRefs}
                    sources={sources}
                />
            </div>
            <p className="step-explanation">{step.explanation}</p>
            {KindView && <KindView data={step.data} step={step} />}
            <Caveat caveat={step.caveat} sources={sources} />
        </div>
    );
}

function StepList({ steps, acts, listLabel, currentIndex, onSelect }) {
    const renderItems = (filter) =>
        steps.map((step, index) =>
            filter(step) ? (
                <li key={step.id}>
                    <button
                        type="button"
                        className={`step-item${index === currentIndex ? ' current' : ''}${
                            index < currentIndex ? ' done' : ''
                        }`}
                        onClick={() => onSelect(index)}
                    >
                        <span className="step-num">{index + 1}</span>
                        {step.title}
                    </button>
                </li>
            ) : null
        );

    if (!acts) {
        return (
            <nav className="step-list" aria-label="Steps">
                {listLabel && <div className="act-name">{listLabel}</div>}
                <ol>{renderItems(() => true)}</ol>
            </nav>
        );
    }
    return (
        <nav className="step-list" aria-label="Steps">
            {acts.map((act) => (
                <div key={act.id} className="act-group">
                    <div className="act-name">
                        {act.name}
                        {act.actor && <span className="act-actor"> · {act.actor}</span>}
                    </div>
                    <ol>{renderItems((step) => step.act === act.id)}</ol>
                </div>
            ))}
        </nav>
    );
}

/* --- The instrument -------------------------------------------------------- */

export default function TraceInstrument({
    trace, // { steps, artifacts } — rebuilt by the caller when inputs change
    sources, // citation database for the evidence UI
    acts, // optional [{id, name, actor}] to group the step list
    listLabel, // group label when there are no acts
    renderStage, // ({ steps, stepIndex, artifacts, streamIndex, streamDone }) => node
    controls, // node rendered inside the controls card
    detailKinds, // optional { kind: Component } — merged over built-ins
    error, // string → renders an error card instead of stage/player
    urlParams, // optional { key: stringable } — inputs serialized to the hash query
    playIntervalMs = 2800,
    evidenceIntro = 'Every step above cites at least one of these sources — the suite fails otherwise. Provenance classes:',
}) {
    const steps = trace?.steps ?? [];
    const [searchParams, setSearchParams] = useSearchParams();
    // Deep links carry the step as 1-based ?s=N; read once on mount.
    const [stepIndex, setStepIndex] = useState(() => {
        const s = Number.parseInt(searchParams.get('s') ?? '', 10);
        return Number.isFinite(s) && s > 0 ? s - 1 : 0;
    });
    const [playing, setPlaying] = useState(false);
    const [copied, setCopied] = useState(false);
    const clampedIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
    const currentStep = steps[clampedIndex];
    const kinds = { ...BUILTIN_KINDS, ...detailKinds };

    // Stream channel: events animated *within* the current step. Arriving at
    // a streamed step replays it from the start; Next (and →) complete a
    // running stream before advancing.
    const stream = currentStep?.stream;
    const streamLength = stream?.events.length ?? 0;
    const [streamIndex, setStreamIndex] = useState(0);
    const streamDone = streamIndex >= streamLength;

    useEffect(() => {
        setStreamIndex(0);
    }, [clampedIndex, trace]);

    useEffect(() => {
        if (!stream || streamLength === 0) return undefined;
        const tick = stream.tick ?? 40;
        const batch = stream.batch ?? 1;
        const id = setInterval(() => {
            setStreamIndex((prev) => {
                const next = Math.min(prev + batch, streamLength);
                if (next >= streamLength) clearInterval(id);
                return next;
            });
        }, tick);
        return () => clearInterval(id);
    }, [stream, streamLength, clampedIndex, trace]);

    const goTo = (index) => {
        setPlaying(false);
        setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    };

    const goPrev = () => {
        setPlaying(false);
        setStepIndex((i) => Math.max(i - 1, 0));
    };

    const goNext = () => {
        setPlaying(false);
        if (!streamDone) {
            setStreamIndex(streamLength);
            return;
        }
        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    };

    // Autoplay: advance only once the current step's stream has finished.
    useEffect(() => {
        if (!playing || steps.length === 0 || !streamDone) return undefined;
        if (clampedIndex >= steps.length - 1) {
            setPlaying(false);
            return undefined;
        }
        const dwell = stream ? Math.min(playIntervalMs, 1400) : playIntervalMs;
        const id = setTimeout(
            () => setStepIndex((i) => Math.min(i + 1, steps.length - 1)),
            dwell
        );
        return () => clearTimeout(id);
    }, [playing, streamDone, clampedIndex, steps.length, playIntervalMs, stream]);

    // Arrow-key navigation; never hijacks form fields or browser shortcuts.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const tag = event.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
            if (event.key === 'ArrowRight') goNext();
            if (event.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    // Serialize inputs + step into the hash query. One write point (inputs
    // arrive via urlParams) so writers never clobber each other; replace
    // keeps history clean. Reads happen once, in each component's initial
    // state — pasted links restore inputs and step.
    const urlJson = JSON.stringify(urlParams ?? {});
    useEffect(() => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                for (const [key, value] of Object.entries(urlParams ?? {})) {
                    next.set(key, String(value));
                }
                next.set('s', String(clampedIndex + 1));
                return next;
            },
            { replace: true }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlJson, clampedIndex, setSearchParams]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* Clipboard unavailable (permissions, non-secure context) — ignore. */
        }
    };

    return (
        <div className="ti">
            <div className="card ti-controls">{controls}</div>

            {error ? (
                <div className="card ti-error">{error}</div>
            ) : (
                <>
                    <div className="card ti-stage">
                        {renderStage({
                            steps,
                            stepIndex: clampedIndex,
                            artifacts: trace.artifacts,
                            streamIndex,
                            streamDone,
                        })}
                    </div>

                    <div className="ti-player" role="group" aria-label="Step controls">
                        <button
                            type="button"
                            className="pill-button secondary"
                            onClick={goPrev}
                            disabled={clampedIndex === 0}
                        >
                            ‹ Prev
                        </button>
                        <div className="player-progress">
                            <span className="player-count" aria-live="polite">
                                Step {clampedIndex + 1} / {steps.length}
                            </span>
                            <div className="player-rail">
                                <div
                                    className="player-fill"
                                    style={{
                                        width: `${((clampedIndex + 1) / steps.length) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            className="pill-button secondary"
                            onClick={goNext}
                            disabled={clampedIndex === steps.length - 1 && streamDone}
                        >
                            Next ›
                        </button>
                        <button
                            type="button"
                            className="pill-button"
                            onClick={() => {
                                if (playing) {
                                    setPlaying(false);
                                } else {
                                    if (clampedIndex >= steps.length - 1) setStepIndex(0);
                                    setPlaying(true);
                                }
                            }}
                        >
                            {playing ? 'Pause' : 'Play'}
                        </button>
                        <button
                            type="button"
                            className="pill-button secondary"
                            onClick={copyLink}
                            title="Copy a link that restores these inputs and this step"
                        >
                            {copied ? 'Copied ✓' : 'Copy link'}
                        </button>
                    </div>

                    <div className="ti-columns">
                        <StepList
                            steps={steps}
                            acts={acts}
                            listLabel={listLabel}
                            currentIndex={clampedIndex}
                            onSelect={goTo}
                        />
                        <div className="card ti-detail">
                            {currentStep && (
                                <StepDetailCard
                                    step={currentStep}
                                    sources={sources}
                                    kinds={kinds}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}

            <EvidenceSection sources={sources} intro={evidenceIntro} />
        </div>
    );
}
