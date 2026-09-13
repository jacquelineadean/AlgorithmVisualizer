import { defineVisualization } from '../registry';
import { buildHashingTrace } from './trace';
import { SOURCES } from './sources';
import HashingVisualizer from './HashingVisualizer';

export default defineVisualization({
    id: 'consistent-hashing',
    Visualizer: HashingVisualizer,
    buildTrace: buildHashingTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { servers: 4, keys: 400, replicas: 1 },
        { servers: 8, keys: 800, replicas: 40 },
    ],
});
