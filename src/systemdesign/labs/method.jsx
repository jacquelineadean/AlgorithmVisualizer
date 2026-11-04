import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ACCESS_PATTERNS,
    CONSUMERS,
    DEPTH_CANDIDATES,
    DEPTH_LAYERS,
    DEPTH_TEAMS,
    DEPTH_TEXT,
    POKES,
    PRIMITIVE_FAMILIES,
    REQUIREMENT_QUESTIONS,
    SUMMARY_LINES,
    TRADEOFFS,
} from '../systems/fundamentalsData';
import Rich from '../ui/Rich';
import { Button, CopyButton, Row, Says, Seg } from './kit';

// Labs for the Four Mental Models system: the method's own tools, as
// things to click rather than lists to read.

export function RequirementsChecklist() {
    const [done, setDone] = useState(() => new Set());
    const n = done.size;
    return (
        <div className="sd-checklist8">
            <div className="sd-progress" aria-hidden="true">
                <span style={{ width: `${(n / 8) * 100}%` }} />
            </div>
            <p className="sd-fig-note" aria-live="polite">
                {n === 8 ? 'All 8 known. Draw the first box.' : `Constraints known: ${n} of 8`}
            </p>
            <ol className="sd-q-list">
                {REQUIREMENT_QUESTIONS.map(([q, decides], i) => {
                    const on = done.has(i);
                    return (
                        <li key={q} className={on ? 'done' : ''}>
                            <button
                                type="button"
                                aria-expanded={on}
                                onClick={() =>
                                    setDone((s) => {
                                        const next = new Set(s);
                                        if (next.has(i)) next.delete(i);
                                        else next.add(i);
                                        return next;
                                    })
                                }
                            >
                                <span className="box" aria-hidden="true" />
                                <span>{q}</span>
                                <span className="n">Q{i + 1}</span>
                            </button>
                            {on && (
                                <p>
                                    <strong>This decides:</strong> {decides}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

export function ConsumerQuestion() {
    const [k, setK] = useState('chat');
    const c = CONSUMERS[k];
    return (
        <div>
            <Seg label="Consumer" options={Object.entries(CONSUMERS).map(([id, v]) => ({ id, name: v.name }))} value={k} onChange={setK} />
            <p className="sd-goal">
                <span>Optimize for</span> {c.goal}
            </p>
            <ol className="sd-chain">
                {c.chain.map(([name, text]) => (
                    <li key={name}>
                        <strong>{name}</strong>
                        <span>{text}</span>
                    </li>
                ))}
            </ol>
            <dl className="sd-spec">
                <div className="sd-spec-row">
                    <dt>Key numbers</dt>
                    <dd>{c.numbers}</dd>
                </div>
                <div className="sd-spec-row">
                    <dt>Leaves out</dt>
                    <dd>{c.drops}</dd>
                </div>
            </dl>
        </div>
    );
}

export function PokeTest() {
    const [on, setOn] = useState(null);
    const boxes = [
        { id: 'client', x: 20, label: 'Client' },
        { id: 'app', x: 230, label: 'App server' },
        { id: 'db', x: 440, label: 'Postgres' },
    ];
    const markAt = { client: [70, 30], request: [180, 40], app: [280, 30], db: [490, 30] };
    return (
        <div>
            <svg viewBox="0 0 600 150" className="sd-svg" role="img" aria-label="A naive three-box design with four questions marked on it">
                {boxes.map((b) => (
                    <g key={b.id}>
                        <rect x={b.x} y={60} width={140} height={56} rx={6} className="sd-box" />
                        <text x={b.x + 70} y={93} textAnchor="middle" className="sd-box-text">
                            {b.label}
                        </text>
                    </g>
                ))}
                <path d="M160 88 H230 M370 88 H440" className="sd-wire" markerEnd="url(#sd-arrow)" />
                <defs>
                    <marker id="sd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" className="sd-arrowhead" />
                    </marker>
                </defs>
                {POKES.map((p, i) => {
                    const [x, y] = markAt[p.at];
                    return (
                        <g
                            key={p.at}
                            className={`sd-poke${on === i ? ' on' : ''}`}
                            role="button"
                            tabIndex={0}
                            aria-label={p.read}
                            onClick={() => setOn(i)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setOn(i);
                                }
                            }}
                        >
                            <text x={x} y={y} textAnchor="middle">
                                {p.mark}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <Says>
                {on == null ? (
                    'Tap a red question.'
                ) : (
                    <>
                        <strong>{POKES[on].read}</strong> {POKES[on].means}
                    </>
                )}
            </Says>
        </div>
    );
}

export function Primitives() {
    const [pattern, setPattern] = useState(null);
    const [vendors, setVendors] = useState(false);
    const [sel, setSel] = useState(null);
    const lit = pattern == null ? null : new Set(ACCESS_PATTERNS[pattern][1]);
    const all = PRIMITIVE_FAMILIES.flatMap(([, items]) => items);
    const d = all.find((t) => t[0] === sel);
    return (
        <div>
            <div className="sd-chips" role="group" aria-label="Access patterns">
                {ACCESS_PATTERNS.map(([name], i) => (
                    <button key={name} type="button" className="sd-chip-btn" aria-pressed={pattern === i} onClick={() => setPattern(pattern === i ? null : i)}>
                        {name}
                    </button>
                ))}
            </div>
            <label className="sd-toggle">
                <input type="checkbox" checked={vendors} onChange={(e) => setVendors(e.target.checked)} /> Show vendors
            </label>
            <div className="sd-prims">
                {PRIMITIVE_FAMILIES.map(([family, items]) => (
                    <div className="sd-prim-family" key={family}>
                        <div className="sd-prim-fam">{family}</div>
                        {items.map((t) => (
                            <button
                                key={t[0]}
                                type="button"
                                className={`sd-prim${lit && lit.has(t[0]) ? ' hit' : ''}${lit && !lit.has(t[0]) ? ' dim' : ''}${sel === t[0] ? ' sel' : ''}`}
                                onClick={() => setSel(t[0])}
                            >
                                <span className="nm">{t[1]}</span>
                                {vendors && <span className="vd">{t[3]}</span>}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
            <Says>
                {d ? (
                    <>
                        <strong>{d[1]}.</strong> {d[2]} Reach for it when {d[4].charAt(0).toLowerCase() + d[4].slice(1)}{' '}
                        <span className="sd-muted">Vendors, chosen last: {d[3]}.</span>
                    </>
                ) : (
                    `${all.length} primitives in ${PRIMITIVE_FAMILIES.length} families. Pick an access pattern first, then tap a tile.`
                )}
            </Says>
        </div>
    );
}

export function TradeoffPairs({ only }) {
    const pairs = only ? TRADEOFFS.filter((p) => only.includes(p[0])) : TRADEOFFS;
    const [i, setI] = useState(0);
    const [, title, A, B, number] = pairs[Math.min(i, pairs.length - 1)];
    return (
        <div>
            {pairs.length > 1 && (
                <div className="sd-chips" role="group" aria-label="Tradeoff pairs">
                    {pairs.map((p, j) => (
                        <button key={p[0]} type="button" className="sd-chip-btn" aria-pressed={i === j} onClick={() => setI(j)}>
                            {p[1]}
                        </button>
                    ))}
                </div>
            )}
            <div className="sd-compare" role="table" aria-label={title}>
                <div className="sd-compare-row head" role="row">
                    <span role="columnheader" />
                    <span role="columnheader">{A[0]}</span>
                    <span role="columnheader">{B[0]}</span>
                </div>
                {['Gives you', 'Costs you', 'Choose it for'].map((label, k) => (
                    <div className="sd-compare-row" role="row" key={label}>
                        <span role="rowheader" className="sd-compare-label">
                            {label}
                        </span>
                        <span role="cell">{A[k + 1]}</span>
                        <span role="cell">{B[k + 1]}</span>
                    </div>
                ))}
            </div>
            <Says>
                <strong>The deciding number:</strong> {number}
            </Says>
        </div>
    );
}

export function DepthStrata({ only }) {
    const comps = [
        { id: 'kafka-log', name: 'Kafka log' },
        { id: 'paged-kv-cache', name: 'PagedAttention KV cache' },
        { id: 'sharded-postgres', name: 'Sharded Postgres' },
    ].filter((c) => !only || only.includes(c.id));
    const [comp, setComp] = useState(comps[0].id);
    const [layer, setLayer] = useState(0);
    const c = comps.find((x) => x.id === comp);
    return (
        <div className="sd-strata">
            {comps.length > 1 && <Seg label="Component" options={comps} value={comp} onChange={setComp} />}
            <div className="sd-strata-grid">
                <ol className="sd-strata-layers">
                    {DEPTH_LAYERS.map((l, i) => (
                        <li key={l}>
                            <button type="button" className={`d${i + 1}`} aria-pressed={layer === i} onClick={() => setLayer(i)}>
                                <i>{i + 1}</i> {l}
                            </button>
                        </li>
                    ))}
                </ol>
                <div className="sd-strata-card">
                    <div className="sd-k">
                        Layer {layer + 1} of 5 · {DEPTH_LAYERS[layer]}
                    </div>
                    <h4>{c.name}</h4>
                    <p>
                        <Rich text={DEPTH_TEXT[comp][layer]} />
                    </p>
                    <Link className="text-link" to={`/systems/${comp}/d${layer + 1}`}>
                        Open this layer of {c.name} <span className="chev">›</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export function DepthBudget() {
    const [team, setTeam] = useState('inference');
    const [sel, setSel] = useState('router');
    const region = (c) => c[2] + (c[3] === team ? 'T' : '');
    // Anchor points for the seven regions of a three-circle Venn diagram.
    // Dots carry numbers only; the list beside the figure carries the names.
    const ANCHOR = { L: [128, 118], N: [392, 118], T: [260, 330], LN: [260, 78], LT: [180, 238], NT: [340, 238], LNT: [260, 186] };
    const groups = {};
    DEPTH_CANDIDATES.forEach((c, n) => {
        const r = region(c);
        if (ANCHOR[r]) (groups[r] ??= []).push([c, n]);
    });
    const outside = DEPTH_CANDIDATES.filter((c) => !ANCHOR[region(c)]);
    const core = DEPTH_CANDIDATES.filter((c) => region(c) === 'LNT');
    const s = DEPTH_CANDIDATES.find((c) => c[0] === sel);
    const parts = [];
    if (s[2].includes('L')) parts.push('load-bearing');
    if (s[2].includes('N')) parts.push('novel');
    if (s[3] === team) parts.push('owned by your team');
    const place = (r, i, k) => {
        const [x, y] = ANCHOR[r];
        const perRow = Math.min(k, 3);
        const rows = Math.ceil(k / 3);
        const col = i % 3;
        const row = Math.floor(i / 3);
        const inRow = row === rows - 1 ? k - row * 3 : perRow;
        return [x + (col - (inRow - 1) / 2) * 32, y + (row - (rows - 1) / 2) * 32];
    };
    return (
        <div>
            <Seg label="Your team" options={DEPTH_TEAMS} value={team} onChange={setTeam} />
            <div className="sd-venn-wrap">
                <svg viewBox="0 10 520 395" className="sd-svg sd-venn" role="img" aria-label="Three overlapping circles: load-bearing, novel, owned by your team">
                    <circle cx="190" cy="150" r="125" className="v1" />
                    <circle cx="330" cy="150" r="125" className="v2" />
                    <circle cx="260" cy="265" r="125" className="v3" />
                    <text x="80" y="34" className="sd-venn-label">Load-bearing</text>
                    <text x="440" y="34" className="sd-venn-label" textAnchor="end">Novel</text>
                    <text x="260" y="404" className="sd-venn-label" textAnchor="middle">Your team</text>
                    {Object.entries(groups).map(([r, items]) =>
                        items.map(([c, n], i) => {
                            const [x, y] = place(r, i, items.length);
                            return (
                                <g
                                    key={c[0]}
                                    className={`sd-vdot${r === 'LNT' ? ' core' : ''}${sel === c[0] ? ' sel' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={c[1]}
                                    onClick={() => setSel(c[0])}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSel(c[0]);
                                        }
                                    }}
                                >
                                    <title>{c[1]}</title>
                                    <circle cx={x} cy={y} r={13} />
                                    <text x={x} y={y + 4.5} textAnchor="middle" className="n">
                                        {n + 1}
                                    </text>
                                </g>
                            );
                        })
                    )}
                </svg>
                <div className="sd-venn-side">
                    <div className="sd-k">{parts.length === 3 ? 'All three: deep dive' : parts.length ? parts.join(' + ') : 'Outside the circles'}</div>
                    <h4>{s[1]}</h4>
                    <p>{s[4]}</p>
                    <div className="sd-venn-list">
                        {DEPTH_CANDIDATES.map((c, n) => (
                            <button key={c[0]} type="button" className="sd-chip-btn" aria-pressed={sel === c[0]} onClick={() => setSel(c[0])}>
                                {n + 1}. {c[1]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <Says>
                {core.length ? (
                    <>
                        <strong>Deep dive:</strong> {core.map((c) => c[1]).join(', ')}.{' '}
                    </>
                ) : (
                    <>
                        <strong>Nothing lands in all three circles for this team.</strong> Spend the depth where two overlap, starting with what your team owns.{' '}
                    </>
                )}
                {outside.length > 0 && (
                    <>
                        <strong>Outside every circle:</strong> {outside.map((c) => c[1]).join(', ')}. One line each is enough.
                    </>
                )}
            </Says>
        </div>
    );
}

export function DesignSummary() {
    const [n, setN] = useState(0);
    const template = SUMMARY_LINES.map((c, i) => `${i + 1}. ${c[0]}: ${c[2]}`).join('\n');
    return (
        <div>
            <ol className="sd-close">
                {SUMMARY_LINES.map(([head, example], i) => (
                    <li key={head} className={i <= n ? 'on' : ''}>
                        <span className="num">{i + 1}</span>
                        <div>
                            <h4>{head}</h4>
                            <p>{example}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <Row>
                <Button primary onClick={() => setN((x) => (x < SUMMARY_LINES.length - 1 ? x + 1 : 0))}>
                    {n === SUMMARY_LINES.length - 1 ? 'Start over' : 'Next line'}
                </Button>
                <CopyButton text={template} label="Copy blank template" />
            </Row>
        </div>
    );
}
