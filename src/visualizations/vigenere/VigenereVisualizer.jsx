import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildVigenereTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import LanesStage from './LanesStage';

// Deep-link params, validated with graceful fallback to the classic example.
const readInitial = (sp) => {
    const ok = (value, re) => (value && re.test(value) ? value : null);
    return {
        m: ok(sp.get('m'), /^[A-Za-z ]{1,24}$/) ?? 'ATTACK AT DAWN',
        k: ok(sp.get('k'), /^[A-Za-z]{1,12}$/) ?? 'LEMON',
    };
};

export default function VigenereVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [message, setMessage] = useState(initial.m);
    const [keyword, setKeyword] = useState(initial.k);

    const built = useMemo(() => {
        try {
            return { trace: buildVigenereTrace({ message, key: keyword }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [message, keyword]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Message (A–Z)</span>
                <input
                    type="text"
                    className="control-wide"
                    value={message}
                    maxLength={24}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="ATTACK AT DAWN"
                />
            </label>
            <label className="control">
                <span className="control-label">Keyword</span>
                <input
                    type="text"
                    value={keyword}
                    maxLength={12}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="LEMON"
                />
            </label>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="The cipher, step by step"
            controls={controls}
            renderStage={(ctx) => <LanesStage {...ctx} />}
            urlParams={{ m: message, k: keyword }}
            playIntervalMs={2600}
        />
    );
}
