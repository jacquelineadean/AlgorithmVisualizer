import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildMonteCarloTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import MonteCarloStage from './MonteCarloStage';

const readInitial = (sp) => {
    const count = Number.parseInt(sp.get('n') ?? '', 10);
    const seed = Number.parseInt(sp.get('seed') ?? '', 10);
    return {
        count: Number.isFinite(count) && count >= 50 && count <= 20000 ? count : 2000,
        seed: Number.isFinite(seed) && seed >= 1 && seed <= 9999 ? seed : 21,
    };
};

export default function MonteCarloVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [count, setCount] = useState(initial.count);
    const [seed, setSeed] = useState(initial.seed);

    const built = useMemo(() => {
        try {
            return { trace: buildMonteCarloTrace({ count, seed }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [count, seed]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Darts: {count.toLocaleString()}</span>
                <input
                    type="range"
                    min="200"
                    max="10000"
                    step="200"
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => setSeed((prev) => (prev % 9999) + 1)}
            >
                Throw again
            </button>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Estimating π by accident"
            controls={controls}
            renderStage={(ctx) => <MonteCarloStage {...ctx} />}
            urlParams={{ n: count, seed }}
            playIntervalMs={3000}
        />
    );
}
