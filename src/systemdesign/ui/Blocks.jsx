import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LABS } from '../labs';
import { findTray, trayPath } from '../model';
import Rich from './Rich';

// Renderers for the content blocks a section is built from. Systems are
// data; these components are the only place that data becomes markup, so
// every system reads the same way.

function LayerChip({ system, layerId }) {
    const tray = findTray(system, layerId);
    if (!tray) return null;
    return (
        <Link to={trayPath(system.id, tray.id)} className={`sd-chip c${tray.color}`} title={tray.name}>
            {tray.code}
        </Link>
    );
}

function Prose({ block }) {
    return (
        <div className="sd-prose">
            {block.paras.map((p, i) => (
                <p key={i}>
                    <Rich text={p} />
                </p>
            ))}
        </div>
    );
}

function List({ block }) {
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
        <Tag className={`sd-list${block.style === 'cards' ? ' cards' : ''}${block.ordered ? ' ordered' : ''}`}>
            {block.items.map((item, i) => (
                <li key={i}>
                    {typeof item === 'string' ? (
                        <Rich text={item} />
                    ) : (
                        <>
                            <strong>
                                <Rich text={item.title} />
                            </strong>{' '}
                            <Rich text={item.text} />
                        </>
                    )}
                </li>
            ))}
        </Tag>
    );
}

function Compare({ block }) {
    return (
        <div className="sd-compare" role="table" aria-label={`${block.a} and ${block.b}`}>
            <div className="sd-compare-row head" role="row">
                <span role="columnheader" />
                <span role="columnheader">{block.a}</span>
                <span role="columnheader">{block.b}</span>
            </div>
            {block.rows.map((row) => (
                <div className="sd-compare-row" role="row" key={row.label}>
                    <span role="rowheader" className="sd-compare-label">
                        {row.label}
                    </span>
                    <span role="cell">
                        <Rich text={row.a} />
                    </span>
                    <span role="cell">
                        <Rich text={row.b} />
                        {row.note && (
                            <small className="sd-compare-note">
                                <Rich text={row.note} />
                            </small>
                        )}
                    </span>
                </div>
            ))}
            {block.note && (
                <p className="sd-fig-note">
                    <Rich text={block.note} />
                </p>
            )}
        </div>
    );
}

const SPEC_FIELDS = [
    ['owns', 'Owns'],
    ['neighbors', 'Talks to its neighbors'],
    ['pattern', 'A pattern you already know'],
    ['metrics', 'Watch these metrics'],
    ['knobs', 'Turn these knobs'],
    ['failures', 'How it fails'],
    ['boundary', 'Decision boundary'],
];

function Spec({ block }) {
    return (
        <dl className="sd-spec">
            {SPEC_FIELDS.filter(([key]) => block[key]).map(([key, label]) => (
                <div key={key} className={`sd-spec-row ${key}`}>
                    <dt>{label}</dt>
                    <dd>
                        {Array.isArray(block[key]) ? (
                            <ul>
                                {block[key].map((item, i) => (
                                    <li key={i}>
                                        <Rich text={item} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <Rich text={block[key]} />
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function Stats({ block }) {
    return (
        <div className="sd-stats">
            {block.items.map((item) => (
                <div className="sd-stat" key={item.label}>
                    <div className="sd-stat-value">{item.value}</div>
                    <div className="sd-stat-label">
                        <Rich text={item.label} />
                    </div>
                    {item.note && (
                        <div className="sd-stat-note">
                            <Rich text={item.note} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function Table({ block, system }) {
    return (
        <div className="sd-table-wrap">
            <table className="sd-table">
                {block.caption && <caption>{block.caption}</caption>}
                <thead>
                    <tr>
                        {block.columns.map((c) => (
                            <th key={c} scope="col">
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {block.rows.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => (
                                <td key={j}>
                                    {j === 0 && block.layerColumn ? (
                                        <LayerChip system={system} layerId={cell} />
                                    ) : (
                                        <Rich text={cell} />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Bars({ block }) {
    const max = Math.max(...block.series.flatMap((s) => s.values));
    return (
        <figure className="sd-bars">
            {block.title && <figcaption className="sd-fig-title">{block.title}</figcaption>}
            <div className="sd-bars-legend">
                {block.series.map((s, i) => (
                    <span key={s.name}>
                        <i className={`sw s${i}`} aria-hidden="true" />
                        {s.name}
                    </span>
                ))}
            </div>
            {block.categories.map((cat, ci) => (
                <div className="sd-bars-row" key={cat}>
                    <span className="sd-bars-cat">{cat}</span>
                    <span className="sd-bars-tracks">
                        {block.series.map((s, si) => (
                            <span className="sd-bars-track" key={s.name}>
                                <span className={`sd-bars-fill s${si}`} style={{ width: `${(100 * s.values[ci]) / max}%` }} />
                                <span className="sd-bars-value">
                                    {s.values[ci].toLocaleString('en-US')} {block.unit}
                                </span>
                            </span>
                        ))}
                    </span>
                </div>
            ))}
            {block.note && (
                <p className="sd-fig-note">
                    <Rich text={block.note} />
                </p>
            )}
        </figure>
    );
}

function Timeline({ block }) {
    return (
        <ol className="sd-timeline">
            {block.events.map((e) => (
                <li key={e.title} className={e.kind === 'paper' ? 'paper' : 'launch'}>
                    <span className="sd-tl-date">{e.date}</span>
                    <span className="sd-tl-dot" aria-hidden="true" />
                    <span className="sd-tl-body">
                        <strong>{e.title}</strong> <span className="sd-tl-kind">{e.kind === 'paper' ? 'paper' : 'launch'}</span>
                        <br />
                        <Rich text={e.text} />
                    </span>
                </li>
            ))}
        </ol>
    );
}

function Quiz({ block }) {
    const [answers, setAnswers] = useState({});
    const total = block.questions.length;
    const answered = Object.keys(answers).length;
    const right = block.questions.filter((q, i) => answers[i] === q.answer).length;
    const result = answered === total ? [...(block.results ?? [])].reverse().find((r) => right / total >= r.min) : null;
    return (
        <div className="sd-quiz">
            {block.questions.map((q, qi) => {
                const chosen = answers[qi];
                return (
                    <fieldset key={qi} className="sd-quiz-q">
                        <legend>
                            <span className="sd-quiz-n">{qi + 1}</span>
                            <Rich text={q.q} />
                        </legend>
                        <div className="sd-quiz-options">
                            {q.options.map((opt, oi) => {
                                const state = chosen == null ? '' : oi === q.answer ? ' right' : oi === chosen ? ' wrong' : ' dim';
                                return (
                                    <button
                                        type="button"
                                        key={oi}
                                        className={`sd-quiz-opt${state}`}
                                        disabled={chosen != null}
                                        aria-pressed={chosen === oi}
                                        onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                                    >
                                        <Rich text={opt} />
                                    </button>
                                );
                            })}
                        </div>
                        {chosen != null && (
                            <p className={`sd-quiz-explain${chosen === q.answer ? ' ok' : ' no'}`}>
                                <strong>{chosen === q.answer ? 'Right.' : 'Not quite.'}</strong> <Rich text={q.explain} />
                            </p>
                        )}
                    </fieldset>
                );
            })}
            <div className="sd-quiz-score" aria-live="polite">
                {answered < total ? (
                    `${answered} of ${total} answered`
                ) : (
                    <>
                        <strong>
                            {right} of {total} right.
                        </strong>{' '}
                        {result && (
                            <>
                                {result.label}. {result.text}
                            </>
                        )}{' '}
                        <button type="button" className="sd-btn" onClick={() => setAnswers({})}>
                            Try again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function Drill({ block, system }) {
    const [shown, setShown] = useState(0);
    const [scarce, setScarce] = useState(false);
    const done = shown >= block.steps.length;
    return (
        <div className="sd-drill">
            {block.title && <h4 className="sd-drill-title">{block.title}</h4>}
            <p className="sd-drill-scenario">
                <Rich text={block.scenario} />
            </p>
            <div className="sd-drill-scarce">
                <span className="sd-k">The scarce resource</span>
                {scarce ? (
                    <p>
                        <Rich text={block.scarce} />
                    </p>
                ) : (
                    <button type="button" className="sd-btn" onClick={() => setScarce(true)}>
                        Name it, then reveal
                    </button>
                )}
            </div>
            <ol className="sd-drill-steps">
                {block.steps.slice(0, shown).map((step, i) => (
                    <li key={i}>
                        {step.layer && <LayerChip system={system} layerId={step.layer} />}
                        <span>
                            <strong>{step.title}.</strong> <Rich text={step.text} />
                        </span>
                    </li>
                ))}
            </ol>
            <div className="sd-row">
                {!done ? (
                    <button type="button" className="sd-btn primary" onClick={() => setShown((n) => n + 1)}>
                        Reveal step {shown + 1} of {block.steps.length}
                    </button>
                ) : (
                    <button type="button" className="sd-btn" onClick={() => setShown(0)}>
                        Hide the steps
                    </button>
                )}
            </div>
            {done && block.switches?.length > 0 && (
                <div className="sd-drill-switch">
                    <span className="sd-k">What would change the answer</span>
                    <ul>
                        {block.switches.map((s, i) => (
                            <li key={i}>
                                <Rich text={s} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function Checklist({ block }) {
    const [ticked, setTicked] = useState(() => new Set());
    const all = block.groups.flatMap((g) => g.items);
    return (
        <div className="sd-checklist">
            <p className="sd-fig-note" aria-live="polite">
                {ticked.size} of {all.length} already tracked
            </p>
            <div className="sd-checklist-groups">
                {block.groups.map((g) => (
                    <fieldset key={g.title}>
                        <legend>{g.title}</legend>
                        {g.items.map((item) => (
                            <label key={item} className="sd-check">
                                <input
                                    type="checkbox"
                                    checked={ticked.has(item)}
                                    onChange={() =>
                                        setTicked((s) => {
                                            const n = new Set(s);
                                            if (n.has(item)) n.delete(item);
                                            else n.add(item);
                                            return n;
                                        })
                                    }
                                />
                                <span>
                                    <Rich text={item} />
                                </span>
                            </label>
                        ))}
                    </fieldset>
                ))}
            </div>
        </div>
    );
}

function Code({ block }) {
    return (
        <div className="sd-code">
            <pre>
                <code>{block.code}</code>
            </pre>
            {block.notes && (
                <ol className="sd-code-notes">
                    {block.notes.map((n, i) => (
                        <li key={i}>
                            <Rich text={n} />
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

function Quote({ block }) {
    return (
        <figure className="sd-quote">
            <figcaption>{block.label ?? 'Say it this way'}</figcaption>
            <blockquote>“{block.text}”</blockquote>
        </figure>
    );
}

function Links({ block }) {
    return (
        <div className="sd-links">
            {block.items.map((item) => (
                <Link key={item.to} to={item.to} className="sd-link-card">
                    <strong>{item.label}</strong>
                    <span>
                        <Rich text={item.text} />
                    </span>
                    <span className="chev" aria-hidden="true">
                        ›
                    </span>
                </Link>
            ))}
        </div>
    );
}

function LayerIndex({ system }) {
    const trays = [...system.layers, ...system.topics];
    return (
        <ol className="sd-layer-index">
            {trays.map((t) => (
                <li key={t.id}>
                    <Link to={trayPath(system.id, t.id)} className={`sd-layer-card c${t.color}`}>
                        <span className="sd-layer-code">{t.code}</span>
                        <span className="sd-layer-text">
                            <strong>{t.name}</strong>
                            <span>{t.title}</span>
                        </span>
                    </Link>
                </li>
            ))}
        </ol>
    );
}

function Lab({ block, system, tray }) {
    const Component = LABS[block.lab];
    if (!Component) return <p className="sd-fig-note">Missing lab “{block.lab}”.</p>;
    return (
        <figure className="sd-lab" aria-label={block.title ?? undefined}>
            {block.title && <figcaption className="sd-fig-title">{block.title}</figcaption>}
            {block.sub && (
                <p className="sd-fig-sub">
                    <Rich text={block.sub} />
                </p>
            )}
            <Component {...(block.props ?? {})} system={system} tray={tray} />
        </figure>
    );
}

function Note({ block }) {
    return (
        <p className="sd-fig-note">
            <Rich text={block.text} />
        </p>
    );
}

export const BLOCKS = {
    prose: Prose,
    list: List,
    compare: Compare,
    spec: Spec,
    stats: Stats,
    table: Table,
    bars: Bars,
    timeline: Timeline,
    quiz: Quiz,
    drill: Drill,
    checklist: Checklist,
    code: Code,
    quote: Quote,
    links: Links,
    layers: LayerIndex,
    lab: Lab,
    note: Note,
};

export function Block({ block, system, tray }) {
    const Component = BLOCKS[block.kind];
    if (!Component) return null;
    return <Component block={block} system={system} tray={tray} />;
}
