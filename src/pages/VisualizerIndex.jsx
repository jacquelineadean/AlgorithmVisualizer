import { Link, useSearchParams } from 'react-router-dom';
import { CATALOG, DOMAINS, entriesByDomain, liveEntries } from '../catalog';
import './VisualizerIndex.css';

// The catalog, in two modes: every domain in turn, or — with ?domain=<id>,
// which is where the home page's domain cards and the domain headings here
// lead — one domain's entries only. Unknown ids fall back to the full list.

const liveCount = (entries) => entries.filter((entry) => entry.status === 'live').length;

function EntryCard({ entry }) {
    const isLive = entry.status === 'live';
    const body = (
        <>
            <div className="entry-meta">
                <span className="entry-year">{entry.year}</span>
                <span className={isLive ? 'entry-status live' : 'entry-status'}>
                    {isLive ? 'Live' : 'Planned'}
                </span>
            </div>
            <h3>{entry.name}</h3>
            <p className="entry-authors">{entry.authors}</p>
            <p className="entry-summary">{entry.summary}</p>
        </>
    );

    if (isLive) {
        return (
            <Link to={entry.route} className="card entry-card is-live">
                {body}
            </Link>
        );
    }
    return <div className="card entry-card is-planned">{body}</div>;
}

function DomainFilter({ activeId }) {
    return (
        <nav className="domain-filter" aria-label="Domains">
            <Link
                to="/visualizer"
                className={`filter-pill${activeId ? '' : ' is-active'}`}
                aria-current={activeId ? undefined : 'page'}
            >
                All domains <span className="filter-count">{liveEntries().length}</span>
            </Link>
            {DOMAINS.map((domain) => (
                <Link
                    key={domain.id}
                    to={`/visualizer?domain=${domain.id}`}
                    className={`filter-pill${domain.id === activeId ? ' is-active' : ''}`}
                    aria-current={domain.id === activeId ? 'page' : undefined}
                >
                    {domain.name}{' '}
                    <span className="filter-count">{liveCount(entriesByDomain(domain.id))}</span>
                </Link>
            ))}
        </nav>
    );
}

function EntryGrid({ entries }) {
    return (
        <div className="entry-grid">
            {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
            ))}
        </div>
    );
}

export default function VisualizerIndex() {
    const [searchParams] = useSearchParams();
    const domain = DOMAINS.find((item) => item.id === searchParams.get('domain')) ?? null;

    if (domain) {
        const entries = entriesByDomain(domain.id);
        const live = liveCount(entries);
        return (
            <div className="content catalog-page">
                <div className="eyebrow">
                    Catalog · {live} live · {entries.length - live} planned
                </div>
                <h1 className="page-title">{domain.name}</h1>
                <p className="page-sub">{domain.blurb}</p>
                <DomainFilter activeId={domain.id} />
                <section className="catalog-domain" aria-label={`${domain.name} entries`}>
                    <EntryGrid entries={entries} />
                </section>
                <p className="catalog-back">
                    <Link to="/visualizer" className="text-link">
                        <span className="chev">‹</span> All {CATALOG.length} entries across{' '}
                        {DOMAINS.length} domains
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="content catalog-page">
            <div className="eyebrow">Catalog</div>
            <h1 className="page-title">Pick an algorithm</h1>
            <p className="page-sub">
                Live visualizations open as interactive instruments. Planned entries are the
                public roadmap — each will ship with its own cited sources. Pick a domain to
                see only its entries.
            </p>
            <DomainFilter activeId={null} />

            {DOMAINS.map((item) => {
                const entries = entriesByDomain(item.id);
                if (entries.length === 0) return null;
                return (
                    <section key={item.id} className="catalog-domain">
                        <div className="domain-head">
                            <h2>
                                <Link to={`/visualizer?domain=${item.id}`}>{item.name}</Link>
                            </h2>
                            <Link to={`/visualizer?domain=${item.id}`} className="text-link">
                                Only this domain <span className="chev">›</span>
                            </Link>
                        </div>
                        <p className="domain-blurb">{item.blurb}</p>
                        <EntryGrid entries={entries} />
                    </section>
                );
            })}
        </div>
    );
}
