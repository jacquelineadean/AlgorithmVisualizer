import { defineVisualization } from '../registry';
import { buildMonteCarloTrace } from './trace';
import { SOURCES } from './sources';
import MonteCarloVisualizer from './MonteCarloVisualizer';

export default defineVisualization({
    id: 'monte-carlo',
    Visualizer: MonteCarloVisualizer,
    buildTrace: buildMonteCarloTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { count: 2000, seed: 21 },
        { count: 50, seed: 4 },
    ],
});
