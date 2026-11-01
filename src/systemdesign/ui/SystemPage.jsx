import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Caveat, EvidenceRow, EvidenceSection } from '../../visualizations/evidence/Evidence';
import { getCategory, getSystem } from '..';
import { citedSources, findTray, neighborsOf, trayPath } from '../model';
import { SOURCES } from '../sources';
import { Block } from './Blocks';
import Rich from './Rich';
import '../../visualizations/evidence/Evidence.css';
import './SystemDesign.css';

// One page per tray: /systems/:systemId is the overview, /systems/:id/:layer
// a layer or topic, and ?tab=<section> the open tab. The rack on the left
// is the whole system at a glance; ← and → walk it one tray at a time.

const isTyping = (el) =>
    el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

function Rack({ system, current }) {
    const tray = (t) => (
        <li key={t.id}>
            <Link
                to={trayPath(system.id, t.id)}
                className={`sd-tray c${t.color}${t.id === current.id ? ' is-current' : ''}`}
                aria-current={t.id === current.id ? 'page' : undefined}
            >
                <span className="sd-tray-code">{t.code}</span>
                <span className="sd-tray-text">
                    <span className="sd-tray-name">{t.name}</span>
                    {t.products && <span className="sd-tray-sub">{t.products}</span>}
                </span>
            </Link>
        </li>
    );
    return (
        <nav className="sd-rack" aria-label="Layers">
            <ol className="sd-rack-list">{tray(system.overview)}</ol>
            {system.direction && (
                <div className="sd-rack-dir">
                    <span>{system.direction.label}</span>
                    <span className="sd-rack-ends">
                        {system.direction.top} <span aria-hidden="true">↓</span> {system.direction.bottom}
                    </span>
                </div>
            )}
            <ol className="sd-rack-list sd-rack-layers">{system.layers.map(tray)}</ol>
            {system.topics.length > 0 && (
                <>
                    <div className="sd-rack-dir">
                        <span>{system.topicsLabel ?? 'Across the layers'}</span>
                    </div>
                    <ol className="sd-rack-list">{system.topics.map(tray)}</ol>
                </>
            )}
        </nav>
    );
}

function NotFound({ systemId }) {
    return (
        <div className="content sd-page sd-missing">
            <h1 className="page-title">Not in the atlas (yet)</h1>
            <p className="page-sub" style={{ marginTop: '12px' }}>
                There is no system or layer at “{systemId}”.{' '}
                <Link to="/systems" className="text-link">
                    Browse the systems <span className="chev">›</span>
                </Link>
            </p>
        </div>
    );
}

export default function SystemPage() {
    const { systemId, layerId } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const system = getSystem(systemId);
    const tray = system ? findTray(system, layerId) : null;
    const tabsRef = useRef(null);

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

    const category = getCategory(system.category);
    const sections = tray.sections ?? [];
    const section = sections.find((s) => s.id === params.get('tab')) ?? sections[0];
    const sources = citedSources(system, SOURCES);

    const selectTab = (id) => {
        const nextParams = new URLSearchParams(params);
        if (id === sections[0].id) nextParams.delete('tab');
        else nextParams.set('tab', id);
        setParams(nextParams, { replace: true });
    };

    const onTabKey = (e) => {
        const i = sections.indexOf(section);
        let j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % sections.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + sections.length) % sections.length;
        if (j == null) return;
        e.preventDefault();
        e.stopPropagation();
        selectTab(sections[j].id);
        tabsRef.current?.querySelectorAll('[role="tab"]')[j]?.focus();
    };

    return (
        <div className="content sd-page">
            <nav className="sd-crumbs" aria-label="Breadcrumb">
                <Link to="/systems">System Design</Link>
                <span aria-hidden="true">›</span>
                <Link to={category.id === 'fundamentals' ? '/systems' : `/systems?category=${category.id}`}>{category.name}</Link>
                <span aria-hidden="true">›</span>
                <Link to={trayPath(system.id)}>{system.name}</Link>
            </nav>
            <header className="sd-head">
                <div className="eyebrow">
                    {category.name} · {system.kicker}
                </div>
                <h1 className="page-title">{system.name}</h1>
                <p className="page-sub sd-head-sub">{system.intro}</p>
            </header>

            <div className="sd-layout">
                <Rack system={system} current={tray} />

                <article className={`sd-panel c${tray.color}`} aria-labelledby="sd-tray-title">
                    <div className="sd-panel-head">
                        <span className="sd-panel-code">{tray.code}</span>
                        <span className="sd-panel-name">
                            {tray.name}
                            {tray.products && <span className="sd-panel-products"> · {tray.products}</span>}
                        </span>
                    </div>
                    <h2 id="sd-tray-title" className="sd-panel-title">
                        {tray.title}
                    </h2>
                    {tray.lede && (
                        <p className="sd-panel-lede">
                            <Rich text={tray.lede} />
                        </p>
                    )}

                    {sections.length > 1 && (
                        <div className="sd-tabs" role="tablist" aria-label={`${tray.name} sections`} ref={tabsRef} onKeyDown={onTabKey}>
                            {sections.map((s, i) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="tab"
                                    id={`tab-${s.id}`}
                                    aria-selected={s.id === section.id}
                                    aria-controls={`panel-${s.id}`}
                                    tabIndex={s.id === section.id ? 0 : -1}
                                    className={`sd-tab${s.id === section.id ? ' is-current' : ''}`}
                                    onClick={() => selectTab(s.id)}
                                >
                                    <span className="sd-tab-n">{String(i + 1).padStart(2, '0')}</span> {s.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {section && (
                        <section
                            className="sd-section"
                            role={sections.length > 1 ? 'tabpanel' : undefined}
                            id={`panel-${section.id}`}
                            aria-labelledby={sections.length > 1 ? `tab-${section.id}` : 'sd-tray-title'}
                            key={`${tray.id}-${section.id}`}
                        >
                            <EvidenceRow provenance={section.provenance} refs={section.sourceRefs} sources={SOURCES} />
                            {section.heading && <h3 className="sd-section-title">{section.heading}</h3>}
                            {section.blocks.map((block, i) => (
                                <Block key={i} block={block} system={system} tray={tray} />
                            ))}
                            <Caveat caveat={section.caveat} sources={SOURCES} />
                        </section>
                    )}

                    <nav className="sd-panel-nav" aria-label="Previous and next layer">
                        {prev ? (
                            <Link to={trayPath(system.id, prev.id)} className="sd-step prev">
                                <span className="sd-step-dir">← Previous</span>
                                <span>
                                    {prev.code} {prev.name}
                                </span>
                            </Link>
                        ) : (
                            <span />
                        )}
                        {next && (
                            <Link to={trayPath(system.id, next.id)} className="sd-step next">
                                <span className="sd-step-dir">Next →</span>
                                <span>
                                    {next.code} {next.name}
                                </span>
                            </Link>
                        )}
                    </nav>
                </article>
            </div>

            <EvidenceSection
                sources={sources}
                intro={`Every section of ${system.name} cites at least one of these. The provenance chip says how closely the section follows its source.`}
            />
        </div>
    );
}
