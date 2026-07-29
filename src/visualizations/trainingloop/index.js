import { defineVisualization } from '../registry';
import { buildTrainingMap } from './map';
import { SOURCES } from './sources';
import TrainingVisualizer from './TrainingVisualizer';

export default defineVisualization({
    id: 'training-loop',
    Visualizer: TrainingVisualizer,
    buildMap: buildTrainingMap,
    sources: SOURCES,
    gateFixtures: () => [
        { runId: 'llama-7b', clusterId: '256xa100', mfu: 0.45 },
        { runId: 'chinchilla-70b', clusterId: '1024xh100', mfu: 0.5 },
        { runId: 'gpt2-xl', clusterId: '8xa100', mfu: 0.3 },
    ],
});
