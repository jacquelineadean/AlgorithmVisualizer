import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildSha256Trace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import Sha256Stage from './Sha256Stage';

const readInitial = (sp) => {
    const message = sp.get('m');
    return message && message.length <= 200 ? message : 'abc';
};

export default function Sha256Visualizer() {
    const [searchParams] = useSearchParams();
    const [message, setMessage] = useState(() => readInitial(searchParams));

    const built = useMemo(() => {
        try {
            return { trace: buildSha256Trace({ message }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [message]);

    const controls = (
        <>
            <label className="control" style={{ flex: 1, minWidth: '260px' }}>
                <span className="control-label">Message</span>
                <input
                    type="text"
                    value={message}
                    maxLength={200}
                    onChange={(event) => setMessage(event.target.value)}
                />
            </label>
            <p className="control-note">
                “abc” is the standard’s own test vector — its digest is published in FIPS 180-4,
                and the unit tests check this implementation against it.
            </p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Padding to digest"
            controls={controls}
            renderStage={(ctx) => <Sha256Stage {...ctx} />}
            urlParams={{ m: message }}
            playIntervalMs={3200}
        />
    );
}
