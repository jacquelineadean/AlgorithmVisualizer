import PlotStage from '../stages/PlotStage';
import { predict } from './model';

// The plane, the two classes, and the boundary the current weight vector
// draws. During training the point under consideration is ringed, so a
// correction reads as "this one was wrong, and the line just swung".

const LO = 0;
const HI = 10;

// w₀ + w₁x + w₂y = 0, clipped to the box. Returns null before any weight
// exists (training starts from the all-zero vector, which has no line).
function boundary(w) {
    const [w0, w1, w2] = w;
    if (Math.abs(w1) < 1e-9 && Math.abs(w2) < 1e-9) return null;
    if (Math.abs(w2) >= Math.abs(w1)) {
        return [
            { x: LO, y: -(w0 + w1 * LO) / w2 },
            { x: HI, y: -(w0 + w1 * HI) / w2 },
        ];
    }
    return [
        { x: -(w0 + w2 * LO) / w1, y: LO },
        { x: -(w0 + w2 * HI) / w1, y: HI },
    ];
}

export default function PerceptronStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { points, run } = artifacts;
    const base = step.data?.eventIndex ?? 0;
    const index = step.stream
        ? Math.min(base + Math.min(streamIndex, step.stream.events.length), run.events.length)
        : Math.min(base, run.events.length);
    const event = index > 0 ? run.events[index - 1] : null;
    const w = event ? event.w : [0, 0, 0];
    const stage = step.data?.stage ?? 'data';
    const showBoundary = stage !== 'data';

    const marks = [];
    const line = showBoundary ? boundary(w) : null;
    if (line) {
        marks.push({ type: 'line', points: line, tone: 'ink', width: 2 });
    }

    marks.push({
        type: 'points',
        points: points.map((point) => ({
            x: point.x,
            y: point.y,
            tone:
                showBoundary && predict(w, point) !== point.label
                    ? 'vermilion'
                    : point.label === 1
                      ? 'cobalt'
                      : 'green',
            r: point.label === 1 ? 4 : 3.6,
        })),
    });

    if (event && stage === 'training') {
        const point = points[event.index];
        marks.push({
            type: 'marker',
            x: point.x,
            y: point.y,
            tone: event.t === 'fix' ? 'vermilion' : 'faint',
            r: 9,
            label: event.t === 'fix' ? 'correct me' : 'ok',
        });
    }

    const wrong = showBoundary
        ? points.filter((point) => predict(w, point) !== point.label).length
        : points.length;

    return (
        <PlotStage
            square
            domain={[LO, HI]}
            range={[LO, HI]}
            marks={marks}
            xLabel="x₁"
            yLabel="x₂"
            notes={[
                line
                    ? `w = [ ${w.map((value) => value.toFixed(1)).join(', ')} ]`
                    : 'no boundary yet (w = 0)',
                showBoundary ? `${wrong} misclassified` : `${points.length} labelled points`,
            ]}
            ariaLabel={`Perceptron over ${points.length} points; ${wrong} currently misclassified.`}
        />
    );
}
