import { useEffect, useMemo, useState } from 'react';
import { SAFE_PRIMES, generatorOptions, randomExponent } from './math';
import { ACTS, buildDhTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import DhLane from './DhLane';

const fmt = (v) => String(v);

export default function DhVisualizer() {
    const [pStr, setPStr] = useState('83');
    const [gStr, setGStr] = useState('2');
    const [aStr, setAStr] = useState('9');
    const [bStr, setBStr] = useState('21');

    const p = BigInt(pStr);
    const gOptions = useMemo(() => generatorOptions(p), [p]);

    // Snap g back to a valid generator when the modulus changes.
    useEffect(() => {
        if (!gOptions.some((option) => option === BigInt(gStr))) {
            setGStr(fmt(gOptions[0]));
        }
    }, [gOptions, gStr]);

    const built = useMemo(() => {
        try {
            const a = BigInt(aStr || '0');
            const b = BigInt(bStr || '0');
            return { trace: buildDhTrace({ p, g: BigInt(gStr), a, b }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [p, gStr, aStr, bStr]);

    const randomizeSecrets = () => {
        setAStr(fmt(randomExponent(p)));
        setBStr(fmt(randomExponent(p)));
    };

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Modulus p</span>
                <select value={pStr} onChange={(event) => setPStr(event.target.value)}>
                    {SAFE_PRIMES.map((prime) => (
                        <option key={fmt(prime)} value={fmt(prime)}>
                            {fmt(prime)}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Generator g</span>
                <select value={gStr} onChange={(event) => setGStr(event.target.value)}>
                    {gOptions.map((option) => (
                        <option key={fmt(option)} value={fmt(option)}>
                            {fmt(option)}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Alice&rsquo;s secret a</span>
                <input
                    type="number"
                    min="2"
                    max={fmt(p - 2n)}
                    value={aStr}
                    onChange={(event) => setAStr(event.target.value)}
                />
            </label>
            <label className="control">
                <span className="control-label">Bob&rsquo;s secret b</span>
                <input
                    type="number"
                    min="2"
                    max={fmt(p - 2n)}
                    value={bStr}
                    onChange={(event) => setBStr(event.target.value)}
                />
            </label>
            <button type="button" className="pill-button secondary" onClick={randomizeSecrets}>
                New secrets
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
            renderStage={(ctx) => <DhLane {...ctx} />}
            playIntervalMs={3000}
        />
    );
}
