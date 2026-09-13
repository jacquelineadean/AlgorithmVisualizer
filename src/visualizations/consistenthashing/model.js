// Pure model for consistent hashing: a 32-bit ring, servers placed on it
// (optionally many times each), keys assigned to their clockwise successor,
// and the measurement that matters — what fraction of keys move when the
// server set changes.

export const RING = 2 ** 32;

// FNV-1a followed by MurmurHash3's finalizer. The mixing step is not
// decoration: FNV alone leaves the high bits dominated by a string's first
// characters, so tokens like "node-1#0" … "node-6#99" land in clumps and the
// ring's arcs come out wildly uneven. Consistent hashing assumes a hash with
// good avalanche, and the load balance it promises depends on having one.
export function hash32(text) {
    let value = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        value ^= text.charCodeAt(i);
        value = Math.imul(value, 0x01000193) >>> 0;
    }
    value ^= value >>> 16;
    value = Math.imul(value, 0x85ebca6b) >>> 0;
    value ^= value >>> 13;
    value = Math.imul(value, 0xc2b2ae35) >>> 0;
    value ^= value >>> 16;
    return value >>> 0;
}

export const position = (text) => hash32(text) / RING; // 0 … 1 around the ring

// Each server appears `replicas` times, at hash(server#i). Virtual nodes are
// the whole reason the load evens out.
export function ringPoints(servers, replicas) {
    const points = [];
    for (const server of servers) {
        for (let i = 0; i < replicas; i++) {
            points.push({ server, label: `${server}#${i}`, at: position(`${server}#${i}`) });
        }
    }
    return points.sort((a, b) => a.at - b.at);
}

// The owner of a key is the first ring point clockwise from it — wrapping
// past 1 back to 0, which is what makes the ring a ring.
export function ownerOf(keyPosition, points) {
    for (const point of points) {
        if (point.at >= keyPosition) return point.server;
    }
    return points[0]?.server ?? null;
}

export const makeKeys = (count) =>
    Array.from({ length: count }, (_, i) => {
        const name = `key-${i}`;
        return { name, at: position(name) };
    });

export function assign(keys, servers, replicas) {
    const points = ringPoints(servers, replicas);
    const owners = new Map(keys.map((key) => [key.name, ownerOf(key.at, points)]));
    const load = new Map(servers.map((server) => [server, 0]));
    for (const owner of owners.values()) load.set(owner, (load.get(owner) ?? 0) + 1);
    return { points, owners, load };
}

// The number that decides whether a scheme is usable: how many keys change
// hands between two server sets.
export function movedFraction(keys, before, after, replicas) {
    const a = assign(keys, before, replicas).owners;
    const b = assign(keys, after, replicas).owners;
    let moved = 0;
    for (const key of keys) if (a.get(key.name) !== b.get(key.name)) moved += 1;
    return moved / keys.length;
}

// The alternative everyone tries first: hash(key) mod N.
export const moduloOwner = (key, servers) => servers[hash32(key.name) % servers.length];

export function moduloMovedFraction(keys, before, after) {
    let moved = 0;
    for (const key of keys) {
        if (moduloOwner(key, before) !== moduloOwner(key, after)) moved += 1;
    }
    return moved / keys.length;
}

// Load imbalance as the ratio of the busiest server to the average — the
// quantity virtual nodes are there to pull down toward 1.
export function imbalance(load) {
    const counts = [...load.values()];
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    return { peak: Math.max(...counts) / mean, mean, counts };
}
