import { Link, useParams } from 'react-router-dom';
import { CATALOG, DOMAINS } from '../catalog';
import { getVisualization } from '../visualizations';

// Generic page for any registered trace-based visualization: header from
// the catalog entry, body from the registry. Adding a visualization means
// registering it and flipping its catalog card — no page file.
export default function VisualizerPage() {
    const { id } = useParams();
    const viz = getVisualization(id);
    const entry = CATALOG.find((item) => item.id === id);

    if (!viz || !entry) {
        return (
            <div className="content">
                <h1 className="page-title">Not in the atlas (yet)</h1>
                <p className="page-sub" style={{ marginTop: '12px' }}>
                    There is no live visualization with the id &ldquo;{id}&rdquo;.{' '}
                    <Link to="/visualizer" className="text-link">
                        Browse the catalog <span className="chev">›</span>
                    </Link>
                </p>
            </div>
        );
    }

    const domain = DOMAINS.find((item) => item.id === entry.domain);
    const Visualizer = viz.Visualizer;

    return (
        <div className="content">
            <div className="eyebrow">
                {domain.name} · {entry.year} · {entry.authors}
            </div>
            <h1 className="page-title">{entry.name}</h1>
            <p className="page-sub" style={{ maxWidth: '620px', marginTop: '12px' }}>
                {entry.intro ?? entry.summary}
            </p>
            <div style={{ marginTop: '32px' }}>
                <Visualizer />
            </div>
        </div>
    );
}
