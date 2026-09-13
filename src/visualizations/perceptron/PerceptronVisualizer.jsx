import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DATASETS, getDataset } from './model';
import { buildPerceptronTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import PerceptronStage from './PerceptronStage';

const num = (raw, lo, hi, fallback) => {
    const value = Number.parseFloat(raw ?? '');
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => ({
    datasetId: DATASETS.some((set) => set.id === sp.get('data')) ? sp.get('data') : 'separable',
    n: num(sp.get('n'), 4, 200, 40),
    seed: num(sp.get('seed'), 1, 9999, 6),
    rate: num(sp.get('rate'), 0.1, 4, 1),
});

export default function PerceptronVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [datasetId, setDatasetId] = useState(initial.datasetId);
    const [n, setN] = useState(Math.round(initial.n));
    const [seed, setSeed] = useState(Math.round(initial.seed));
    const [rate, setRate] = useState(initial.rate);

    const built = useMemo(() => {
        try {
            return { trace: buildPerceptronTrace({ datasetId, n, seed, rate, epochs: 30 }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [datasetId, n, seed, rate]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Data</span>
                <select value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>
                    {DATASETS.map((set) => (
                        <option key={set.id} value={set.id}>
                            {set.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Points: {n}</span>
                <input
                    type="range"
                    min="10"
                    max="120"
                    step="2"
                    value={n}
                    disabled={datasetId === 'xor'}
                    onChange={(event) => setN(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Learning rate η: {rate.toFixed(1)}</span>
                <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.2"
                    value={rate}
                    onChange={(event) => setRate(Number(event.target.value))}
                />
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => setSeed((prev) => (prev % 9999) + 1)}
            >
                New sample
            </button>
            <p className="control-note">{getDataset(datasetId).note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Learning from mistakes"
            controls={controls}
            renderStage={(ctx) => <PerceptronStage {...ctx} />}
            urlParams={{ data: datasetId, n, seed, rate }}
            playIntervalMs={3000}
        />
    );
}
