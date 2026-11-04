import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES, DEFAULT_CATEGORY, getCategory, systemsByCategory } from '..';
import { trayPath } from '../model';
import './SystemDesign.css';

// The System Design Visualizer's front door: one category at a time,
// Fundamentals by default, ?category=<id> for the rest. Unknown ids fall
// back to the default. Each system is drawn as a small rack unit; hovering
// one lights its trays from the top down.

// A decorative rack for the hero: seven trays, blinking LEDs, and a token
// that rides the cable down and back up, the way a request does.
function HeroRack() {
    return (
        <div className="sd-hero-rack" aria-hidden="true">
            <div className="sd-hero-plate">
                <span>Rack 01</span>
                <span className="sd-hero-dots">
                    <i />
                    <i />
                    <i />
                </span>
            </div>
            <div className="sd-hero-cabinet">
                <span className="sd-hero-wire" />
                <span className="sd-hero-token" />
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <div key={n} className={`sd-hero-tray c${n}`} style={{ '--d': `${(n * 0.53) % 3.2}s` }}>
                        <span className="band" />
                        <span className="code">L{n}</span>
                        <span className="vents" />
                        <span className="led" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SystemCard({ system }) {
    return (
        <Link to={trayPath(system.id)} className="sd-unit">
            <div className="sd-unit-head">
                <span className="sd-unit-kicker">{system.kicker}</span>
                <h3 className="sd-unit-name">{system.name}</h3>
                <p className="sd-unit-summary">{system.summary}</p>
            </div>
            <ol className="sd-unit-cabinet" aria-label={`${system.layers.length} layers`}>
                {system.layers.map((layer, i) => (
                    <li key={layer.id} className={`c${layer.color}`} style={{ '--i': i }}>
                        <span className="code">{layer.code}</span>
                        <span className="name">{layer.name}</span>
                        <span className="led" aria-hidden="true" />
                    </li>
                ))}
            </ol>
            <div className="sd-unit-foot">
                <span>
                    {system.layers.length} layers
                    {system.topics.length > 0 && ` · ${system.topics.length} topics`}
                </span>
                <span className="sd-unit-open">
                    Open <span aria-hidden="true">›</span>
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
        <div className="sd-index">
            <div className="sd-frame narrow">
                <header className="sd-index-head">
                    <div>
                        <div className="sd-eyebrow">System Design Visualizer</div>
                        <h1 className="sd-display">Explore a system, layer by layer</h1>
                        <p className="sd-dek">Run each layer’s mechanism, size it with real numbers, then break it.</p>
                    </div>
                    <HeroRack />
                </header>
                <nav className="sd-cats" aria-label="Categories">
                    {CATEGORIES.map((c) => (
                        <Link
                            key={c.id}
                            to={c.id === DEFAULT_CATEGORY ? '/systems' : `/systems?category=${c.id}`}
                            className={`sd-cat${c.id === category.id ? ' is-active' : ''}`}
                            aria-current={c.id === category.id ? 'page' : undefined}
                        >
                            {c.name} <span className="sd-cat-count">{systemsByCategory(c.id).length}</span>
                        </Link>
                    ))}
                </nav>
                <section className="sd-category" aria-labelledby="sd-category-title">
                    <h2 id="sd-category-title" className="sd-rule-label">
                        <span>{category.name}</span>
                        <span>
                            {systems.length} {systems.length === 1 ? 'system' : 'systems'}
                        </span>
                    </h2>
                    <div className="sd-unit-grid">
                        {systems.map((s) => (
                            <SystemCard key={s.id} system={s} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
