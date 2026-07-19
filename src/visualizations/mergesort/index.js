import { defineVisualization } from '../registry';
import { buildMergesortTrace } from './trace';
import { SOURCES } from './sources';
import MergesortVisualizer from './MergesortVisualizer';

export default defineVisualization({
    id: 'mergesort',
    Visualizer: MergesortVisualizer,
    buildTrace: buildMergesortTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { values: [5, 3, 8, 1, 9, 2] },
        { values: [2, 1] },
        { values: [9, 8, 7, 6, 5] },
    ],
});
