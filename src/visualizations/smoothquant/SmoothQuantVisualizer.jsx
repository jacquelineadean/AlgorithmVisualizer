import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALPHAS, DEFAULT_ALPHA, PRESETS, SEEDS, getPreset } from './model';
import { ACTS, buildSmoothQuantTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import SmoothQuantStage from './SmoothQuantStage';

const readInitial = (sp) => {
    const seed = Number.parseInt(sp.get('layer') ?? '', 10);
    const alpha = Number.parseFloat(sp.get('a') ?? '');
    return {
        preset: PRESETS.some((item) => item.id === sp.get('out')) ? sp.get('out') : 'severe',
        seed: SEEDS.includes(seed) ? seed : 1,
        alpha: ALPHAS.find((value) => Math.abs(value - alpha) < 1e-9) ?? DEFAULT_ALPHA,
    };
};

export default function SmoothQuantVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [preset, setPreset] = useState(initial.preset);
    const [seed, setSeed] = useState(initial.seed);
    const [alpha, setAlpha] = useState(initial.alpha);

    const built = useMemo(() => {
        try {
            return { trace: buildSmoothQuantTrace({ preset, seed, alpha }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [preset, seed, alpha]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Activation outliers</span>
                <select value={preset} onChange={(event) => setPreset(event.target.value)}>
                    {PRESETS.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Layer</span>
                <select value={String(seed)} onChange={(event) => setSeed(Number(event.target.value))}>
                    {SEEDS.map((value) => (
                        <option key={value} value={String(value)}>
                            layer {value}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Migration strength α = {alpha.toFixed(2)}</span>
                <input
                    type="range"
                    min="0"
                    max={String(ALPHAS.length - 1)}
                    step="1"
                    value={String(ALPHAS.findIndex((value) => Math.abs(value - alpha) < 1e-9))}
                    onChange={(event) => setAlpha(ALPHAS[Number(event.target.value)])}
                    aria-valuetext={`α = ${alpha.toFixed(2)}`}
                />
            </label>
            <p className="control-note">{getPreset(preset).note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            acts={ACTS}
            controls={controls}
            renderStage={(ctx) => <SmoothQuantStage {...ctx} />}
            urlParams={{ out: preset, layer: seed, a: alpha.toFixed(2) }}
            playIntervalMs={4200}
        />
    );
}
