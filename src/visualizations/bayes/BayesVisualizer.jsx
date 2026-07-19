import { useMemo, useState } from 'react';
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

export default function BayesVisualizer() {
    const [params, setParams] = useState(DEFAULTS);

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
            playIntervalMs={2600}
        />
    );
}
