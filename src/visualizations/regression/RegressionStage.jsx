import PlotStage from '../stages/PlotStage';
import { residuals } from './model';

// Points, the line under discussion, and every residual drawn as the
// vertical stick least squares is squaring. The view switches with the step:
// the data alone, the trial line, then trial versus fit.

export default function RegressionStage({ steps, stepIndex, artifacts }) {
    const view = steps[stepIndex].data?.view ?? 'data';
    const { points, fit, trial, trialSse } = artifacts;

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const lineY = (line, x) => line.intercept + line.slope * x;
    const xLo = Math.min(...xs) - 0.6;
    const xHi = Math.max(...xs) + 0.6;
    const candidates = [...ys, lineY(fit, xLo), lineY(fit, xHi)];
    if (view !== 'data') candidates.push(lineY(trial, xLo), lineY(trial, xHi));
    const yLo = Math.min(...candidates) - 1;
    const yHi = Math.max(...candidates) + 1;

    const marks = [];

    if (view === 'trial' || view === 'both') {
        for (const row of residuals(points, trial.slope, trial.intercept)) {
            marks.push({
                type: 'segment',
                x1: row.x,
                y1: row.y,
                x2: row.x,
                y2: row.fit,
                tone: 'vermilion',
                width: 1,
            });
        }
        marks.push({
            type: 'line',
            points: [
                { x: xLo, y: lineY(trial, xLo) },
                { x: xHi, y: lineY(trial, xHi) },
            ],
            tone: 'vermilion',
            dashed: true,
            width: 2,
        });
    }

    if (view === 'both' || view === 'data') {
        marks.push({
            type: 'line',
            points: [
                { x: xLo, y: lineY(fit, xLo) },
                { x: xHi, y: lineY(fit, xHi) },
            ],
            tone: view === 'data' ? 'faint' : 'cobalt',
            width: 2,
            dashed: view === 'data',
        });
    }

    marks.push(
        {
            type: 'points',
            points: points.map((point) => ({
                x: point.x,
                y: point.y,
                tone: point.flagged ? 'gold' : 'ink',
                r: point.flagged ? 5 : 3.4,
            })),
        },
        {
            type: 'marker',
            x: fit.meanX,
            y: fit.meanY,
            tone: 'green',
            r: 6,
            label: '(x̄, ȳ)',
        }
    );

    const notes =
        view === 'data'
            ? [`${points.length} observations`]
            : view === 'trial'
              ? [`trial line · SSE = ${trialSse.toFixed(1)}`]
              : [
                    `fit · SSE = ${fit.sse.toFixed(1)}   R² = ${fit.r2.toFixed(3)}`,
                    `trial · SSE = ${trialSse.toFixed(1)}`,
                ];

    return (
        <PlotStage
            domain={[xLo, xHi]}
            range={[yLo, yHi]}
            marks={marks}
            xLabel="x"
            yLabel="y"
            notes={notes}
            ariaLabel={`Scatter of ${points.length} observations with the least-squares line y = ${fit.intercept.toFixed(
                2
            )} + ${fit.slope.toFixed(2)}x.`}
        />
    );
}
