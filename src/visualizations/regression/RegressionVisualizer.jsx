import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DATASETS, getDataset } from './model';
import { buildRegressionTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import RegressionStage from './RegressionStage';

const num = (raw, lo, hi, fallback) => {
    const value = Number.parseFloat(raw ?? '');
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => ({
    datasetId: DATASETS.some((set) => set.id === sp.get('data')) ? sp.get('data') : 'linear',
    n: num(sp.get('n'), 4, 200, 24),
    seed: num(sp.get('seed'), 1, 9999, 5),
    slope: num(sp.get('b'), -5, 5, 2.4),
    intercept: num(sp.get('a'), -10, 15, 0.4),
});

export default function RegressionVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [datasetId, setDatasetId] = useState(initial.datasetId);
    const [n, setN] = useState(initial.n);
    const [seed, setSeed] = useState(initial.seed);
    const [trialSlope, setTrialSlope] = useState(initial.slope);
    const [trialIntercept, setTrialIntercept] = useState(initial.intercept);

    const built = useMemo(() => {
        try {
            return {
                trace: buildRegressionTrace({
                    datasetId,
                    n,
                    seed,
                    trialSlope,
                    trialIntercept,
                }),
            };
        } catch (error) {
            return { error: error.message };
        }
    }, [datasetId, n, seed, trialSlope, trialIntercept]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Dataset</span>
                <select value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>
                    {DATASETS.map((set) => (
                        <option key={set.id} value={set.id}>
                            {set.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Observations: {n}</span>
                <input
                    type="range"
                    min="6"
                    max="80"
                    value={n}
                    onChange={(event) => setN(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Trial slope: {trialSlope.toFixed(2)}</span>
                <input
                    type="range"
                    min="-2"
                    max="4"
                    step="0.05"
                    value={trialSlope}
                    onChange={(event) => setTrialSlope(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Trial intercept: {trialIntercept.toFixed(2)}</span>
                <input
                    type="range"
                    min="-6"
                    max="12"
                    step="0.1"
                    value={trialIntercept}
                    onChange={(event) => setTrialIntercept(Number(event.target.value))}
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
            listLabel="Least squares as geometry"
            controls={controls}
            renderStage={(ctx) => <RegressionStage {...ctx} />}
            urlParams={{
                data: datasetId,
                n,
                seed,
                b: trialSlope.toFixed(2),
                a: trialIntercept.toFixed(2),
            }}
            playIntervalMs={3200}
        />
    );
}
