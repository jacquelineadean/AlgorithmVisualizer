import { defineVisualization } from '../registry';
import { buildCapTrace } from './trace';
import { SOURCES } from './sources';
import CapVisualizer from './CapVisualizer';

export default defineVisualization({
    id: 'cap',
    Visualizer: CapVisualizer,
    buildTrace: buildCapTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { choiceId: 'cp', n: 3, r: 2, w: 2 },
        { choiceId: 'ap', n: 5, r: 1, w: 1 },
    ],
});
