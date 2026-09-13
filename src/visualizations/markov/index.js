import { defineVisualization } from '../registry';
import { buildMarkovTrace } from './trace';
import { SOURCES } from './sources';
import MarkovVisualizer from './MarkovVisualizer';

export default defineVisualization({
    id: 'markov',
    Visualizer: MarkovVisualizer,
    buildTrace: buildMarkovTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { chainId: 'weather', startIndex: -1, iterations: 40 },
        { chainId: 'flipflop', startIndex: 0, iterations: 20 },
        { chainId: 'absorbing', startIndex: 1, iterations: 30 },
    ],
});
