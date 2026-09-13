import { defineVisualization } from '../registry';
import { buildTransformerMap } from './map';
import { SOURCES } from './sources';
import TransformerVisualizer from './TransformerVisualizer';

export default defineVisualization({
    id: 'transformer-arch',
    Visualizer: TransformerVisualizer,
    buildMap: buildTransformerMap,
    sources: SOURCES,
    gateFixtures: () => [
        { configId: 'gpt2-small' },
        { configId: 'llama-7b' },
        { configId: 'gpt2-xl' },
    ],
});
