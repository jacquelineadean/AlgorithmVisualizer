import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { POPULATIONS } from './model';
import { buildCltTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import CltStage from './CltStage';

const clamp = (value, lo, hi, fallback) =>
    Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;

const readInitial = (sp) => ({
    pop: POPULATIONS.some((p) => p.id === sp.get('pop')) ? sp.get('pop') : 'exponential',
    n: clamp(Number.parseInt(sp.get('n') ?? '', 10), 1, 100, 10),
    count: clamp(Number.parseInt(sp.get('c') ?? '', 10), 20, 2000, 600),
    seed: clamp(Number.parseInt(sp.get('seed') ?? '', 10), 1, 9999, 7),
});

export default function CltVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [populationId, setPopulationId] = useState(initial.pop);
    const [n, setN] = useState(initial.n);
    const [count, setCount] = useState(initial.count);
    const [seed, setSeed] = useState(initial.seed);

    const built = useMemo(() => {
        try {
            return { trace: buildCltTrace({ populationId, n, count, seed }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [populationId, n, count, seed]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Population</span>
                <select
                    value={populationId}
                    onChange={(event) => setPopulationId(event.target.value)}
                >
                    {POPULATIONS.map((population) => (
                        <option key={population.id} value={population.id}>
                            {population.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Sample size n: {n}</span>
                <input
                    type="range"
                    min="1"
                    max="60"
                    value={n}
                    onChange={(event) => setN(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Samples: {count}</span>
                <input
                    type="range"
                    min="100"
                    max="1500"
                    step="100"
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => setSeed((prev) => (prev % 9999) + 1)}
            >
                Resample
            </button>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="From any shape to the bell"
            controls={controls}
            renderStage={(ctx) => <CltStage {...ctx} />}
            urlParams={{ pop: populationId, n, c: count, seed }}
            playIntervalMs={3200}
        />
    );
}
