import { PRESETS } from './model';

// Shared input controls for the sorting visualizations: size, preset,
// and a reshuffle button that bumps the seed.
export default function ArrayControls({ n, setN, preset, setPreset, seed, setSeed }) {
    return (
        <>
            <label className="control">
                <span className="control-label">Bars: {n}</span>
                <input
                    type="range"
                    min="8"
                    max="40"
                    step="1"
                    value={n}
                    onChange={(event) => setN(Number(event.target.value))}
                />
            </label>
            <label className="control">
                <span className="control-label">Starting order</span>
                <select value={preset} onChange={(event) => setPreset(event.target.value)}>
                    {PRESETS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
            <button
                type="button"
                className="pill-button secondary"
                onClick={() => setSeed((prev) => prev + 1)}
            >
                Reshuffle
            </button>
        </>
    );
}
