import { Link } from 'react-router-dom';
import { DOMAINS, entriesByDomain } from '../catalog';
import './VisualizerIndex.css';

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

export default function VisualizerIndex() {
    return (
        <div className="content catalog-page">
            <div className="eyebrow">Catalog</div>
            <h1 className="page-title">Pick an algorithm</h1>
            <p className="page-sub">
                Live visualizations open as interactive instruments. Planned entries are the
                public roadmap — each will ship with its own cited sources.
            </p>

            {DOMAINS.map((domain) => {
                const entries = entriesByDomain(domain.id);
                if (entries.length === 0) return null;
                return (
                    <section key={domain.id} className="catalog-domain">
                        <h2>{domain.name}</h2>
                        <p className="domain-blurb">{domain.blurb}</p>
                        <div className="entry-grid">
                            {entries.map((entry) => (
                                <EntryCard key={entry.id} entry={entry} />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
