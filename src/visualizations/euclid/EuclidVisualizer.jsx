import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildEuclidTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import EuclidStage from './EuclidStage';

const readInitial = (sp) => {
    const digits = (key, fallback) =>
        /^\d{1,6}$/.test(sp.get(key) ?? '') && Number(sp.get(key)) > 0 ? sp.get(key) : fallback;
    return { a: digits('a', '1071'), b: digits('b', '462') };
};

export default function EuclidVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [aStr, setAStr] = useState(initial.a);
    const [bStr, setBStr] = useState(initial.b);

    const built = useMemo(() => {
        try {
            return { trace: buildEuclidTrace({ a: BigInt(aStr || '0'), b: BigInt(bStr || '0') }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [aStr, bStr]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">a</span>
                <input
                    type="number"
                    min="1"
                    max="100000"
                    value={aStr}
                    onChange={(event) => setAStr(event.target.value)}
                />
            </label>
            <label className="control">
                <span className="control-label">b</span>
                <input
                    type="number"
                    min="1"
                    max="100000"
                    value={bStr}
                    onChange={(event) => setBStr(event.target.value)}
                />
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => {
                    setAStr('377');
                    setBStr('233');
                }}
            >
                Worst case (Fibonacci)
            </button>
            <p className="control-note">
                Consecutive Fibonacci numbers are the hardest input at any size: every quotient
                is 1, so nothing shrinks faster than it has to.
            </p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="The oldest algorithm"
            controls={controls}
            renderStage={(ctx) => <EuclidStage {...ctx} />}
            urlParams={{ a: aStr, b: bStr }}
            playIntervalMs={3000}
        />
    );
}
