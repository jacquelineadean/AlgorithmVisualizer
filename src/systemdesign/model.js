// Pure helpers over the system definitions: the tray sequence the rack
// navigates (overview, then each layer top to bottom, then cross-cutting
// topics), neighbours for previous / next, and the citation walk that
// builds each page's evidence section and feeds the content gate.

export const OVERVIEW_ID = 'overview';

// Layers take colors 1–7 in order; topics share a neutral color.
export function defineSystem(system) {
    const layers = system.layers.map((layer, i) => ({ ...layer, kind: 'layer', color: layer.color ?? (i % 7) + 1, index: i }));
    const topics = (system.topics ?? []).map((topic, i) => ({ ...topic, kind: 'topic', color: 0, index: i }));
    const overview = {
        id: OVERVIEW_ID,
        kind: 'overview',
        code: '00',
        name: 'Overview',
        color: 0,
        ...system.overview,
    };
    return { ...system, overview, layers, topics };
}

export const traysOf = (system) => [system.overview, ...system.layers, ...system.topics];

export const findTray = (system, trayId) => traysOf(system).find((t) => t.id === (trayId ?? OVERVIEW_ID)) ?? null;

export function neighborsOf(system, trayId) {
    const trays = traysOf(system);
    const i = trays.findIndex((t) => t.id === trayId);
    return { prev: i > 0 ? trays[i - 1] : null, next: i >= 0 && i < trays.length - 1 ? trays[i + 1] : null };
}

export const trayPath = (systemId, trayId) => (!trayId || trayId === OVERVIEW_ID ? `/systems/${systemId}` : `/systems/${systemId}/${trayId}`);

// Every [tray, section] pair in reading order.
export function sectionsOf(system) {
    const out = [];
    for (const tray of traysOf(system)) for (const section of tray.sections ?? []) out.push([tray, section]);
    return out;
}

// Every citation a system makes: tray-level, section-level and caveats.
export function citationsOf(system) {
    const refs = [];
    const add = (owner, item) => {
        for (const ref of item?.sourceRefs ?? []) refs.push({ owner, key: ref.key });
    };
    for (const tray of traysOf(system)) {
        add(`${system.id}/${tray.id}`, tray);
        for (const section of tray.sections ?? []) {
            add(`${system.id}/${tray.id}#${section.id}`, section);
            add(`${system.id}/${tray.id}#${section.id} caveat`, section.caveat);
        }
    }
    return refs;
}

export function citedSources(system, sources) {
    const keys = new Set(citationsOf(system).map((r) => r.key));
    return Object.fromEntries(Object.entries(sources).filter(([key]) => keys.has(key)));
}

// All the human-readable text a system carries, for the content gate.
export function textOf(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return '';
    if (Array.isArray(value)) return value.map(textOf).join(' ');
    if (typeof value === 'object') {
        return Object.entries(value)
            .filter(([k]) => k !== 'sourceRefs')
            .map(([, v]) => textOf(v))
            .join(' ');
    }
    return '';
}
