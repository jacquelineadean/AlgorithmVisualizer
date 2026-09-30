import { defineVisualization } from '../registry';
import { buildSmoothQuantTrace } from './trace';
import { SOURCES } from './sources';
import SmoothQuantVisualizer from './SmoothQuantVisualizer';

export default defineVisualization({
    id: 'smoothquant',
    Visualizer: SmoothQuantVisualizer,
    buildTrace: buildSmoothQuantTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { preset: 'severe', seed: 1, alpha: 0.5 },
        { preset: 'moderate', seed: 3, alpha: 0.75 },
        { preset: 'severe', seed: 6, alpha: 0 },
    ],
});
