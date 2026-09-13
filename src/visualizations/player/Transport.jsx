import './StepPlayer.css';

// The shared transport: previous · play/pause · next, the position readout
// with its progress rail, and the deep-link copy button. Both instruments —
// the trace player and the drill-down phase player — render this one bar,
// so a reader who has learned one page has learned them all.
//
// The three buttons are icon-only (the media-player convention) with full
// accessible names; the readout beside them says what a step is on this
// page ("Step 3 / 13", "Phase 2 / 16").

const ICONS = {
    prev: 'M3.5 3h2v10h-2zM13 3v10L6.5 8z',
    next: 'M10.5 3h2v10h-2zM3 3v10L9.5 8z',
    play: 'M4.5 2.5v11l8.5-5.5z',
    pause: 'M4 3h3v10H4zM9 3h3v10H9z',
};

function Icon({ name }) {
    return (
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
            <path d={ICONS[name]} fill="currentColor" />
        </svg>
    );
}

export default function Transport({
    unit = 'Step', // the noun in the readout and the button names
    index, // 0-based position
    count,
    playing,
    canPrev,
    canNext,
    onPrev,
    onNext,
    onTogglePlay,
    onCopy, // optional; omit to hide the copy-link button
    copied,
}) {
    const noun = unit.toLowerCase();
    const percent = count > 0 ? ((index + 1) / count) * 100 : 0;
    return (
        <div className="ti-player" role="group" aria-label={`${unit} controls`}>
            <div className="transport">
                <button
                    type="button"
                    className="transport-button"
                    onClick={onPrev}
                    disabled={!canPrev}
                    aria-label={`Previous ${noun}`}
                    title={`Previous ${noun} (←)`}
                >
                    <Icon name="prev" />
                </button>
                <button
                    type="button"
                    className={`transport-button play${playing ? ' is-playing' : ''}`}
                    onClick={onTogglePlay}
                    aria-label={playing ? 'Pause' : 'Play'}
                    title={playing ? 'Pause' : `Play through every ${noun}`}
                >
                    <Icon name={playing ? 'pause' : 'play'} />
                </button>
                <button
                    type="button"
                    className="transport-button"
                    onClick={onNext}
                    disabled={!canNext}
                    aria-label={`Next ${noun}`}
                    title={`Next ${noun} (→)`}
                >
                    <Icon name="next" />
                </button>
            </div>
            <div className="player-progress">
                <span className="player-count" aria-live="polite">
                    {unit} {index + 1} / {count}
                </span>
                <div className="player-rail">
                    <div className="player-fill" style={{ width: `${percent}%` }} />
                </div>
            </div>
            {onCopy && (
                <button
                    type="button"
                    className="pill-button secondary player-copy"
                    onClick={onCopy}
                    title={`Copy a link that restores these inputs and this ${noun}`}
                >
                    {copied ? 'Copied ✓' : 'Copy link'}
                </button>
            )}
        </div>
    );
}
