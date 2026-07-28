import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildSieveTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import NumberGridStage from './NumberGridStage';

const readInitial = (sp) => {
    const value = Number.parseInt(sp.get('N') ?? '', 10);
    return Number.isFinite(value) && value >= 10 && value <= 400 ? value : 120;
};

export default function SieveVisualizer() {
    const [searchParams] = useSearchParams();
    const [N, setN] = useState(() => readInitial(searchParams));

    const trace = useMemo(() => buildSieveTrace({ N }), [N]);

    const controls = (
        <label className="control">
            <span className="control-label">Board size: 2 … {N}</span>
            <input
                type="range"
                min="30"
                max="240"
                step="10"
                value={N}
                onChange={(event) => setN(Number(event.target.value))}
            />
        </label>
    );

    return (
        <TraceInstrument
            trace={trace}
            sources={SOURCES}
            listLabel="The sieve, step by step"
            controls={controls}
            renderStage={(ctx) => <NumberGridStage {...ctx} />}
            urlParams={{ N }}
            playIntervalMs={2400}
        />
    );
}
