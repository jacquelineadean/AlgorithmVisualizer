import { defineVisualization } from '../registry';
import { buildAttentionTrace } from './trace';
import { SOURCES } from './sources';
import AttentionVisualizer from './AttentionVisualizer';

export default defineVisualization({
    id: 'attention',
    Visualizer: AttentionVisualizer,
    buildTrace: buildAttentionTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { sentenceId: 'animal', causal: false, focusRow: 3 },
        { sentenceId: 'river', causal: true, focusRow: 2 },
    ],
});
