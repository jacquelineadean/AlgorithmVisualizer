import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES, DEFAULT_CATEGORY, getCategory, systemsByCategory } from '..';
import { trayPath } from '../model';
import '../../pages/VisualizerIndex.css';
import './SystemDesign.css';

// The System Design Visualizer's front door: one category at a time,
// Fundamentals by default, ?category=<id> for the rest. Unknown ids fall
// back to the default.

function SystemCard({ system }) {
    return (
        <Link to={trayPath(system.id)} className="card sd-system-card">
            <div className="sd-card-kicker">{system.kicker}</div>
            <h3>{system.name}</h3>
            <p className="sd-card-summary">{system.summary}</p>
            <ol className="sd-card-stack" aria-label={`${system.layers.length} layers`}>
                {system.layers.map((layer) => (
                    <li key={layer.id} className={`c${layer.color}`}>
                        <span className="code">{layer.code}</span>
                        <span className="name">{layer.name}</span>
                    </li>
                ))}
            </ol>
            <div className="sd-card-foot">
                {system.layers.length} layers
                {system.topics.length > 0 && ` · ${system.topics.length} cross-cutting topics`}
                <span className="chev" aria-hidden="true">
                    ›
                </span>
            </div>
        </Link>
    );
}

export default function SystemsIndex() {
    const [params] = useSearchParams();
    const category = getCategory(params.get('category')) ?? getCategory(DEFAULT_CATEGORY);
    const systems = systemsByCategory(category.id);

    return (
        <div className="content sd-index">
            <div className="eyebrow">System Design Visualizer</div>
            <h1 className="page-title">Explore a system, layer by layer</h1>
            <p className="page-sub">Run each layer’s mechanism, size it with real numbers, then break it.</p>
            <nav className="domain-filter" aria-label="Categories">
                {CATEGORIES.map((c) => (
                    <Link
                        key={c.id}
                        to={c.id === DEFAULT_CATEGORY ? '/systems' : `/systems?category=${c.id}`}
                        className={`filter-pill${c.id === category.id ? ' is-active' : ''}`}
                        aria-current={c.id === category.id ? 'page' : undefined}
                    >
                        {c.name} <span className="filter-count">{systemsByCategory(c.id).length}</span>
                    </Link>
                ))}
            </nav>
            <section className="sd-category" aria-label={`${category.name} systems`}>
                <h2>{category.name}</h2>
                <div className="sd-system-grid">
                    {systems.map((s) => (
                        <SystemCard key={s.id} system={s} />
                    ))}
                </div>
            </section>
        </div>
    );
}
