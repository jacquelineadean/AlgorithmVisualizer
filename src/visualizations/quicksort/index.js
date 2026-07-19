import { defineVisualization } from '../registry';
import { buildQuicksortTrace } from './trace';
import { SOURCES } from './sources';
import QuicksortVisualizer from './QuicksortVisualizer';

export default defineVisualization({
    id: 'quicksort',
    Visualizer: QuicksortVisualizer,
    buildTrace: buildQuicksortTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { values: [5, 3, 8, 1, 9, 2] },
        { values: [2, 1] },
        { values: [7, 7, 7, 7] },
    ],
});
