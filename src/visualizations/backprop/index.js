import { defineVisualization } from '../registry';
import { buildBackpropTrace } from './trace';
import { SOURCES } from './sources';
import BackpropVisualizer from './BackpropVisualizer';

export default defineVisualization({
    id: 'backprop',
    Visualizer: BackpropVisualizer,
    buildTrace: buildBackpropTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { taskId: 'xor', seed: 5, rate: 3, epochs: 4000, exampleIndex: 1 },
        { taskId: 'and', seed: 5, rate: 1, epochs: 1000, exampleIndex: 3 },
    ],
});
