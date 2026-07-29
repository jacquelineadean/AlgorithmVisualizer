import PlotStage from '../stages/PlotStage';
import { bytesLabel, learningRate, stateBreakdown, stateBytes, stepsInRun } from './model';

// Two focused stages: where the memory goes per parameter, and the shape of
// the learning-rate schedule the run actually follows. Both compute from the
// same pure model the map's metrics use.

const TONES = {
    weights: 'cobalt',
    gradients: 'vermilion',
    master: 'gold',
    momentum: 'green',
    variance: 'ink',
};

export function MemoryStage({ data }) {
    const { run } = data;
    const rows = stateBreakdown(run.params);
    const total = stateBytes(run.params);

    return (
        <div>
            <PlotStage
                domain={[0, total]}
                range={[-0.5, rows.length - 0.5]}
                xTicks={4}
                yTicks={rows.length - 1}
                marks={[
                    ...rows.map((row, i) => ({
                        type: 'segment',
                        x1: 0,
                        y1: i,
                        x2: row.bytes,
                        y2: i,
                        tone: TONES[row.label] ?? 'faint',
                        width: 16,
                    })),
                    ...rows.map((row, i) => ({
                        type: 'label',
                        x: row.bytes,
                        y: i,
                        dy: 4,
                        text: `  ${row.label} · ${bytesLabel(row.bytes)}`,
                        tone: 'ink',
                    })),
                ]}
                xLabel="bytes"
                notes={[`${bytesLabel(total)} total · 16 bytes per parameter`]}
                ariaLabel={`Optimizer state breakdown totalling ${bytesLabel(total)}.`}
            />
            <p className="dd-hint" style={{ marginTop: '8px' }}>
                The bf16 weights are the smallest bar on the chart. Six of every eight bytes
                exist only so the update can be computed accurately — which is what ZeRO
                shards away.
            </p>
        </div>
    );
}

export function ScheduleStage({ data }) {
    const { run } = data;
    const total = stepsInRun(run);
    const warmup = Math.max(1, Math.round(total * 0.01));
    const points = Array.from({ length: 200 }, (_, i) => {
        const step = Math.round((total * i) / 199);
        return { x: step, y: learningRate(step, { total, warmup }) };
    });
    const peak = Math.max(...points.map((point) => point.y));

    return (
        <div>
            <PlotStage
                domain={[0, total]}
                range={[0, peak * 1.15]}
                xTicks={4}
                yTicks={4}
                marks={[
                    { type: 'line', points, tone: 'cobalt', width: 2 },
                    {
                        type: 'segment',
                        x1: warmup,
                        y1: 0,
                        x2: warmup,
                        y2: peak * 1.1,
                        tone: 'vermilion',
                        dashed: true,
                    },
                    {
                        type: 'label',
                        x: warmup,
                        y: peak * 1.12,
                        text: `warmup ends (${warmup.toLocaleString()} steps)`,
                        tone: 'vermilion',
                    },
                ]}
                xLabel="optimizer step"
                yLabel="learning rate"
                notes={[`${total.toLocaleString()} steps`, 'linear warmup → cosine decay']}
                ariaLabel="Learning-rate schedule: linear warmup followed by cosine decay to a floor."
            />
            <p className="dd-hint" style={{ marginTop: '8px' }}>
                Warmup is about 1% of the run. The decay floor is 10% of peak — stopping at
                zero would waste the final steps, and stopping high leaves the loss noisier
                than it needs to be.
            </p>
        </div>
    );
}

export const STAGE_KINDS = {
    memory: MemoryStage,
    schedule: ScheduleStage,
};
