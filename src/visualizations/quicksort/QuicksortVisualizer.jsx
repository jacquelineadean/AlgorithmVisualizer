import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { makeArray, PRESETS } from '../sorting/model';
import { buildQuicksortTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import BarsStage from '../sorting/BarsStage';
import ArrayControls from '../sorting/ArrayControls';

// Deep-link params, validated with graceful fallback to the defaults.
const readInitial = (sp) => {
    const int = (key, min, max, fallback) => {
        const value = Number.parseInt(sp.get(key) ?? '', 10);
        return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
    };
    const preset = PRESETS.some((option) => option.id === sp.get('preset'))
        ? sp.get('preset')
        : 'random';
    return { n: int('n', 8, 40, 24), preset, seed: int('seed', 1, 999999, 1) };
};

export default function QuicksortVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [n, setN] = useState(initial.n);
    const [preset, setPreset] = useState(initial.preset);
    const [seed, setSeed] = useState(initial.seed);

    const values = useMemo(() => makeArray({ size: n, preset, seed }), [n, preset, seed]);
    const trace = useMemo(() => buildQuicksortTrace({ values }), [values]);

    return (
        <TraceInstrument
            trace={trace}
            sources={SOURCES}
            listLabel="The sort, step by step"
            controls={
                <ArrayControls
                    n={n}
                    setN={setN}
                    preset={preset}
                    setPreset={setPreset}
                    seed={seed}
                    setSeed={setSeed}
                />
            }
            renderStage={(ctx) => <BarsStage {...ctx} />}
            urlParams={{ n, preset, seed }}
            playIntervalMs={2400}
        />
    );
}
