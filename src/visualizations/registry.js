// Registry of visualizations. A visualization registers once via
// defineVisualization and the rest of the site derives from it: the generic
// /visualizer/:id page renders def.Visualizer, and the central evidence-gate
// suite builds def.buildTrace (step sequences) or def.buildMap (drill-down
// architecture maps, Phase 4a) over def.gateFixtures().
// Contract documented in docs/CONTRACTS.md.

const registry = new Map();

export function defineVisualization(def) {
    for (const field of ['id', 'Visualizer', 'sources', 'gateFixtures']) {
        if (!def || def[field] == null) {
            throw new Error(`defineVisualization: missing "${field}".`);
        }
    }
    // Exactly one renderer tier: a trace of steps or a map of nodes.
    if (!def.buildTrace === !def.buildMap) {
        throw new Error(
            `defineVisualization "${def.id}": provide exactly one of buildTrace / buildMap.`
        );
    }
    if (registry.has(def.id)) {
        throw new Error(`defineVisualization: "${def.id}" is already registered.`);
    }
    registry.set(def.id, def);
    return def;
}

export const getVisualization = (id) => registry.get(id);

export const listVisualizations = () => [...registry.values()];
