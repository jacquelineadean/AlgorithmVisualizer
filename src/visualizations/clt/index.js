import { defineVisualization } from '../registry';
import { buildCltTrace } from './trace';
import { SOURCES } from './sources';
import CltVisualizer from './CltVisualizer';

export default defineVisualization({
    id: 'clt',
    Visualizer: CltVisualizer,
    buildTrace: buildCltTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { populationId: 'exponential', n: 10, count: 600, seed: 7 },
        { populationId: 'dice', n: 1, count: 200, seed: 3 },
        { populationId: 'bimodal', n: 30, count: 400, seed: 11 },
    ],
});
