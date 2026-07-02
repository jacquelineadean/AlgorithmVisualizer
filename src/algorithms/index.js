// Algorithm registry. To add a new algorithm, create a module exporting
// { id, name, run(grid, startNode, finishNode) } (see dijkstra.js) and
// register it here; it will automatically appear in the visualizer UI.
import dijkstra from './dijkstra';

const registry = new Map();

export function registerAlgorithm(algorithm) {
    if (
        !algorithm ||
        typeof algorithm.id !== 'string' ||
        typeof algorithm.name !== 'string' ||
        typeof algorithm.run !== 'function'
    ) {
        throw new Error(
            'An algorithm must provide an id, a name, and a run(grid, startNode, finishNode) function.'
        );
    }
    if (registry.has(algorithm.id)) {
        throw new Error(`An algorithm with id "${algorithm.id}" is already registered.`);
    }
    registry.set(algorithm.id, algorithm);
    return algorithm;
}

export function getAlgorithm(id) {
    const algorithm = registry.get(id);
    if (!algorithm) throw new Error(`Unknown algorithm "${id}".`);
    return algorithm;
}

export function listAlgorithms() {
    return [...registry.values()];
}

registerAlgorithm(dijkstra);
