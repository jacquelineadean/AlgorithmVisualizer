import { Link } from 'react-router-dom';
import { CATALOG, DOMAINS, entriesByDomain, liveEntries } from '../catalog';
import { GITHUB_URL } from './FloatingNav';
import './Home.css';

// Abstract organic composition in the hero, echoing the reference site's
// blob-and-primaries motif. Decorative only.
function HeroShapes() {
    return (
        <svg
            className="hero-shapes"
            viewBox="0 0 520 300"
            role="img"
            aria-label="Abstract composition of organic shapes"
        >
            <path
                className="shape-blob"
                d="M196 22c46-14 96 2 118 34 20 29 10 60 34 88 26 31 26 74-4 98-33 27-77 8-118 18-45 11-93 26-127-2-36-30-24-77-16-118 7-38-3-73 22-95 22-20 57-14 91-23z"
                fill="var(--ink)"
            />
            <circle className="shape-cobalt" cx="415" cy="66" r="38" fill="var(--cobalt)" />
            <circle className="shape-green" cx="238" cy="170" r="30" fill="var(--green)" />
            <ellipse
                className="shape-vermilion"
                cx="432"
                cy="208"
                rx="46"
                ry="42"
                fill="var(--vermilion)"
            />
        </svg>
    );
}

export default function Home() {
    const live = liveEntries();
    const sourcesCited = 7; // RSA sources today; grows with the catalog.

    return (
        <div className="home">
            <section className="content hero">
                <HeroShapes />
                <div className="eyebrow">Interactive · Evidence-cited</div>
                <h1 className="hero-title">See how the classics compute</h1>
                <p className="hero-subtitle">
                    Interactive visualizations of famous algorithms across cryptography,
                    mathematics, statistics, and machine learning — where every step cites
                    the paper it came from.
                </p>
                <div className="hero-actions">
                    <Link to="/visualizer/rsa" className="pill-button">
                        Visualize RSA
                    </Link>
                    <Link to="/visualizer" className="text-link">
                        Browse the catalog <span className="chev">›</span>
                    </Link>
                    <Link to="/blog" className="text-link">
                        Read the blog <span className="chev">›</span>
                    </Link>
                </div>
            </section>

            <section className="content stat-row">
                <div className="stat">
                    <div className="stat-value">{live.length}</div>
                    <div className="stat-label">Visualizations live</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{DOMAINS.length}</div>
                    <div className="stat-label">Domains mapped</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{sourcesCited}</div>
                    <div className="stat-label">Primary sources cited</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{CATALOG.length - live.length}</div>
                    <div className="stat-label">On the roadmap</div>
                </div>
            </section>

            <section className="content domains">
                <h2 className="section-title">An atlas, one domain at a time</h2>
                <p className="section-sub">
                    The catalog grows by phases — cryptography first, then graphs, sorting,
                    statistics, machine learning, and distributed systems.
                </p>
                <div className="domain-grid">
                    {DOMAINS.map((domain) => {
                        const entries = entriesByDomain(domain.id);
                        const liveCount = entries.filter((e) => e.status === 'live').length;
                        return (
                            <Link
                                to="/visualizer"
                                key={domain.id}
                                className={`card domain-card accent-${domain.accent}`}
                            >
                                <div className="domain-dot" aria-hidden="true" />
                                <h3>{domain.name}</h3>
                                <p>{domain.blurb}</p>
                                <span className="domain-count">
                                    {liveCount > 0
                                        ? `${liveCount} live · ${entries.length - liveCount} planned`
                                        : `${entries.length} planned`}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>

            <section className="content ethos">
                <div className="card ethos-card">
                    <div className="eyebrow">The rule</div>
                    <h2>Nothing renders without a source</h2>
                    <p>
                        Each visualization is generated from a trace whose steps carry
                        citations — to the original paper, the underlying theorem, or the
                        modern standard — and a provenance label whenever we simplify for
                        teaching. Inspired by evidence-based reconstruction projects like
                        Tekton, enforced by tests.
                    </p>
                    <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-link">
                        Read the code <span className="chev">›</span>
                    </a>
                </div>
            </section>
        </div>
    );
}
