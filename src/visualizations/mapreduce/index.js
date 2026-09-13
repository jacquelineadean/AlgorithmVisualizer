import { defineVisualization } from '../registry';
import { buildMapReduceMap } from './map';
import { SOURCES } from './sources';
import MapReduceVisualizer from './MapReduceVisualizer';

export default defineVisualization({
    id: 'mapreduce',
    Visualizer: MapReduceVisualizer,
    buildMap: buildMapReduceMap,
    sources: SOURCES,
    gateFixtures: () => [{ jobId: 'wordcount' }, { jobId: 'sort' }, { jobId: 'grep' }],
});
