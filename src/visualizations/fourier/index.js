import { defineVisualization } from '../registry';
import { buildFourierTrace } from './trace';
import { SOURCES } from './sources';
import FourierVisualizer from './FourierVisualizer';

export default defineVisualization({
    id: 'fourier',
    Visualizer: FourierVisualizer,
    buildTrace: buildFourierTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { pathId: 'square', harmonics: 12, samples: 128 },
        { pathId: 'circle', harmonics: 1, samples: 64 },
        { pathId: 'star', harmonics: 24, samples: 128 },
    ],
});
