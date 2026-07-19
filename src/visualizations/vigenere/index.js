import { defineVisualization } from '../registry';
import { buildVigenereTrace } from './trace';
import { SOURCES } from './sources';
import VigenereVisualizer from './VigenereVisualizer';

export default defineVisualization({
    id: 'vigenere',
    Visualizer: VigenereVisualizer,
    buildTrace: buildVigenereTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { message: 'ATTACK AT DAWN', key: 'LEMON' },
        { message: 'A', key: 'Z' },
    ],
});
