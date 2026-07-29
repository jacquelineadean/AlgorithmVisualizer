import { defineVisualization } from '../registry';
import { buildRaftTrace } from './trace';
import { SOURCES } from './sources';
import RaftVisualizer from './RaftVisualizer';

export default defineVisualization({
    id: 'raft',
    Visualizer: RaftVisualizer,
    buildTrace: buildRaftTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { servers: 5, injectPartition: true },
        { servers: 3, injectPartition: false },
    ],
});
