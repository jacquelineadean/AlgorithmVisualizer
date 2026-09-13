import { defineVisualization } from '../registry';
import { buildPerceptronTrace } from './trace';
import { SOURCES } from './sources';
import PerceptronVisualizer from './PerceptronVisualizer';

export default defineVisualization({
    id: 'perceptron',
    Visualizer: PerceptronVisualizer,
    buildTrace: buildPerceptronTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { datasetId: 'separable', n: 40, seed: 6, rate: 1, epochs: 30 },
        { datasetId: 'xor', n: 4, seed: 1, rate: 1, epochs: 10 },
        { datasetId: 'narrow', n: 60, seed: 2, rate: 0.4, epochs: 30 },
    ],
});
