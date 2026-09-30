import { defineVisualization } from '../registry';
import { buildGptqTrace } from './trace';
import { SOURCES } from './sources';
import GptqVisualizer from './GptqVisualizer';

export default defineVisualization({
    id: 'gptq',
    Visualizer: GptqVisualizer,
    buildTrace: buildGptqTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { preset: 'correlated', seed: 1, bits: 3, blockSize: 4 },
        { preset: 'correlated', seed: 3, bits: 3, blockSize: 1 },
        { preset: 'decorrelated', seed: 2, bits: 4, blockSize: 8 },
    ],
});
