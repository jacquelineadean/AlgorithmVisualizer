import { defineVisualization } from '../registry';
import { buildRsaTrace } from './trace';
import { SOURCES } from './sources';
import RsaVisualizer from './RsaVisualizer';

export default defineVisualization({
    id: 'rsa',
    Visualizer: RsaVisualizer,
    buildTrace: buildRsaTrace,
    sources: SOURCES,
    gateFixtures: () => [
        { message: 'HELLO', p: 61n, q: 53n, e: 17n },
        { message: 'a', p: 11n, q: 13n, e: 7n },
    ],
});
