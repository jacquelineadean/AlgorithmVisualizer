import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GRAPHS, getGraph } from './model';
import { buildPageRankTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import PageRankStage from './PageRankStage';

const readInitial = (sp) => {
    const damping = Number.parseFloat(sp.get('d') ?? '');
    return {
        graphId: GRAPHS.some((graph) => graph.id === sp.get('g')) ? sp.get('g') : 'hub',
        damping: Number.isFinite(damping) && damping > 0 && damping < 1 ? damping : 0.85,
    };
};

export default function PageRankVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [graphId, setGraphId] = useState(initial.graphId);
    const [damping, setDamping] = useState(initial.damping);

    const built = useMemo(() => {
        try {
            return { trace: buildPageRankTrace({ graphId, damping }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [graphId, damping]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Link graph</span>
                <select value={graphId} onChange={(event) => setGraphId(event.target.value)}>
                    {GRAPHS.map((graph) => (
                        <option key={graph.id} value={graph.id}>
                            {graph.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Damping d: {damping.toFixed(2)}</span>
                <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={damping}
                    onChange={(event) => setDamping(Number(event.target.value))}
                />
            </label>
            <p className="control-note">{getGraph(graphId).note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Importance by iteration"
            controls={controls}
            renderStage={(ctx) => <PageRankStage {...ctx} />}
            urlParams={{ g: graphId, d: damping }}
            playIntervalMs={3000}
        />
    );
}
