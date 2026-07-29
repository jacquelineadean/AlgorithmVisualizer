import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ACCELERATORS, MODELS, getModel } from './model';
import { buildInferenceMap } from './map';
import { SOURCES } from './sources';
import DrilldownInstrument from '../drilldown/DrilldownInstrument';
import { STAGE_KINDS } from './stages';

const int = (raw, lo, hi, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => ({
    modelId: MODELS.some((model) => model.id === sp.get('model')) ? sp.get('model') : '7b',
    deviceId: ACCELERATORS.some((device) => device.id === sp.get('gpu')) ? sp.get('gpu') : 'a100',
    promptTokens: int(sp.get('prompt'), 1, 8192, 1024),
    batch: int(sp.get('batch'), 1, 256, 16),
});

export default function InferenceVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [modelId, setModelId] = useState(initial.modelId);
    const [deviceId, setDeviceId] = useState(initial.deviceId);
    const [promptTokens, setPromptTokens] = useState(initial.promptTokens);
    const [batch, setBatch] = useState(initial.batch);

    const maxPrompt = getModel(modelId).context;
    const safePrompt = Math.min(promptTokens, maxPrompt);

    const built = useMemo(() => {
        try {
            return {
                map: buildInferenceMap({
                    modelId,
                    deviceId,
                    promptTokens: safePrompt,
                    batch,
                }),
            };
        } catch (error) {
            return { error: error.message };
        }
    }, [modelId, deviceId, safePrompt, batch]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Model</span>
                <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                    {MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                            {model.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Accelerator</span>
                <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
                    {ACCELERATORS.map((device) => (
                        <option key={device.id} value={device.id}>
                            {device.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">
                    Prompt: {safePrompt.toLocaleString()} tokens
                </span>
                <input
                    type="range"
                    min="128"
                    max={maxPrompt}
                    step="128"
                    value={safePrompt}
                    onChange={(event) => setPromptTokens(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Batch: {batch}</span>
                <input
                    type="range"
                    min="1"
                    max="128"
                    value={batch}
                    onChange={(event) => setBatch(Number(event.target.value))}
                />
            </label>
            <p className="control-note">
                Every timing below is computed from these settings and the vendor’s published
                peak numbers — at 50% of peak for compute and 70% of peak for bandwidth.
            </p>
        </>
    );

    return (
        <DrilldownInstrument
            map={built.map}
            error={built.error}
            sources={SOURCES}
            controls={controls}
            stageKinds={STAGE_KINDS}
            urlParams={{ model: modelId, gpu: deviceId, prompt: safePrompt, batch }}
            ariaLabel="LLM inference pipeline map"
        />
    );
}
