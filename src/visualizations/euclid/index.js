import { defineVisualization } from '../registry';
import { buildEuclidTrace } from './trace';
import { SOURCES } from './sources';
import EuclidVisualizer from './EuclidVisualizer';

export default defineVisualization({
    id: 'euclid',
    Visualizer: EuclidVisualizer,
    buildTrace: buildEuclidTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { a: 1071n, b: 462n },
        { a: 377n, b: 233n },
        { a: 17n, b: 3120n },
    ],
});
