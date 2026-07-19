import { defineVisualization } from '../registry';
import { buildSieveTrace } from './trace';
import { SOURCES } from './sources';
import SieveVisualizer from './SieveVisualizer';

export default defineVisualization({
    id: 'sieve',
    Visualizer: SieveVisualizer,
    buildTrace: buildSieveTrace,
    sources: SOURCES,
    gateFixtures: () => [{ N: 120 }, { N: 10 }],
});
