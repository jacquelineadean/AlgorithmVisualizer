import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildBayesTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
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

// Deep-link params (percent units), validated against the slider ranges.
const readInitial = (sp) => {
    const read = (key, min, max, fallback) => {
        const value = Number.parseFloat(sp.get(key) ?? '');
        return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
    };
    return {
        prior: read('prior', 0.1, 20, DEFAULTS.prior),
        sensitivity: read('sens', 50, 100, DEFAULTS.sensitivity),
        falsePositiveRate: read('fpr', 0, 30, DEFAULTS.falsePositiveRate),
    };
};

export default function BayesVisualizer() {
    const [searchParams] = useSearchParams();
    const [params, setParams] = useState(() => readInitial(searchParams));

    const trace = useMemo(
        () =>
            buildBayesTrace({
                prior: params.prior / 100,
                sensitivity: params.sensitivity / 100,
                falsePositiveRate: params.falsePositiveRate / 100,
            }),
        [params]
    );

    const controls = (
        <>
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
        </>
    );

    return (
        <TraceInstrument
            trace={trace}
            sources={SOURCES}
            listLabel="The update, step by step"
            controls={controls}
            renderStage={(ctx) => <PopulationGrid {...ctx} />}
            urlParams={{
                prior: params.prior,
                sens: params.sensitivity,
                fpr: params.falsePositiveRate,
            }}
            playIntervalMs={2600}
        />
    );
}
