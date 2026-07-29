import { defineVisualization } from '../registry';
import { buildRegressionTrace } from './trace';
import { SOURCES } from './sources';
import RegressionVisualizer from './RegressionVisualizer';

export default defineVisualization({
    id: 'regression',
    Visualizer: RegressionVisualizer,
    buildTrace: buildRegressionTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { datasetId: 'linear', n: 24, seed: 5, trialSlope: 2.4, trialIntercept: 0.4 },
        { datasetId: 'outlier', n: 18, seed: 2, trialSlope: 1, trialIntercept: 3 },
        { datasetId: 'curved', n: 40, seed: 8, trialSlope: 0.5, trialIntercept: 1 },
    ],
});
