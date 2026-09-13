import GraphStage from '../stages/GraphStage';
import PlotStage from '../stages/PlotStage';
import { forward } from './model';

// Two views: the network itself — edges thickened by weight magnitude,
// labelled with activations on the forward pass and with gradients on the
// backward one — and the loss curve while training runs.

const fmt = (value) => Number(value).toFixed(2);

export default function BackpropStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const view = step.data?.view ?? 'network';
    const phase = step.data?.phase ?? 'idle';
    const { sample, pass, run, net } = artifacts;

    if (view === 'curve') {
        const shown = Math.max(1, Math.min(streamIndex + 1, run.curve.length));
        const curve = run.curve.slice(0, shown);
        const maxLoss = Math.max(...run.curve.map((point) => point.loss), 0.01);
        return (
            <PlotStage
                domain={[0, run.curve.at(-1).epoch]}
                range={[0, maxLoss * 1.1]}
                marks={[
                    {
                        type: 'line',
                        points: curve.map((point) => ({ x: point.epoch, y: point.loss })),
                        tone: 'cobalt',
                        width: 2,
                    },
                    {
                        type: 'marker',
                        x: curve.at(-1).epoch,
                        y: curve.at(-1).loss,
                        tone: 'vermilion',
                        r: 6,
                        label: curve.at(-1).loss.toFixed(4),
                    },
                ]}
                xLabel="epoch"
                yLabel="mean squared error"
                notes={[`epoch ${curve.at(-1).epoch.toLocaleString()}`]}
                ariaLabel={`Training loss falling from ${run.curve[0].loss.toFixed(
                    4
                )} to ${curve.at(-1).loss.toFixed(4)}.`}
            />
        );
    }

    const current = phase === 'trained' ? run.net : net;
    const activations = phase === 'trained' ? forward(current, sample.input) : pass.forward;
    const showGradients = phase === 'backward';

    const nodes = [
        {
            id: 'x1',
            x: 0.04,
            y: 0.24,
            label: `x₁`,
            sub: String(sample.input[0]),
            tone: 'faint',
            r: 20,
        },
        {
            id: 'x2',
            x: 0.04,
            y: 0.76,
            label: `x₂`,
            sub: String(sample.input[1]),
            tone: 'faint',
            r: 20,
        },
        {
            id: 'h1',
            x: 0.46,
            y: 0.2,
            label: 'h₁',
            sub: fmt(activations.a1[0]),
            tone: showGradients ? 'vermilion' : 'cobalt',
            r: 24,
            caption: showGradients ? `δ ${pass.delta1[0].toFixed(3)}` : null,
        },
        {
            id: 'h2',
            x: 0.46,
            y: 0.8,
            label: 'h₂',
            sub: fmt(activations.a1[1]),
            tone: showGradients ? 'vermilion' : 'cobalt',
            r: 24,
            caption: showGradients ? `δ ${pass.delta1[1].toFixed(3)}` : null,
        },
        {
            id: 'y',
            x: 0.92,
            y: 0.5,
            label: 'ŷ',
            sub: fmt(activations.a2),
            tone: showGradients ? 'vermilion' : 'green',
            ring: true,
            r: 26,
            caption: showGradients
                ? `δ ${pass.delta2.toFixed(3)}`
                : `target ${sample.target}`,
        },
    ];

    const edge = (from, to, weight, gradient) => ({
        from,
        to,
        label: showGradients ? gradient.toFixed(3) : weight.toFixed(2),
        tone: showGradients ? 'vermilion' : weight >= 0 ? 'cobalt' : 'gold',
        width: 0.8 + Math.min(3, Math.abs(showGradients ? gradient * 8 : weight)),
    });

    const edges = [
        edge('x1', 'h1', current.W1[0][0], pass.gW1[0][0]),
        edge('x2', 'h1', current.W1[0][1], pass.gW1[0][1]),
        edge('x1', 'h2', current.W1[1][0], pass.gW1[1][0]),
        edge('x2', 'h2', current.W1[1][1], pass.gW1[1][1]),
        edge('h1', 'y', current.W2[0], pass.gW2[0]),
        edge('h2', 'y', current.W2[1], pass.gW2[1]),
    ];

    return (
        <GraphStage
            nodes={nodes}
            edges={edges}
            notes={[
                showGradients ? 'edge labels: ∂E/∂w' : 'edge labels: weights',
                phase === 'trained'
                    ? `trained · loss ${run.curve.at(-1).loss.toFixed(4)}`
                    : `example (${sample.input.join(', ')}) → ${sample.target}`,
            ]}
            ariaLabel={`Two-two-one network; output ${fmt(activations.a2)} against target ${
                sample.target
            }.`}
        />
    );
}
