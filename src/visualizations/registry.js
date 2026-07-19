// Registry of trace-based visualizations. A visualization registers once
// via defineVisualization and the rest of the site derives from it: the
// generic /visualizer/:id page renders def.Visualizer, and the central
// evidence-gate suite builds def.buildTrace over def.gateFixtures().
// Contract documented in docs/CONTRACTS.md.

const registry = new Map();

export function defineVisualization(def) {
    const required = ['id', 'Visualizer', 'buildTrace', 'sources', 'gateFixtures'];
    for (const field of required) {
        if (!def || def[field] == null) {
            throw new Error(`defineVisualization: missing "${field}".`);
        }
    }
    if (registry.has(def.id)) {
        throw new Error(`defineVisualization: "${def.id}" is already registered.`);
    }
    registry.set(def.id, def);
    return def;
}

export const getVisualization = (id) => registry.get(id);

export const listVisualizations = () => [...registry.values()];
