import { useEffect, useId, useRef, useState } from 'react';
import Rich from '../ui/Rich';

// The small controls every lab is built from, so labs read alike: a
// segmented choice, a labelled slider, a row of readouts and a sentence
// that says what the picture shows.

export function Seg({ label, options, value, onChange }) {
    return (
        <div className="sd-seg" role="group" aria-label={label}>
            {options.map((o) => {
                const id = typeof o === 'string' ? o : o.id;
                const name = typeof o === 'string' ? o : o.name;
                return (
                    <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
                        {name}
                    </button>
                );
            })}
        </div>
    );
}

export function Slider({ label, min, max, step = 1, value, onChange, format = String, note }) {
    const id = useId();
    return (
        <div className="sd-slider">
            <label htmlFor={id}>
                <span>{label}</span>
                <output htmlFor={id}>{format(value)}</output>
            </label>
            <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
            {note && <small>{note}</small>}
        </div>
    );
}

export function Select({ label, options, value, onChange }) {
    const id = useId();
    return (
        <div className="sd-select">
            <label htmlFor={id}>{label}</label>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function Readouts({ items }) {
    return (
        <dl className="sd-readouts">
            {items.map((item) => (
                <div key={item.label} className={`sd-readout${item.strong ? ' strong' : ''}${item.tone ? ` ${item.tone}` : ''}`}>
                    <dd>{item.value}</dd>
                    <dt>{item.label}</dt>
                </div>
            ))}
        </dl>
    );
}

export function Says({ text, children }) {
    return (
        <p className="sd-says" aria-live="polite">
            {text != null ? <Rich text={text} /> : children}
        </p>
    );
}

export function Note({ children }) {
    return <p className="sd-fig-note">{children}</p>;
}

export function Row({ children }) {
    return <div className="sd-row">{children}</div>;
}

export function Button({ children, primary, ...rest }) {
    return (
        <button type="button" className={`sd-btn${primary ? ' primary' : ''}`} {...rest}>
            {children}
        </button>
    );
}

// A play/pause clock for step-based labs. Calls tick() every `ms` while
// playing; pauses itself when tick returns false.
export function usePlayer(tick, ms, { autoplay = false } = {}) {
    const [playing, setPlaying] = useState(autoplay);
    const tickRef = useRef(tick);
    tickRef.current = tick;
    useEffect(() => {
        if (!playing) return undefined;
        const id = setInterval(() => {
            if (tickRef.current() === false) setPlaying(false);
        }, ms);
        return () => clearInterval(id);
    }, [playing, ms]);
    return [playing, setPlaying];
}

// Copy text, falling back to a visible "select it" state when the
// clipboard is not available.
export function CopyButton({ text, label = 'Copy' }) {
    const [state, setState] = useState(label);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setState('Copied');
        } catch {
            setState('Select and copy it');
        }
        setTimeout(() => setState(label), 1500);
    };
    return (
        <Button onClick={copy} aria-label={`${label}: ${text}`}>
            {state}
        </Button>
    );
}

export const pct = (x, digits = 0) => `${(x * 100).toFixed(digits)}%`;
