import { useState } from 'react';
import PlotStage from '../stages/PlotStage';
import {
    arithmeticIntensity,
    balancedBatch,
    bytesLabel,
    decode,
    deviceIntensity,
    kvBytes,
    kvBytesPerToken,
} from './model';
import { softmaxRows } from '../attention/model';
import '../drilldown/Drilldown.css';

// Focused stages inside the inference map's nodes. Each is a small live
// instrument: the cache fills as you scrub decode steps, the roofline
// recomputes per batch size, the sampler re-normalizes as you move the
// knobs. All three compute from the same pure model the map's metrics use.

export function KvCacheStage({ data }) {
    const { model, promptTokens } = data;
    const [decoded, setDecoded] = useState(24);
    const blocks = 32; // one chip per 1/32 of the prompt, then per decoded token
    const perBlock = Math.max(1, Math.ceil(promptTokens / blocks));
    const promptChips = Math.min(blocks, Math.ceil(promptTokens / perBlock));
    const total = kvBytes(model, promptTokens + decoded);

    return (
        <div>
            <div className="dd-mini">
                {Array.from({ length: promptChips }, (_, i) => (
                    <span className="dd-chip filled" key={`p${i}`}>
                        prompt
                    </span>
                ))}
                {Array.from({ length: Math.min(decoded, 24) }, (_, i) => (
                    <span className="dd-chip" key={`d${i}`}>
                        +{i + 1}
                    </span>
                ))}
                {decoded > 24 && <span className="dd-chip pending">… +{decoded - 24} more</span>}
            </div>
            <label className="control" style={{ marginTop: '14px' }}>
                <span className="control-label">Tokens generated: {decoded}</span>
                <input
                    type="range"
                    min="0"
                    max="512"
                    step="8"
                    value={decoded}
                    onChange={(event) => setDecoded(Number(event.target.value))}
                />
            </label>
            <p className="dd-hint" style={{ marginTop: '8px' }}>
                {promptTokens.toLocaleString()} prompt + {decoded} generated ={' '}
                {(promptTokens + decoded).toLocaleString()} cached tokens ·{' '}
                {bytesLabel(kvBytesPerToken(model))} each ·{' '}
                <strong>{bytesLabel(total)}</strong> for this one sequence. The cache grows
                with every token and is never freed until the sequence ends.
            </p>
        </div>
    );
}

export function RooflineStage({ data }) {
    const { model, device } = data;
    const batches = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    const points = batches.map((batch) => ({
        x: batch,
        y: decode(model, device, { batch, contextTokens: 1024 }).tokensPerSecond,
    }));
    const balanced = balancedBatch(device);
    const peak = Math.max(...points.map((point) => point.y));

    return (
        <div>
            <PlotStage
                domain={[1, 256]}
                range={[0, peak * 1.15]}
                xTicks={5}
                marks={[
                    { type: 'line', points, tone: 'cobalt', width: 2 },
                    {
                        type: 'points',
                        points: points.map((point) => ({ ...point, tone: 'cobalt' })),
                        r: 3,
                    },
                    {
                        type: 'segment',
                        x1: balanced,
                        y1: 0,
                        x2: balanced,
                        y2: peak * 1.1,
                        tone: 'vermilion',
                        dashed: true,
                    },
                    {
                        type: 'label',
                        x: balanced,
                        y: peak * 1.12,
                        text: `compute-bound past b ≈ ${balanced}`,
                        tone: 'vermilion',
                        anchor: 'middle',
                    },
                ]}
                xLabel="batch size"
                yLabel="tokens / second"
                notes={[`${device.label}`, `${deviceIntensity(device).toFixed(0)} FLOP/byte balance`]}
                ariaLabel={`Decode throughput against batch size; the device becomes compute-bound past batch ${balanced}.`}
            />
            <p className="dd-hint" style={{ marginTop: '8px' }}>
                A single decode step has an arithmetic intensity of{' '}
                {arithmeticIntensity(1)} FLOPs per byte; this device needs{' '}
                {deviceIntensity(device).toFixed(0)} to keep its matrix units busy. Throughput
                therefore rises almost linearly with batch size — until it does not.
            </p>
        </div>
    );
}

// A toy next-token distribution, reshaped live by temperature and top-p.
const CANDIDATES = ['the', 'a', 'this', 'that', 'my', 'our', 'its', 'their'];
const LOGITS = [3.2, 2.6, 1.9, 1.4, 0.9, 0.4, 0.1, -0.4];

export function SamplingStage() {
    const [temperature, setTemperature] = useState(1);
    const [topP, setTopP] = useState(0.9);

    const scaled = LOGITS.map((logit) => logit / Math.max(0.05, temperature));
    const probabilities = softmaxRows([scaled])[0];
    const order = probabilities
        .map((probability, index) => ({ probability, index }))
        .sort((a, b) => b.probability - a.probability);
    let cumulative = 0;
    const kept = new Set();
    for (const item of order) {
        kept.add(item.index);
        cumulative += item.probability;
        if (cumulative >= topP) break;
    }
    const mass = [...kept].reduce((sum, index) => sum + probabilities[index], 0);

    return (
        <div>
            <PlotStage
                domain={[-0.5, CANDIDATES.length - 0.5]}
                range={[0, 1]}
                xTicks={CANDIDATES.length - 1}
                yTicks={4}
                marks={[
                    {
                        type: 'bars',
                        bars: probabilities.map((probability, index) => ({
                            x0: index - 0.36,
                            x1: index + 0.36,
                            y: kept.has(index) ? probability / mass : probability,
                            tone: kept.has(index) ? 'cobalt' : 'faint',
                            opacity: kept.has(index) ? 0.8 : 0.3,
                        })),
                    },
                    ...CANDIDATES.map((token, index) => ({
                        type: 'label',
                        x: index,
                        y: 0.02,
                        text: token,
                        tone: kept.has(index) ? 'ink' : 'faint',
                        anchor: 'middle',
                    })),
                ]}
                yLabel="probability"
                notes={[
                    `${kept.size} of ${CANDIDATES.length} tokens kept`,
                    `nucleus mass ${(mass * 100).toFixed(0)}%`,
                ]}
                ariaLabel={`Next-token distribution at temperature ${temperature} keeping ${kept.size} tokens.`}
            />
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '10px' }}>
                <label className="control">
                    <span className="control-label">Temperature: {temperature.toFixed(2)}</span>
                    <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.05"
                        value={temperature}
                        onChange={(event) => setTemperature(Number(event.target.value))}
                    />
                </label>
                <label className="control">
                    <span className="control-label">top-p: {topP.toFixed(2)}</span>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={topP}
                        onChange={(event) => setTopP(Number(event.target.value))}
                    />
                </label>
            </div>
        </div>
    );
}

export const STAGE_KINDS = {
    kv: KvCacheStage,
    roofline: RooflineStage,
    sampling: SamplingStage,
};
