import { useEffect, useMemo, useRef, useState } from 'react';
import { PRIMES, randomPrimePair, validPublicExponents } from './math';
import { ACTS, buildRsaTrace, suggestPublicExponent } from './trace';
import { SOURCES } from './sources';
import { Caveat, EvidenceRow, EvidenceSection } from '../evidence/Evidence';
import ProtocolLane from './ProtocolLane';
import './RsaVisualizer.css';

const fmt = (v) => String(v);

function StepDetail({ step }) {
    return (
        <div className="step-detail">
            <div className="step-detail-head">
                <h3>{step.title}</h3>
                <EvidenceRow
                    provenance={step.provenance}
                    refs={step.sourceRefs}
                    sources={SOURCES}
                />
            </div>
            <p className="step-explanation">{step.explanation}</p>
            <StepData step={step} />
            <Caveat caveat={step.caveat} sources={SOURCES} />
        </div>
    );
}

function StepData({ step }) {
    const { kind, data } = step;

    if (kind === 'values') {
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

    if (kind === 'egcd') {
        return (
            <div className="math-block">
                <div className="math-caption">
                    Extended Euclid on ({fmt(data.e)}, {fmt(data.phi)}) — each line divides
                    the previous pair:
                </div>
                {data.rows.map(({ a, b, q, r }, i) => (
                    <div className="math-line" key={i}>
                        {fmt(a)} = {fmt(q)} × {fmt(b)} + {fmt(r)}
                    </div>
                ))}
                <div className="math-line result">
                    back-substitute ⇒ d = e⁻¹ mod φ(n) = {fmt(data.d)}
                </div>
            </div>
        );
    }

    if (kind === 'blocks') {
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

    if (kind === 'sqmul') {
        return (
            <div>
                <div className="block-chips">
                    {data.mapping.map(({ char, from, to }, i) => (
                        <span className="block-chip" key={i}>
                            {char ? `${char}: ` : ''}
                            {fmt(from)} → {fmt(to)}
                        </span>
                    ))}
                </div>
                <div className="math-block">
                    <div className="math-caption">
                        Square-and-multiply, {data.focus.label} (first block):
                    </div>
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

    if (kind === 'proof') {
        return (
            <div className="math-block">
                {data.lines.map((line, i) => (
                    <div className="math-line" key={i}>
                        {line}
                    </div>
                ))}
            </div>
        );
    }

    return null;
}

export default function RsaVisualizer() {
    const [message, setMessage] = useState('HELLO');
    const [pStr, setPStr] = useState('61');
    const [qStr, setQStr] = useState('53');
    const [eStr, setEStr] = useState('17');
    const [stepIndex, setStepIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const playRef = useRef(null);

    const p = BigInt(pStr);
    const q = BigInt(qStr);
    const phi = (p - 1n) * (q - 1n);
    const eOptions = useMemo(() => validPublicExponents(phi), [phi]);

    // Snap e back to a valid choice when a prime change invalidates it.
    useEffect(() => {
        if (!eOptions.some((option) => option === BigInt(eStr))) {
            setEStr(fmt(suggestPublicExponent(phi)));
        }
    }, [eOptions, eStr, phi]);

    const built = useMemo(() => {
        try {
            return { trace: buildRsaTrace({ message, p, q, e: BigInt(eStr) }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [message, p, q, eStr]);

    const steps = built.trace?.steps ?? [];
    const clampedIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
    const currentStep = steps[clampedIndex];

    const stopPlaying = () => setPlaying(false);

    const goTo = (index) => {
        stopPlaying();
        setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    };

    // Autoplay.
    useEffect(() => {
        if (!playing || steps.length === 0) return undefined;
        playRef.current = setInterval(() => {
            setStepIndex((index) => {
                if (index >= steps.length - 1) {
                    setPlaying(false);
                    return index;
                }
                return index + 1;
            });
        }, 3000);
        return () => clearInterval(playRef.current);
    }, [playing, steps.length]);

    // Arrow-key navigation, ignoring keystrokes inside form fields.
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

    const randomize = () => {
        const [nextP, nextQ] = randomPrimePair();
        setPStr(fmt(nextP));
        setQStr(fmt(nextQ));
    };

    return (
        <div className="rsa">
            {/* Inputs */}
            <div className="card rsa-controls">
                <label className="control">
                    <span className="control-label">Message</span>
                    <input
                        type="text"
                        value={message}
                        maxLength={16}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="HELLO"
                    />
                </label>
                <label className="control">
                    <span className="control-label">Prime p</span>
                    <select value={pStr} onChange={(event) => setPStr(event.target.value)}>
                        {PRIMES.map((prime) => (
                            <option key={fmt(prime)} value={fmt(prime)} disabled={fmt(prime) === qStr}>
                                {fmt(prime)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="control">
                    <span className="control-label">Prime q</span>
                    <select value={qStr} onChange={(event) => setQStr(event.target.value)}>
                        {PRIMES.map((prime) => (
                            <option key={fmt(prime)} value={fmt(prime)} disabled={fmt(prime) === pStr}>
                                {fmt(prime)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="control">
                    <span className="control-label">Exponent e</span>
                    <select value={eStr} onChange={(event) => setEStr(event.target.value)}>
                        {eOptions.map((option) => (
                            <option key={fmt(option)} value={fmt(option)}>
                                {fmt(option)}
                            </option>
                        ))}
                    </select>
                </label>
                <button type="button" className="pill-button secondary" onClick={randomize}>
                    Surprise me
                </button>
            </div>

            {built.error ? (
                <div className="card rsa-error">{built.error}</div>
            ) : (
                <>
                    {/* Stage */}
                    <div className="card rsa-stage">
                        <ProtocolLane
                            steps={steps}
                            stepIndex={clampedIndex}
                            artifacts={built.trace.artifacts}
                        />
                    </div>

                    {/* Player controls */}
                    <div className="rsa-player" role="group" aria-label="Step controls">
                        <button
                            type="button"
                            className="pill-button secondary"
                            onClick={() => goTo(clampedIndex - 1)}
                            disabled={clampedIndex === 0}
                        >
                            ‹ Prev
                        </button>
                        <div className="player-progress">
                            <span className="player-count">
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
                                    stopPlaying();
                                } else {
                                    if (clampedIndex >= steps.length - 1) setStepIndex(0);
                                    setPlaying(true);
                                }
                            }}
                        >
                            {playing ? 'Pause' : 'Play'}
                        </button>
                    </div>

                    {/* Steps + detail */}
                    <div className="rsa-columns">
                        <nav className="step-list" aria-label="Steps">
                            {ACTS.map((act) => (
                                <div key={act.id} className="act-group">
                                    <div className="act-name">
                                        {act.name}
                                        <span className="act-actor"> · {act.actor}</span>
                                    </div>
                                    <ol>
                                        {steps.map((step, index) =>
                                            step.act === act.id ? (
                                                <li key={step.id}>
                                                    <button
                                                        type="button"
                                                        className={`step-item${
                                                            index === clampedIndex ? ' current' : ''
                                                        }${index < clampedIndex ? ' done' : ''}`}
                                                        onClick={() => goTo(index)}
                                                    >
                                                        <span className="step-num">{index + 1}</span>
                                                        {step.title}
                                                    </button>
                                                </li>
                                            ) : null
                                        )}
                                    </ol>
                                </div>
                            ))}
                        </nav>
                        <div className="card detail-card">
                            {currentStep && <StepDetail step={currentStep} />}
                        </div>
                    </div>
                </>
            )}

            {/* Evidence legend + references */}
            <EvidenceSection
                sources={SOURCES}
                intro="Every step above cites at least one of these sources — the suite fails otherwise. Provenance classes:"
            />
        </div>
    );
}
