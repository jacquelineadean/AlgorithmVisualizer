import { defineVisualization } from '../registry';
import { buildSha256Trace } from './trace';
import { SOURCES } from './sources';
import Sha256Visualizer from './Sha256Visualizer';

export default defineVisualization({
    id: 'sha-256',
    Visualizer: Sha256Visualizer,
    buildTrace: buildSha256Trace,
    sources: SOURCES,
    gateFixtures: () => [
        { message: 'abc' },
        { message: '' },
        { message: 'the quick brown fox jumps over the lazy dog, twice over, for length' },
    ],
});
