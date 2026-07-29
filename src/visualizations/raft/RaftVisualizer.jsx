import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildRaftTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import RaftStage from './RaftStage';

const readInitial = (sp) => {
    const servers = Number.parseInt(sp.get('n') ?? '', 10);
    return {
        servers: [3, 5, 7].includes(servers) ? servers : 5,
        injectPartition: sp.get('split') !== '0',
    };
};

export default function RaftVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [servers, setServers] = useState(initial.servers);
    const [injectPartition, setInjectPartition] = useState(initial.injectPartition);

    const built = useMemo(() => {
        try {
            return { trace: buildRaftTrace({ servers, injectPartition }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [servers, injectPartition]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Cluster size</span>
                <select value={String(servers)} onChange={(e) => setServers(Number(e.target.value))}>
                    <option value="3">3 servers (majority 2)</option>
                    <option value="5">5 servers (majority 3)</option>
                    <option value="7">7 servers (majority 4)</option>
                </select>
            </label>
            <label className="control">
                <span className="control-label">Network</span>
                <select
                    value={injectPartition ? '1' : '0'}
                    onChange={(event) => setInjectPartition(event.target.value === '1')}
                >
                    <option value="1">partition the cluster</option>
                    <option value="0">stay healthy</option>
                </select>
            </label>
            <p className="control-note">
                The partition scenario splits the cluster, lets the old leader keep trying, and
                shows what Raft refuses to commit.
            </p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            acts={built.trace?.acts}
            controls={controls}
            renderStage={(ctx) => <RaftStage {...ctx} />}
            urlParams={{ n: servers, split: injectPartition ? 1 : 0 }}
            playIntervalMs={3600}
        />
    );
}
