import { defineVisualization } from '../registry';
import { buildKmeansTrace } from './trace';
import { SOURCES } from './sources';
import KmeansVisualizer from './KmeansVisualizer';

export default defineVisualization({
    id: 'kmeans',
    Visualizer: KmeansVisualizer,
    buildTrace: buildKmeansTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { datasetId: 'blobs', n: 120, k: 3, seed: 12, init: 'plusplus' },
        { datasetId: 'uniform', n: 60, k: 4, seed: 3, init: 'random' },
    ],
});
