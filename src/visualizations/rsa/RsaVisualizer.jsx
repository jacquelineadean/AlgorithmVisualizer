import { useEffect, useMemo, useState } from 'react';
import { PRIMES, randomPrimePair, validPublicExponents } from './math';
import { ACTS, buildRsaTrace, suggestPublicExponent } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import RsaLane from './RsaLane';
import './RsaVisualizer.css';

const fmt = (v) => String(v);

// RSA-only detail kind: the extended-Euclid working shown when deriving d.
function EgcdView({ data }) {
    return (
        <div className="math-block">
            <div className="math-caption">
                Extended Euclid on ({fmt(data.e)}, {fmt(data.phi)}) — each line divides the
                previous pair:
            </div>
            {data.rows.map(({ a, b, q, r }, i) => (
                <div className="math-line" key={i}>
                    {fmt(a)} = {fmt(q)} × {fmt(b)} + {fmt(r)}
                </div>
            ))}
            <div className="math-line result">
                back-substitute ⇒ d = e⁻¹ mod φ(n) = {fmt(data.d)}
            </div>
        </div>
    );
}

export default function RsaVisualizer() {
    const [message, setMessage] = useState('HELLO');
    const [pStr, setPStr] = useState('61');
    const [qStr, setQStr] = useState('53');
    const [eStr, setEStr] = useState('17');

    const p = BigInt(pStr);
    const q = BigInt(qStr);
    const phi = (p - 1n) * (q - 1n);
    const eOptions = useMemo(() => validPublicExponents(phi), [phi]);

    // Snap e back to a valid choice when a prime change invalidates it.
    useEffect(() => {
        if (!eOptions.some((option) => option === BigInt(eStr))) {
            setEStr(fmt(suggestPublicExponent(phi)));
        }
    }, [eOptions, eStr, phi]);

    const built = useMemo(() => {
        try {
            return { trace: buildRsaTrace({ message, p, q, e: BigInt(eStr) }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [message, p, q, eStr]);

    const randomize = () => {
        const [nextP, nextQ] = randomPrimePair();
        setPStr(fmt(nextP));
        setQStr(fmt(nextQ));
    };

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Message</span>
                <input
                    type="text"
                    className="control-wide"
                    value={message}
                    maxLength={16}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="HELLO"
                />
            </label>
            <label className="control">
                <span className="control-label">Prime p</span>
                <select value={pStr} onChange={(event) => setPStr(event.target.value)}>
                    {PRIMES.map((prime) => (
                        <option key={fmt(prime)} value={fmt(prime)} disabled={fmt(prime) === qStr}>
                            {fmt(prime)}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Prime q</span>
                <select value={qStr} onChange={(event) => setQStr(event.target.value)}>
                    {PRIMES.map((prime) => (
                        <option key={fmt(prime)} value={fmt(prime)} disabled={fmt(prime) === pStr}>
                            {fmt(prime)}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Exponent e</span>
                <select value={eStr} onChange={(event) => setEStr(event.target.value)}>
                    {eOptions.map((option) => (
                        <option key={fmt(option)} value={fmt(option)}>
                            {fmt(option)}
                        </option>
                    ))}
                </select>
            </label>
            <button type="button" className="pill-button secondary" onClick={randomize}>
                Surprise me
            </button>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            acts={ACTS}
            controls={controls}
            renderStage={(ctx) => <RsaLane {...ctx} />}
            detailKinds={{ egcd: EgcdView }}
            playIntervalMs={3000}
        />
    );
}
