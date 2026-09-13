import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PATHS, getPath } from './model';
import { buildFourierTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import FourierStage from './FourierStage';

const int = (raw, lo, hi, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => ({
    pathId: PATHS.some((path) => path.id === sp.get('p2')) ? sp.get('p2') : 'square',
    harmonics: int(sp.get('h'), 1, 128, 12),
    samples: int(sp.get('s2'), 16, 256, 128),
});

export default function FourierVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [pathId, setPathId] = useState(initial.pathId);
    const [harmonics, setHarmonics] = useState(initial.harmonics);
    const [samples] = useState(initial.samples);

    const built = useMemo(() => {
        try {
            return { trace: buildFourierTrace({ pathId, harmonics, samples }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [pathId, harmonics, samples]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Path</span>
                <select value={pathId} onChange={(event) => setPathId(event.target.value)}>
                    {PATHS.map((path) => (
                        <option key={path.id} value={path.id}>
                            {path.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Circles: {harmonics}</span>
                <input
                    type="range"
                    min="1"
                    max="64"
                    value={harmonics}
                    onChange={(event) => setHarmonics(Number(event.target.value))}
                />
            </label>
            <p className="control-note">{getPath(pathId).note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="From a curve to circles"
            controls={controls}
            renderStage={(ctx) => <FourierStage {...ctx} />}
            urlParams={{ p2: pathId, h: harmonics, s2: samples }}
            playIntervalMs={3400}
        />
    );
}
