import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALGORITHMS, scatterWalls } from './model';
import { buildPathfindingTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import GridStage from './GridStage';

// Deep-link params: the algorithm only — 1,000 wall cells are canvas-like
// state and deliberately stay out of the URL.
const readInitial = (sp) =>
    Object.keys(ALGORITHMS).includes(sp.get('alg')) ? sp.get('alg') : 'dijkstra';

export default function PathfindingVisualizer() {
    const [searchParams] = useSearchParams();
    const [algorithm, setAlgorithm] = useState(() => readInitial(searchParams));
    const [walls, setWalls] = useState(() => new Set());
    const [seed, setSeed] = useState(1);

    const trace = useMemo(
        () => buildPathfindingTrace({ algorithm, walls }),
        [algorithm, walls]
    );

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Algorithm</span>
                <select
                    value={algorithm}
                    onChange={(event) => setAlgorithm(event.target.value)}
                >
                    {Object.entries(ALGORITHMS).map(([id, { name }]) => (
                        <option key={id} value={id}>
                            {name}
                        </option>
                    ))}
                </select>
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => {
                    setWalls(scatterWalls(seed));
                    setSeed((prev) => prev + 1);
                }}
            >
                Scatter walls
            </button>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => setWalls(new Set())}
            >
                Clear walls
            </button>
        </>
    );

    return (
        <TraceInstrument
            trace={trace}
            sources={SOURCES}
            listLabel="The search, step by step"
            controls={controls}
            renderStage={(ctx) => <GridStage {...ctx} onWallsChange={setWalls} />}
            urlParams={{ alg: algorithm }}
            playIntervalMs={2400}
        />
    );
}
