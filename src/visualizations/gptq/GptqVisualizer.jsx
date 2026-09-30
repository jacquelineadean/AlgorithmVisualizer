import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BITS, BLOCK_SIZES, PRESETS, SEEDS, getPreset } from './model';
import { ACTS, buildGptqTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import GptqStage from './GptqStage';

const pick = (raw, allowed, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return allowed.includes(value) ? value : fallback;
};

const readInitial = (sp) => ({
    preset: PRESETS.some((item) => item.id === sp.get('in')) ? sp.get('in') : 'correlated',
    seed: pick(sp.get('layer'), SEEDS, 1),
    bits: pick(sp.get('b'), BITS, 3),
    blockSize: pick(sp.get('B'), BLOCK_SIZES, 4),
});

export default function GptqVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [preset, setPreset] = useState(initial.preset);
    const [seed, setSeed] = useState(initial.seed);
    const [bits, setBits] = useState(initial.bits);
    const [blockSize, setBlockSize] = useState(initial.blockSize);

    const built = useMemo(() => {
        try {
            return { trace: buildGptqTrace({ preset, seed, bits, blockSize }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [preset, seed, bits, blockSize]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Calibration inputs</span>
                <select value={preset} onChange={(event) => setPreset(event.target.value)}>
                    {PRESETS.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </label>
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
                <span className="control-label">Bits per weight</span>
                <select value={String(bits)} onChange={(event) => setBits(Number(event.target.value))}>
                    {BITS.map((value) => (
                        <option key={value} value={String(value)}>
                            {value} bits ({2 ** value} levels)
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Block size B</span>
                <select value={String(blockSize)} onChange={(event) => setBlockSize(Number(event.target.value))}>
                    {BLOCK_SIZES.map((value) => (
                        <option key={value} value={String(value)}>
                            {value} column{value > 1 ? 's' : ''}
                        </option>
                    ))}
                </select>
            </label>
            <p className="control-note">{getPreset(preset).note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            acts={ACTS}
            controls={controls}
            renderStage={(ctx) => <GptqStage {...ctx} />}
            urlParams={{ in: preset, layer: seed, b: bits, B: blockSize }}
            playIntervalMs={4200}
        />
    );
}
