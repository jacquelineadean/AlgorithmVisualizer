import { defineVisualization } from '../registry';
import { buildDhTrace } from './trace';
import { SOURCES } from './sources';
import DhVisualizer from './DhVisualizer';

export default defineVisualization({
    id: 'dh',
    Visualizer: DhVisualizer,
    buildTrace: buildDhTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { p: 83n, g: 2n, a: 9n, b: 21n },
        { p: 23n, g: 5n, a: 6n, b: 15n },
    ],
});
