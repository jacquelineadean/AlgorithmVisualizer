import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CHOICES, getChoice } from './model';
import { buildCapTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import CapStage from './CapStage';

const int = (raw, lo, hi, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value >= lo && value <= hi ? value : fallback;
};

const readInitial = (sp) => {
    const n = int(sp.get('n'), 1, 9, 3);
    return {
        choiceId: CHOICES.some((choice) => choice.id === sp.get('mode')) ? sp.get('mode') : 'cp',
        n,
        r: int(sp.get('r'), 1, n, 2),
        w: int(sp.get('w'), 1, n, 2),
    };
};

// The theorem's outcome table — a one-off kind, registered here rather than
// promoted into the shared player until a second visualization needs it.
function TableView({ data }) {
    return (
        <div className="math-block">
            <table className="sqmul-table">
                <thead>
                    <tr>
                        <th>network</th>
                        <th>policy</th>
                        <th>consistent</th>
                        <th>available</th>
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, i) => (
                        <tr key={i}>
                            <td>{row.network}</td>
                            <td>{row.policy}</td>
                            <td>{row.consistent}</td>
                            <td>{row.availableLabel}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function CapVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [choiceId, setChoiceId] = useState(initial.choiceId);
    const [n, setN] = useState(initial.n);
    const [r, setR] = useState(initial.r);
    const [w, setW] = useState(initial.w);

    const safeR = Math.min(r, n);
    const safeW = Math.min(w, n);

    const built = useMemo(() => {
        try {
            return { trace: buildCapTrace({ choiceId, n, r: safeR, w: safeW }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [choiceId, n, safeR, safeW]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">During a partition</span>
                <select value={choiceId} onChange={(event) => setChoiceId(event.target.value)}>
                    {CHOICES.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                            {choice.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Replicas N: {n}</span>
                <input
                    type="range"
                    min="1"
                    max="7"
                    value={n}
                    onChange={(event) => setN(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Read quorum R: {safeR}</span>
                <input
                    type="range"
                    min="1"
                    max={n}
                    value={safeR}
                    onChange={(event) => setR(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Write quorum W: {safeW}</span>
                <input
                    type="range"
                    min="1"
                    max={n}
                    value={safeW}
                    onChange={(event) => setW(Number(event.target.value))}
                />
            </label>
            <p className="control-note">{getChoice(choiceId).note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="One write, one read, one partition"
            controls={controls}
            renderStage={(ctx) => <CapStage {...ctx} />}
            detailKinds={{ table: TableView }}
            urlParams={{ mode: choiceId, n, r: safeR, w: safeW }}
            playIntervalMs={3200}
        />
    );
}
