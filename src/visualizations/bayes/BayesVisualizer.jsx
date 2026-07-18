import { useEffect, useMemo, useState } from 'react';
import { buildBayesTrace } from './trace';
import { SOURCES } from './sources';
import { Caveat, EvidenceRow, EvidenceSection } from '../evidence/Evidence';
import PopulationGrid from './PopulationGrid';
import './BayesVisualizer.css';

// Slider spec: [state key, label, min, max, step] in percent units.
const SLIDERS = [
    ['prior', 'Prevalence (prior)', 0.1, 20, 0.1],
    ['sensitivity', 'Sensitivity', 50, 100, 0.1],
    ['falsePositiveRate', 'False-positive rate', 0, 30, 0.1],
];

// The classic mammography defaults (Eddy 1982): 1% / 80% / 9.6%.
const DEFAULTS = { prior: 1.0, sensitivity: 80, falsePositiveRate: 9.6 };

function StepData({ step }) {
    const { kind, data } = step;
    if (kind === 'stat') {
        return (
            <dl className="value-grid">
                {data.values.map(({ label, value }) => (
                    <div className="value-item" key={label}>
                        <dt>{label}</dt>
                        <dd>{String(value)}</dd>
                    </div>
                ))}
            </dl>
        );
    }
    if (kind === 'formula') {
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

export default function BayesVisualizer() {
    const [params, setParams] = useState(DEFAULTS);
    const [stepIndex, setStepIndex] = useState(0);
    const [playing, setPlaying] = useState(false);

    const { steps, artifacts } = useMemo(
        () =>
            buildBayesTrace({
                prior: params.prior / 100,
                sensitivity: params.sensitivity / 100,
                falsePositiveRate: params.falsePositiveRate / 100,
            }),
        [params]
    );

    const clampedIndex = Math.min(stepIndex, steps.length - 1);
    const currentStep = steps[clampedIndex];

    const goTo = (index) => {
        setPlaying(false);
        setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    };

    useEffect(() => {
        if (!playing) return undefined;
        const id = setInterval(() => {
            setStepIndex((index) => {
                if (index >= steps.length - 1) {
                    setPlaying(false);
                    return index;
                }
                return index + 1;
            });
        }, 2600);
        return () => clearInterval(id);
    }, [playing, steps.length]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const tag = event.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
            if (event.key === 'ArrowRight') goTo(clampedIndex + 1);
            if (event.key === 'ArrowLeft') goTo(clampedIndex - 1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    return (
        <div className="bayes">
            <div className="card bayes-controls">
                {SLIDERS.map(([key, label, min, max, step]) => (
                    <label className="slider" key={key}>
                        <span className="slider-label">{label}</span>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={params[key]}
                            onChange={(event) =>
                                setParams((prev) => ({
                                    ...prev,
                                    [key]: Number(event.target.value),
                                }))
                            }
                        />
                        <span className="slider-value">{params[key].toFixed(1)}%</span>
                    </label>
                ))}
                <button
                    type="button"
                    className="pill-button secondary"
                    onClick={() => setParams(DEFAULTS)}
                >
                    Classic example
                </button>
            </div>

            <div className="card bayes-stage">
                <PopulationGrid steps={steps} stepIndex={clampedIndex} artifacts={artifacts} />
            </div>

            <div className="bayes-player" role="group" aria-label="Step controls">
                <button
                    type="button"
                    className="pill-button secondary"
                    onClick={() => goTo(clampedIndex - 1)}
                    disabled={clampedIndex === 0}
                >
                    ‹ Prev
                </button>
                <span className="bayes-count">
                    Step {clampedIndex + 1} / {steps.length}
                </span>
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

            <div className="bayes-columns">
                <nav className="bayes-step-list" aria-label="Steps">
                    <div className="bayes-list-name">The update, step by step</div>
                    <ol>
                        {steps.map((step, index) => (
                            <li key={step.id}>
                                <button
                                    type="button"
                                    className={`bstep-item${index === clampedIndex ? ' current' : ''}${
                                        index < clampedIndex ? ' done' : ''
                                    }`}
                                    onClick={() => goTo(index)}
                                >
                                    <span className="bstep-num">{index + 1}</span>
                                    {step.title}
                                </button>
                            </li>
                        ))}
                    </ol>
                </nav>
                <div className="card bayes-detail">
                    <div className="bayes-detail-head">
                        <h3>{currentStep.title}</h3>
                        <EvidenceRow
                            provenance={currentStep.provenance}
                            refs={currentStep.sourceRefs}
                            sources={SOURCES}
                        />
                    </div>
                    <p className="bayes-explanation">{currentStep.explanation}</p>
                    <StepData step={currentStep} />
                    <Caveat caveat={currentStep.caveat} sources={SOURCES} />
                </div>
            </div>

            <EvidenceSection
                sources={SOURCES}
                intro="Every step above cites at least one of these sources — the suite fails otherwise. Provenance classes:"
            />
        </div>
    );
}
