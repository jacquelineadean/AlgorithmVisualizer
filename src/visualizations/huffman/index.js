import { defineVisualization } from '../registry';
import { buildHuffmanTrace } from './trace';
import { SOURCES } from './sources';
import HuffmanVisualizer from './HuffmanVisualizer';

export default defineVisualization({
    id: 'huffman',
    Visualizer: HuffmanVisualizer,
    buildTrace: buildHuffmanTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { sampleId: 'mississippi' },
        { sampleId: 'sentence' },
        { sampleId: 'uniform' },
    ],
});
