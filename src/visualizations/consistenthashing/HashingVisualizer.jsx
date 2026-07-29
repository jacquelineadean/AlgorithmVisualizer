import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildHashingTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import RingStage from './RingStage';

const int = (raw, lo, hi, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => ({
    servers: int(sp.get('n'), 2, 12, 4),
    keys: int(sp.get('k'), 50, 1200, 400),
    replicas: int(sp.get('v'), 1, 200, 1),
});

export default function HashingVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [servers, setServers] = useState(initial.servers);
    const [keys, setKeys] = useState(initial.keys);
    const [replicas, setReplicas] = useState(initial.replicas);

    const built = useMemo(() => {
        try {
            return { trace: buildHashingTrace({ servers, keys, replicas }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [servers, keys, replicas]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Servers: {servers}</span>
                <input
                    type="range"
                    min="2"
                    max="10"
                    value={servers}
                    onChange={(event) => setServers(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Keys: {keys}</span>
                <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={keys}
                    onChange={(event) => setKeys(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Virtual nodes each: {replicas}</span>
                <input
                    type="range"
                    min="1"
                    max="60"
                    value={replicas}
                    onChange={(event) => setReplicas(Number(event.target.value))}
                />
            </label>
            <p className="control-note">
                Raise the virtual-node count and watch the load bars flatten — that is the one
                knob Dynamo turned to make the ring practical.
            </p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Keys on a ring"
            controls={controls}
            renderStage={(ctx) => <RingStage {...ctx} />}
            urlParams={{ n: servers, k: keys, v: replicas }}
            playIntervalMs={3200}
        />
    );
}
