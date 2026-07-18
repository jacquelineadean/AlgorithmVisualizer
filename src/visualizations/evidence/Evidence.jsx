import { PROVENANCE } from '../provenance';
import './Evidence.css';

// Shared evidence UI: provenance chips, citation chips, caveat notes, and
// the references section. Every visualization renders its evidence through
// these so the citation experience is identical site-wide.

export function ProvenanceChip({ provenance }) {
    const meta = PROVENANCE[provenance];
    return (
        <span className={`prov-chip prov-${provenance}`} title={meta.description}>
            <span className="prov-dot" aria-hidden="true" />
            {meta.label}
        </span>
    );
}

export function SourceChips({ refs, sources }) {
    const jump = (key) => {
        const el = document.getElementById(`ref-${key}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('flash');
        // Restart the highlight animation on repeat clicks.
        void el.offsetWidth;
        el.classList.add('flash');
    };
    return (
        <>
            {refs.map((ref) => (
                <button
                    key={`${ref.key}-${ref.detail ?? ''}`}
                    type="button"
                    className="source-chip"
                    onClick={() => jump(ref.key)}
                    title={sources[ref.key].title}
                >
                    {ref.key}
                    {ref.detail ? ` ${ref.detail}` : ''}
                </button>
            ))}
        </>
    );
}

export function EvidenceRow({ provenance, refs, sources }) {
    return (
        <div className="evidence-row">
            <ProvenanceChip provenance={provenance} />
            <SourceChips refs={refs} sources={sources} />
        </div>
    );
}

export function Caveat({ caveat, sources }) {
    if (!caveat) return null;
    return (
        <div className={`caveat prov-bg-${caveat.provenance}`}>
            <EvidenceRow
                provenance={caveat.provenance}
                refs={caveat.sourceRefs}
                sources={sources}
            />
            <p>{caveat.text}</p>
        </div>
    );
}

export function EvidenceSection({ sources, intro, showLegend = true }) {
    return (
        <section className="references">
            <h2>Evidence</h2>
            {intro && <p className="references-sub">{intro}</p>}
            {showLegend && (
                <div className="legend">
                    {Object.entries(PROVENANCE).map(([key, meta]) => (
                        <div key={key} className="legend-item">
                            <ProvenanceChip provenance={key} />
                            <span className="legend-desc">{meta.description}</span>
                        </div>
                    ))}
                </div>
            )}
            <ol className="reference-list">
                {Object.values(sources).map((source) => (
                    <li key={source.key} id={`ref-${source.key}`}>
                        <span className="ref-key">{source.key}</span>
                        <span>
                            {source.authors} ({source.year}).{' '}
                            <a href={source.url} target="_blank" rel="noreferrer">
                                {source.title}
                            </a>
                            . <em>{source.venue}</em>.
                        </span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
