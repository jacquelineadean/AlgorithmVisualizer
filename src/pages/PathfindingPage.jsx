import Visualizer from '../components/Visualizer/Visualizer';
import './PathfindingPage.css';

export default function PathfindingPage() {
    return (
        <div className="pathfinding-page">
            <div className="content pathfinding-intro">
                <div className="eyebrow">Graphs &amp; Pathfinding · 1959</div>
                <h1 className="page-title">Dijkstra&rsquo;s Algorithm</h1>
                <p className="page-sub">
                    Draw walls by clicking and dragging on the grid, then visualize the
                    search sweeping outward from the start node — always expanding the
                    cheapest frontier first — until it reaches the target and traces the
                    shortest path back.
                </p>
            </div>
            <Visualizer />
        </div>
    );
}
