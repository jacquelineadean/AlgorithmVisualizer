import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DATASETS, getDataset } from './model';
import { buildKmeansTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import KmeansStage from './KmeansStage';

const int = (raw, lo, hi, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => ({
    datasetId: DATASETS.some((set) => set.id === sp.get('data')) ? sp.get('data') : 'blobs',
    n: int(sp.get('n'), 6, 400, 120),
    k: int(sp.get('k'), 2, 6, 3),
    seed: int(sp.get('seed'), 1, 9999, 12),
    init: sp.get('init') === 'random' ? 'random' : 'plusplus',
});

export default function KmeansVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [datasetId, setDatasetId] = useState(initial.datasetId);
    const [n, setN] = useState(initial.n);
    const [k, setK] = useState(initial.k);
    const [seed, setSeed] = useState(initial.seed);
    const [init, setInit] = useState(initial.init);

    const built = useMemo(() => {
        try {
            return { trace: buildKmeansTrace({ datasetId, n, k, seed, init }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [datasetId, n, k, seed, init]);

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
                <span className="control-label">k = {k}</span>
                <input
                    type="range"
                    min="2"
                    max="6"
                    value={k}
                    onChange={(event) => setK(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Points: {n}</span>
                <input
                    type="range"
                    min="30"
                    max="300"
                    step="10"
                    value={n}
                    onChange={(event) => setN(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Seeding</span>
                <select value={init} onChange={(event) => setInit(event.target.value)}>
                    <option value="plusplus">k-means++</option>
                    <option value="random">random (Forgy)</option>
                </select>
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => setSeed((prev) => (prev % 9999) + 1)}
            >
                Reseed
            </button>
            <p className="control-note">{getDataset(datasetId).note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Assign, average, repeat"
            controls={controls}
            renderStage={(ctx) => <KmeansStage {...ctx} />}
            urlParams={{ data: datasetId, n, k, seed, init }}
            playIntervalMs={3000}
        />
    );
}
