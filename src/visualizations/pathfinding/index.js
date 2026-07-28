import { defineVisualization } from '../registry';
import { buildPathfindingTrace } from './trace';
import { SOURCES } from './sources';
import PathfindingVisualizer from './PathfindingVisualizer';
import { keyOf, ROWS } from './model';

const blockingWall = Array.from({ length: ROWS }, (_, r) => keyOf(r, 25));

export default defineVisualization({
    id: 'pathfinding',
    Visualizer: PathfindingVisualizer,
    buildTrace: buildPathfindingTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { algorithm: 'dijkstra', walls: [] },
        { algorithm: 'astar', walls: [keyOf(9, 25), keyOf(10, 25), keyOf(11, 25)] },
        { algorithm: 'bfs', walls: blockingWall }, // the no-path case cites too
    ],
});
