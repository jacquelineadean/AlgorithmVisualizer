import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Caveat, EvidenceRow, EvidenceSection } from '../../visualizations/evidence/Evidence';
import { getSystem } from '..';
import { citedSources, findTray, neighborsOf, trayPath, traysOf } from '../model';
import { SOURCES } from '../sources';
import { Block } from './Blocks';
import { useVisited } from './progress';
import { RackSignal, useRackSignal } from './rackSignal';
import Rich from './Rich';
import '../../visualizations/evidence/Evidence.css';
import './SystemDesign.css';

// One page per tray: /systems/:systemId is the overview, /systems/:id/:layer
// a layer or topic, and ?tab=<section> the open tab. The frame has a top
// bar (the system's name plate, which opens the overview, then the
// cross-cutting topics as patch-panel jacks) and, below it, the layers as
// trays in a rack cabinet on the left. An amber token on the cabinet wire
// marks the open layer. ← and → walk the trays in order.

// A caveat that carries the tab's own provenance and citations stands in
// for the tab's evidence row, so the chips are not drawn twice.
const refKeys = (item) => (item?.sourceRefs ?? []).map((r) => `${r.key} ${r.detail ?? ''}`).join('|');
const sameEvidence = (section, caveat) => !!caveat && caveat.provenance === section.provenance && refKeys(caveat) === refKeys(section);

const isTyping = (el) =>
    el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

function TrayLink({ system, tray, current, done, peek, index = 0 }) {
    const on = tray.id === current.id;
    return (
        <li>
            <Link
                to={trayPath(system.id, tray.id)}
                data-tray={tray.id}
                className={`sd-tray c${tray.color}${on ? ' is-current' : ''}${peek === tray.id ? ' is-peek' : ''}${done ? ' is-done' : ''}${tray.products ? '' : ' no-sub'}`}
                aria-current={on ? 'page' : undefined}
                style={{ '--d': `${(index * 0.45).toFixed(2)}s` }}
            >
                <span className="sd-tray-band" aria-hidden="true" />
                <span className="sd-tray-code">{tray.code}</span>
                <span className="sd-tray-name">
                    {tray.name}
                    {done && <span className="sd-sr"> (explored)</span>}
                </span>
                {tray.products && <span className="sd-tray-sub">{tray.products}</span>}
                <span className="sd-tray-led" aria-hidden="true" />
            </Link>
        </li>
    );
}

function Jack({ system, tray, current, done }) {
    const on = tray.id === current.id;
    return (
        <li>
            <Link
                to={trayPath(system.id, tray.id)}
                className={`sd-jack${on ? ' is-current' : ''}${done ? ' is-done' : ''}`}
                aria-current={on ? 'page' : undefined}
            >
                <span className="sd-jack-port" aria-hidden="true" />
                <span className="sd-jack-name">
                    {tray.name}
                    {done && <span className="sd-sr"> (explored)</span>}
                </span>
            </Link>
        </li>
    );
}

// The top bar: the system's name plate (its overview), the cross-cutting
// topics as patch-panel jacks, and the progress meter.
function TopBar({ system, current, visited, onReset }) {
    const bar = useRef(null);
    const trays = traysOf(system);
    const seen = trays.filter((t) => visited.has(t.id)).length;
    const onOverview = current.id === system.overview.id;

    useLayoutEffect(() => {
        bar.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [current.id]);

    return (
        <nav className="sd-topbar" aria-label="System" ref={bar}>
            <Link
                to={trayPath(system.id, system.overview.id)}
                className={`sd-plate${onOverview ? ' is-current' : ''}${visited.has(system.overview.id) ? ' is-done' : ''}`}
                aria-current={onOverview ? 'page' : undefined}
            >
                <h1 className="sd-plate-name">{system.name}</h1>
                <span className="sd-sr"> overview</span>
            </Link>
            {system.topics.length > 0 && (
                <ul className="sd-patch" aria-label={system.topicsLabel ?? 'Across the layers'}>
                    {system.topics.map((tray) => (
                        <Jack key={tray.id} system={system} tray={tray} current={current} done={visited.has(tray.id)} />
                    ))}
                </ul>
            )}
            <div className="sd-rack-progress" title={`${seen} of ${trays.length} explored`}>
                <div className="sd-meter" aria-hidden="true">
                    <i style={{ width: `${(100 * seen) / trays.length}%` }} />
                </div>
                <span>
                    <b>
                        {seen}/{trays.length}
                    </b>
                    <span className="sd-sr"> explored</span>
                    {seen > 1 && (
                        <button type="button" className="sd-rack-reset" onClick={onReset}>
                            Reset
                        </button>
                    )}
                </span>
            </div>
        </nav>
    );
}

// The layers as trays in a rack cabinet, stacked top to bottom.
function Rack({ system, current, visited }) {
    const rack = useRef(null);
    const cabinet = useRef(null);
    const [tokenY, setTokenY] = useState(null);
    const { peek } = useRackSignal();
    const target = peek ?? (current.kind === 'layer' ? current.id : null);

    // The token sits beside the layer a lab points at, else the open layer,
    // else at the top of the cabinet.
    useLayoutEffect(() => {
        const tray = target && cabinet.current?.querySelector(`[data-tray="${target}"]`);
        setTokenY(tray ? tray.offsetTop + tray.offsetHeight / 2 : null);
    }, [target]);

    // Keep the open tray in view when the rack scrolls; on phones it is a sideways strip.
    useLayoutEffect(() => {
        rack.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [current.id]);

    return (
        <nav className="sd-rack" aria-label="Layers" ref={rack}>
            <div className="sd-cabinet" ref={cabinet}>
                <span className="sd-rack-wire" aria-hidden="true" />
                <span
                    className={`sd-rack-token${tokenY == null ? ' parked' : ''}`}
                    style={tokenY == null ? undefined : { '--ty': `${tokenY}px` }}
                    aria-hidden="true"
                />
                <ol className="sd-trays">
                    {system.layers.map((tray, i) => (
                        <TrayLink key={tray.id} system={system} tray={tray} current={current} done={visited.has(tray.id)} peek={peek} index={i} />
                    ))}
                </ol>
            </div>
        </nav>
    );
}

function Tabs({ tray, sections, current, onSelect }) {
    const list = useRef(null);
    const [bar, setBar] = useState(null);

    // Slide the underline to the selected tab, and follow it on resize.
    useLayoutEffect(() => {
        const measure = () => {
            const tab = list.current?.querySelector('[aria-selected="true"]');
            if (tab) setBar({ x: tab.offsetLeft, w: tab.offsetWidth });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [current.id, sections]);

    const onKeyDown = (e) => {
        const i = sections.indexOf(current);
        let j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % sections.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + sections.length) % sections.length;
        if (j == null) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect(sections[j].id);
        list.current?.querySelectorAll('[role="tab"]')[j]?.focus();
    };

    return (
        <div className="sd-tabs" role="tablist" aria-label={`${tray.name} sections`} ref={list} onKeyDown={onKeyDown}>
            {sections.map((s, i) => (
                <button
                    key={s.id}
                    type="button"
                    role="tab"
                    id={`tab-${s.id}`}
                    aria-selected={s.id === current.id}
                    aria-controls={`panel-${s.id}`}
                    tabIndex={s.id === current.id ? 0 : -1}
                    className={`sd-tab${s.id === current.id ? ' is-current' : ''}`}
                    onClick={() => onSelect(s.id)}
                >
                    <span className="sd-tab-n">{String(i + 1).padStart(2, '0')}</span> {s.label}
                </button>
            ))}
            {bar && bar.w > 0 && <span className="sd-tab-bar" style={{ transform: `translateX(${bar.x}px)`, width: bar.w }} aria-hidden="true" />}
        </div>
    );
}

function NotFound({ systemId }) {
    return (
        <div className="sd-page sd-missing">
            <div className="sd-frame">
                <h1 className="sd-display">Not in the atlas (yet)</h1>
                <p className="sd-dek">
                    There is no system or layer at “{systemId}”.{' '}
                    <Link to="/systems" className="text-link">
                        Browse the systems <span className="chev">›</span>
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function SystemPage() {
    const { systemId, layerId } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const system = getSystem(systemId);
    const tray = system ? findTray(system, layerId) : null;
    const [visited, resetVisited] = useVisited(system?.id ?? '', tray?.id);
    const [peek, setPeek] = useState(null);
    const signal = useMemo(() => ({ peek, setPeek }), [peek]);

    const { prev, next } = system && tray ? neighborsOf(system, tray.id) : {};

    useEffect(() => {
        if (!system || !tray) return undefined;
        const onKey = (e) => {
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(document.activeElement)) return;
            if (e.key === 'ArrowRight' && next) navigate(trayPath(system.id, next.id));
            else if (e.key === 'ArrowLeft' && prev) navigate(trayPath(system.id, prev.id));
            else return;
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [system, tray, prev, next, navigate]);

    if (!system || !tray) return <NotFound systemId={layerId ? `${systemId}/${layerId}` : systemId} />;

    const sections = tray.sections ?? [];
    const section = sections.find((s) => s.id === params.get('tab')) ?? sections[0];
    const sources = citedSources(system, SOURCES);
    const isOverview = tray.kind === 'overview';

    const selectTab = (id) => {
        const nextParams = new URLSearchParams(params);
        if (id === sections[0].id) nextParams.delete('tab');
        else nextParams.set('tab', id);
        setParams(nextParams, { replace: true });
    };

    return (
        <RackSignal.Provider value={signal}>
            <div className="sd-page">
                <div className="sd-frame sd-system">
                    <TopBar system={system} current={tray} visited={visited} onReset={resetVisited} />
                    <div className="sd-layout">
                        <Rack system={system} current={tray} visited={visited} />

                        <article className={`sd-panel c${tray.color}`} aria-labelledby="sd-tray-title" key={tray.id}>
                            {/* The overview's name is on the plate, so its title is for screen readers only. */}
                            <header className={`sd-ph${isOverview ? ' sd-sr' : ''}`}>
                                <h2 id="sd-tray-title" className="sd-ph-title">
                                    {!isOverview && (
                                        <span className="sd-ph-chip" aria-hidden="true">
                                            {tray.code}
                                        </span>
                                    )}
                                    {tray.title}
                                </h2>
                                {!isOverview && tray.lede && (
                                    <p className="sd-ph-dek">
                                        <Rich text={tray.lede} />
                                    </p>
                                )}
                            </header>

                            {sections.length > 1 && <Tabs tray={tray} sections={sections} current={section} onSelect={selectTab} />}

                            {section && (
                                <section
                                    className="sd-section"
                                    role={sections.length > 1 ? 'tabpanel' : undefined}
                                    id={`panel-${section.id}`}
                                    aria-labelledby={sections.length > 1 ? `tab-${section.id}` : 'sd-tray-title'}
                                    key={`${tray.id}-${section.id}`}
                                >
                                    {section.heading && <h3 className="sd-section-title">{section.heading}</h3>}
                                    {section.blocks.map((block, i) => (
                                        <Block key={i} block={block} system={system} tray={tray} solo={section.blocks.length === 1} />
                                    ))}
                                    <Caveat caveat={section.caveat} sources={SOURCES} />
                                    {!sameEvidence(section, section.caveat) && (
                                        <div className="sd-cite">
                                            <EvidenceRow provenance={section.provenance} refs={section.sourceRefs} sources={SOURCES} />
                                        </div>
                                    )}
                                </section>
                            )}

                            <nav className="sd-nextbar" aria-label="Previous and next">
                                {prev ? (
                                    <Link to={trayPath(system.id, prev.id)} className={`sd-nb prev c${prev.color}`}>
                                        <small>← Previous</small>
                                        <span>
                                            <b>{prev.code}</b> {prev.kind === 'overview' ? system.name : prev.name}
                                        </span>
                                    </Link>
                                ) : (
                                    <span />
                                )}
                                {next && (
                                    <Link to={trayPath(system.id, next.id)} className={`sd-nb next c${next.color}`}>
                                        <small>Next →</small>
                                        <span>
                                            <b>{next.code}</b> {next.name}
                                        </span>
                                    </Link>
                                )}
                            </nav>
                        </article>
                    </div>
                </div>

                <div className="sd-frame sd-evidence">
                    <EvidenceSection sources={sources} collapsible />
                </div>
            </div>
        </RackSignal.Provider>
    );
}
