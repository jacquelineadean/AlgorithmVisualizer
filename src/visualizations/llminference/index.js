import { defineVisualization } from '../registry';
import { buildInferenceMap } from './map';
import { SOURCES } from './sources';
import InferenceVisualizer from './InferenceVisualizer';

export default defineVisualization({
    id: 'llm-inference',
    Visualizer: InferenceVisualizer,
    buildMap: buildInferenceMap,
    sources: SOURCES,
    gateFixtures: () => [
        { modelId: '7b', deviceId: 'a100', promptTokens: 1024, batch: 16 },
        { modelId: '70b-gqa', deviceId: 'h100', promptTokens: 4096, batch: 64 },
    ],
});
