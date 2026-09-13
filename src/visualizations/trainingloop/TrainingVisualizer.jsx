import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CLUSTERS, RUNS, getRun } from './model';
import { buildTrainingMap } from './map';
import { SOURCES } from './sources';
import DrilldownInstrument from '../drilldown/DrilldownInstrument';
import { STAGE_KINDS } from './stages';

const readInitial = (sp) => {
    const mfu = Number.parseFloat(sp.get('mfu') ?? '');
    return {
        runId: RUNS.some((run) => run.id === sp.get('run')) ? sp.get('run') : 'llama-7b',
        clusterId: CLUSTERS.some((cluster) => cluster.id === sp.get('cluster'))
            ? sp.get('cluster')
            : '256xa100',
        mfu: Number.isFinite(mfu) && mfu > 0.05 && mfu <= 1 ? mfu : 0.45,
    };
};

export default function TrainingVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [runId, setRunId] = useState(initial.runId);
    const [clusterId, setClusterId] = useState(initial.clusterId);
    const [mfu, setMfu] = useState(initial.mfu);

    const built = useMemo(() => {
        try {
            return { map: buildTrainingMap({ runId, clusterId, mfu }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [runId, clusterId, mfu]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Run</span>
                <select value={runId} onChange={(event) => setRunId(event.target.value)}>
                    {RUNS.map((run) => (
                        <option key={run.id} value={run.id}>
                            {run.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Cluster</span>
                <select value={clusterId} onChange={(event) => setClusterId(event.target.value)}>
                    {CLUSTERS.map((cluster) => (
                        <option key={cluster.id} value={cluster.id}>
                            {cluster.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">
                    Utilization: {(mfu * 100).toFixed(0)}% of peak
                </span>
                <input
                    type="range"
                    min="0.2"
                    max="0.6"
                    step="0.05"
                    value={mfu}
                    onChange={(event) => setMfu(Number(event.target.value))}
                />
            </label>
            <p className="control-note">{getRun(runId).note}</p>
        </>
    );

    return (
        <DrilldownInstrument
            map={built.map}
            error={built.error}
            sources={SOURCES}
            controls={controls}
            stageKinds={STAGE_KINDS}
            urlParams={{ run: runId, cluster: clusterId, mfu }}
            ariaLabel="Training loop map"
        />
    );
}
