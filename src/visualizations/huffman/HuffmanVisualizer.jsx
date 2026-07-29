import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SAMPLES, getSample } from './model';
import { buildHuffmanTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import HuffmanStage from './HuffmanStage';

const readInitial = (sp) => {
    const custom = sp.get('text');
    if (custom && custom.length >= 2 && custom.length <= 400) {
        return { sampleId: 'custom', text: custom };
    }
    const sampleId = SAMPLES.some((sample) => sample.id === sp.get('s2'))
        ? sp.get('s2')
        : 'mississippi';
    return { sampleId, text: getSample(sampleId).text };
};

export default function HuffmanVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [sampleId, setSampleId] = useState(initial.sampleId);
    const [text, setText] = useState(initial.text);

    const built = useMemo(() => {
        try {
            return { trace: buildHuffmanTrace({ sampleId, text }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [sampleId, text]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Sample</span>
                <select
                    value={sampleId}
                    onChange={(event) => {
                        setSampleId(event.target.value);
                        setText(getSample(event.target.value).text);
                    }}
                >
                    {SAMPLES.map((sample) => (
                        <option key={sample.id} value={sample.id}>
                            {sample.label}
                        </option>
                    ))}
                    {sampleId === 'custom' && <option value="custom">your text</option>}
                </select>
            </label>
            <label className="control" style={{ flex: 1, minWidth: '240px' }}>
                <span className="control-label">Text to encode</span>
                <input
                    type="text"
                    value={text}
                    maxLength={400}
                    onChange={(event) => {
                        setSampleId('custom');
                        setText(event.target.value);
                    }}
                />
            </label>
            <p className="control-note">
                {sampleId === 'custom' ? 'Your own text.' : getSample(sampleId).note}
            </p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Building the code"
            controls={controls}
            renderStage={(ctx) => <HuffmanStage {...ctx} />}
            urlParams={sampleId === 'custom' ? { text } : { s2: sampleId }}
            playIntervalMs={3200}
        />
    );
}
