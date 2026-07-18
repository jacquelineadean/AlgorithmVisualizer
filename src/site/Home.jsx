import { Link } from 'react-router-dom';
import { CATALOG, DOMAINS, entriesByDomain, liveEntries } from '../catalog';
import { SOURCES as RSA_SOURCES } from '../visualizations/rsa/sources';
import { SOURCES as BAYES_SOURCES } from '../visualizations/bayes/sources';
import { SOURCES as PATHFINDING_SOURCES } from '../visualizations/pathfinding/sources';
import { GITHUB_URL } from './FloatingNav';
import HeroBayes from './HeroBayes';
import './Home.css';

export default function Home() {
    const live = liveEntries();
    const sourcesCited = new Set([
        ...Object.keys(RSA_SOURCES),
        ...Object.keys(BAYES_SOURCES),
        ...Object.keys(PATHFINDING_SOURCES),
    ]).size;

    return (
        <div className="home">
            <section className="content hero">
                <div className="hero-copy">
                    <div className="eyebrow">Interactive · Evidence-cited</div>
                    <h1 className="hero-title">See how the classics compute</h1>
                    <p className="hero-subtitle">
                        Interactive visualizations of famous algorithms across cryptography,
                        mathematics, statistics, and machine learning — where every step
                        cites the paper it came from.
                    </p>
                    <div className="hero-actions">
                        <Link to="/visualizer" className="pill-button">
                            Explore the catalog
                        </Link>
                        <Link to="/visualizer/rsa" className="text-link">
                            RSA encryption <span className="chev">›</span>
                        </Link>
                        <Link to="/blog" className="text-link">
                            Read the blog <span className="chev">›</span>
                        </Link>
                    </div>
                </div>
                <HeroBayes />
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
