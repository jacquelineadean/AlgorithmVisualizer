import { useEffect, useState } from 'react';
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
    renderStage, // ({ steps, stepIndex, artifacts }) => node
    controls, // node rendered inside the controls card
    detailKinds, // optional { kind: Component } — merged over built-ins
    error, // string → renders an error card instead of stage/player
    playIntervalMs = 2800,
    evidenceIntro = 'Every step above cites at least one of these sources — the suite fails otherwise. Provenance classes:',
}) {
    const steps = trace?.steps ?? [];
    const [stepIndex, setStepIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const clampedIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
    const currentStep = steps[clampedIndex];
    const kinds = { ...BUILTIN_KINDS, ...detailKinds };

    const goTo = (index) => {
        setPlaying(false);
        setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    };

    useEffect(() => {
        if (!playing || steps.length === 0) return undefined;
        const id = setInterval(() => {
            setStepIndex((index) => {
                if (index >= steps.length - 1) {
                    setPlaying(false);
                    return index;
                }
                return index + 1;
            });
        }, playIntervalMs);
        return () => clearInterval(id);
    }, [playing, steps.length, playIntervalMs]);

    // Arrow-key navigation; never hijacks form fields or browser shortcuts.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const tag = event.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
            if (event.key === 'ArrowRight') {
                setPlaying(false);
                setStepIndex((i) => Math.min(i + 1, steps.length - 1));
            }
            if (event.key === 'ArrowLeft') {
                setPlaying(false);
                setStepIndex((i) => Math.max(i - 1, 0));
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [steps.length]);

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
                        })}
                    </div>

                    <div className="ti-player" role="group" aria-label="Step controls">
                        <button
                            type="button"
                            className="pill-button secondary"
                            onClick={() => goTo(clampedIndex - 1)}
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
                            onClick={() => goTo(clampedIndex + 1)}
                            disabled={clampedIndex === steps.length - 1}
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
