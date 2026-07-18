import Visualizer from '../components/Visualizer/Visualizer';
import { SOURCES } from '../visualizations/pathfinding/sources';
import { EvidenceRow, EvidenceSection } from '../visualizations/evidence/Evidence';
import './PathfindingPage.css';

export default function PathfindingPage() {
    return (
        <div className="pathfinding-page">
            <div className="content pathfinding-intro">
                <div className="eyebrow">Graphs &amp; Pathfinding · 1959 · E. W. Dijkstra</div>
                <h1 className="page-title">Dijkstra&rsquo;s Algorithm</h1>
                <p className="page-sub">
                    Draw walls by clicking and dragging on the grid, then visualize the
                    search sweeping outward from the start node — always expanding the
                    cheapest frontier first — until it reaches the target and traces the
                    shortest path back.
                </p>
            </div>
            <Visualizer />
            <div className="content pathfinding-evidence">
                <div className="path-evidence-note">
                    <EvidenceRow
                        provenance="paper"
                        refs={[{ key: 'DIJKSTRA59' }]}
                        sources={SOURCES}
                    />
                    <p>
                        The procedure animated above is Dijkstra&rsquo;s 1959 algorithm:
                        repeatedly settle the unvisited node with the smallest known
                        distance and relax its neighbors.
                    </p>
                </div>
                <div className="path-evidence-note">
                    <EvidenceRow
                        provenance="pedagogical"
                        refs={[{ key: 'CLRS22' }]}
                        sources={SOURCES}
                    />
                    <p>
                        The uniform-cost grid and the animation pacing are teaching
                        devices — with all edge weights equal, Dijkstra&rsquo;s frontier
                        sweeps like breadth-first search. Weighted terrain and the
                        priority-queue view arrive with the Phase 2 trace migration.
                    </p>
                </div>
                <EvidenceSection
                    sources={SOURCES}
                    intro="Sources for this visualization:"
                    showLegend={false}
                />
            </div>
        </div>
    );
}
