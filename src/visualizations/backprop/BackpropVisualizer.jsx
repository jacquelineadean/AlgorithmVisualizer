import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TASKS, getTask } from './model';
import { buildBackpropTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import BackpropStage from './BackpropStage';

const num = (raw, lo, hi, fallback) => {
    const value = Number.parseFloat(raw ?? '');
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => ({
    taskId: TASKS.some((task) => task.id === sp.get('task')) ? sp.get('task') : 'xor',
    seed: Math.round(num(sp.get('seed'), 1, 9999, 5)),
    rate: num(sp.get('rate'), 0.1, 10, 3),
    epochs: Math.round(num(sp.get('epochs'), 100, 20000, 4000)),
    exampleIndex: Math.round(num(sp.get('ex'), 0, 3, 1)),
});

export default function BackpropVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [taskId, setTaskId] = useState(initial.taskId);
    const [seed, setSeed] = useState(initial.seed);
    const [rate, setRate] = useState(initial.rate);
    const [epochs, setEpochs] = useState(initial.epochs);
    const [exampleIndex, setExampleIndex] = useState(initial.exampleIndex);

    const task = getTask(taskId);

    const built = useMemo(() => {
        try {
            return { trace: buildBackpropTrace({ taskId, seed, rate, epochs, exampleIndex }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [taskId, seed, rate, epochs, exampleIndex]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Task</span>
                <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                    {TASKS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Traced example</span>
                <select
                    value={String(exampleIndex)}
                    onChange={(event) => setExampleIndex(Number(event.target.value))}
                >
                    {task.data.map((item, index) => (
                        <option key={item.input.join()} value={String(index)}>
                            ({item.input.join(', ')}) → {item.target}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Learning rate η: {rate.toFixed(1)}</span>
                <input
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={rate}
                    onChange={(event) => setRate(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Epochs: {epochs.toLocaleString()}</span>
                <input
                    type="range"
                    min="500"
                    max="10000"
                    step="500"
                    value={epochs}
                    onChange={(event) => setEpochs(Number(event.target.value))}
                />
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => setSeed((prev) => (prev % 9999) + 1)}
            >
                New initialization
            </button>
            <p className="control-note">{task.note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="Forward, backward, update"
            controls={controls}
            renderStage={(ctx) => <BackpropStage {...ctx} />}
            urlParams={{ task: taskId, seed, rate, epochs, ex: exampleIndex }}
            playIntervalMs={3200}
        />
    );
}
