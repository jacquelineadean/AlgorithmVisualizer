import { defineVisualization } from '../registry';
import { buildBayesTrace } from './trace';
import { SOURCES } from './sources';
import BayesVisualizer from './BayesVisualizer';

export default defineVisualization({
    id: 'bayes',
    Visualizer: BayesVisualizer,
    buildTrace: buildBayesTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { prior: 0.01, sensitivity: 0.8, falsePositiveRate: 0.096 },
        { prior: 0.2, sensitivity: 0.9, falsePositiveRate: 0 },
    ],
});
