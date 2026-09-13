import { defineVisualization } from '../registry';
import { buildPageRankTrace } from './trace';
import { SOURCES } from './sources';
import PageRankVisualizer from './PageRankVisualizer';

export default defineVisualization({
    id: 'pagerank',
    Visualizer: PageRankVisualizer,
    buildTrace: buildPageRankTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { graphId: 'hub', damping: 0.85 },
        { graphId: 'sink', damping: 0.85 },
        { graphId: 'trap', damping: 0.5 },
    ],
});
