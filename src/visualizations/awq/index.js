import { defineVisualization } from '../registry';
import { buildAwqTrace } from './trace';
import { SOURCES } from './sources';
import AwqVisualizer from './AwqVisualizer';

export default defineVisualization({
    id: 'awq',
    Visualizer: AwqVisualizer,
    buildTrace: buildAwqTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { seed: 1, bits: 3, groupSize: 4 },
        { seed: 2, bits: 3, groupSize: 8 },
        { seed: 5, bits: 4, groupSize: 4 },
    ],
});
