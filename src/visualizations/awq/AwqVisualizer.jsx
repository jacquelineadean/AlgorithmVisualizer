import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BITS, GROUP_SIZES, SEEDS } from './model';
import { ACTS, buildAwqTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import AwqStage from './AwqStage';

const pick = (raw, allowed, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return allowed.includes(value) ? value : fallback;
};

const readInitial = (sp) => ({
    seed: pick(sp.get('layer'), SEEDS, 1),
    bits: pick(sp.get('b'), BITS, 3),
    groupSize: pick(sp.get('g'), GROUP_SIZES, 4),
});

export default function AwqVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [seed, setSeed] = useState(initial.seed);
    const [bits, setBits] = useState(initial.bits);
    const [groupSize, setGroupSize] = useState(initial.groupSize);

    const built = useMemo(() => {
        try {
            return { trace: buildAwqTrace({ seed, bits, groupSize }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [seed, bits, groupSize]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Layer</span>
                <select value={String(seed)} onChange={(event) => setSeed(Number(event.target.value))}>
                    {SEEDS.map((value) => (
                        <option key={value} value={String(value)}>
                            layer {value}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Weight bits</span>
                <select value={String(bits)} onChange={(event) => setBits(Number(event.target.value))}>
                    {BITS.map((value) => (
                        <option key={value} value={String(value)}>
                            INT{value} ({2 ** value} levels)
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Group size</span>
                <select value={String(groupSize)} onChange={(event) => setGroupSize(Number(event.target.value))}>
                    {GROUP_SIZES.map((value) => (
                        <option key={value} value={String(value)}>
                            {value} channels per grid
                        </option>
                    ))}
                </select>
            </label>
            <p className="control-note">
                Each layer draws new weights and inputs; one input channel is always far louder than the rest,
                and a different one always has the largest weights.
            </p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            acts={ACTS}
            controls={controls}
            renderStage={(ctx) => <AwqStage {...ctx} />}
            urlParams={{ layer: seed, b: bits, g: groupSize }}
            playIntervalMs={4200}
        />
    );
}
