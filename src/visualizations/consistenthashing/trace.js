// Builds the consistent-hashing trace: why modulo fails, what the ring
// fixes, and what virtual nodes fix about the ring.

import { assign, imbalance, makeKeys, movedFraction, moduloMovedFraction } from './model';

const pct = (value) => `${(value * 100).toFixed(1)}%`;

export function buildHashingTrace({ servers = 4, keys = 400, replicas = 1 }) {
    if (!Number.isInteger(servers) || servers < 2 || servers > 12) {
        throw new Error('Use between 2 and 12 servers.');
    }
    if (!Number.isInteger(replicas) || replicas < 1 || replicas > 200) {
        throw new Error('Each server needs between 1 and 200 virtual nodes.');
    }

    const keyList = makeKeys(keys);
    const before = Array.from({ length: servers }, (_, i) => `node-${i + 1}`);
    const after = [...before, `node-${servers + 1}`];

    const state = assign(keyList, before, replicas);
    const grown = assign(keyList, after, replicas);
    const moved = movedFraction(keyList, before, after, replicas);
    const modulo = moduloMovedFraction(keyList, before, after);
    const ideal = 1 / after.length;
    const spread = imbalance(state.load);
    const spreadMany = imbalance(assign(keyList, before, 100).load);

    const steps = [
        {
            id: 'modulo',
            title: 'The obvious scheme, and why it fails',
            provenance: 'paper',
            sourceRefs: [{ key: 'KARGER1997', detail: '§1' }],
            explanation:
                `Send each key to server hash(key) mod N. It balances beautifully — and the ` +
                `moment N changes, nearly every key changes owner. Adding one server to these ` +
                `${servers} moves ${pct(modulo)} of the keys, because the modulus itself ` +
                'changed. For a cache that means a near-total miss storm; for a database, ' +
                'copying almost the entire dataset.',
            kind: 'values',
            data: {
                view: 'modulo',
                values: [
                    { label: 'servers', value: `${servers} → ${servers + 1}` },
                    { label: 'keys moved', value: pct(modulo) },
                    { label: 'need to move', value: pct(ideal) },
                ],
            },
        },
        {
            id: 'ring',
            title: 'Hash both onto one circle',
            provenance: 'paper',
            sourceRefs: [{ key: 'KARGER1997', detail: '§4' }],
            explanation:
                'Karger et al.’s idea: hash servers and keys into the *same* space, and read ' +
                'that space as a circle. A key belongs to the first server clockwise from it. ' +
                'Nothing about a key’s position depends on how many servers exist — which is ' +
                'precisely what the modulo scheme got wrong.',
            kind: 'values',
            data: {
                view: 'ring',
                values: [
                    { label: 'ring', value: '0 … 2³²' },
                    { label: 'rule', value: 'first server clockwise' },
                    { label: 'points on ring', value: state.points.length },
                ],
            },
        },
        {
            id: 'own',
            title: 'Every key has an arc, every arc an owner',
            provenance: 'paper',
            sourceRefs: [{ key: 'KARGER1997', detail: '§4' }, { key: 'STOICA2001', detail: '§4' }],
            explanation:
                `The ${keys} keys divide into ${servers} arcs. Chord later built a whole ` +
                'peer-to-peer lookup service on exactly this structure, adding finger tables ' +
                'so a node can find a key’s owner in O(log N) hops instead of asking everyone.',
            kind: 'values',
            data: {
                view: 'ring',
                showKeys: true,
                values: [...state.load.entries()].map(([server, count]) => ({
                    label: server,
                    value: `${count} keys`,
                })),
            },
        },
        {
            id: 'add',
            title: 'Add a server: only its arc moves',
            provenance: 'theorem',
            sourceRefs: [{ key: 'KARGER1997', detail: '§4, Theorem 1' }],
            explanation:
                `The new server lands somewhere on the circle and takes over only the keys ` +
                `between it and its predecessor. ${pct(moved)} of keys moved, against ` +
                `${pct(modulo)} under modulo — and the theoretical floor is ${pct(ideal)}, ` +
                'since somebody has to give up a share. Every other key keeps its owner, ' +
                'untouched.',
            kind: 'formula',
            data: {
                view: 'ring',
                showKeys: true,
                added: true,
                lines: [
                    `consistent hashing: ${pct(moved)} of keys moved`,
                    `modulo hashing:     ${pct(modulo)} of keys moved`,
                    `unavoidable minimum: ${pct(ideal)}`,
                ],
                result: `${(modulo / Math.max(moved, 1e-9)).toFixed(1)}× less data in flight`,
            },
        },
        {
            id: 'virtual',
            title: 'Virtual nodes even out the load',
            provenance: 'modern',
            sourceRefs: [{ key: 'DECANDIA2007', detail: '§4.2' }, { key: 'KARGER1997' }],
            explanation:
                `Random points make lumpy arcs: with ${replicas} point${
                    replicas === 1 ? '' : 's'
                } per server the busiest one holds ${spread.peak.toFixed(2)}× the average. ` +
                'Place each server at a hundred points instead and the arcs interleave, ' +
                `pulling the peak down to about ${spreadMany.peak.toFixed(2)}×. Dynamo made ` +
                'this standard practice, and used it for a second purpose: a more powerful ' +
                'machine simply gets more tokens.',
            kind: 'values',
            data: {
                view: 'load',
                showKeys: true,
                values: [
                    { label: `peak/avg at ${replicas}`, value: `${spread.peak.toFixed(2)}×` },
                    { label: 'peak/avg at 100', value: `${spreadMany.peak.toFixed(2)}×` },
                ],
            },
            caveat: {
                provenance: 'pedagogical',
                text: 'This page hashes a few hundred keys with FNV-1a onto a ring drawn as a circle of a few dozen points. Production rings carry millions of keys and hundreds of tokens per node, and pair the ring with replication, hinted handoff, and Merkle-tree anti-entropy — none of which is drawn here.',
                sourceRefs: [{ key: 'DECANDIA2007', detail: '§4' }],
            },
        },
        {
            id: 'today',
            title: 'Where it ended up',
            provenance: 'modern',
            sourceRefs: [
                { key: 'DECANDIA2007' },
                { key: 'STOICA2001' },
                { key: 'LAMPING2014' },
            ],
            explanation:
                'Invented in 1997 to keep web caches from thrashing, consistent hashing now ' +
                'sits under Dynamo-lineage stores, distributed caches, sharded queues, and ' +
                'load balancers. Where a ring’s memory overhead is unwelcome, jump consistent ' +
                'hash gets the same minimal-movement property from a few lines of arithmetic ' +
                'and no data structure at all — at the cost of only ever being able to add or ' +
                'remove the highest-numbered bucket.',
            kind: 'values',
            data: {
                view: 'load',
                showKeys: true,
                added: true,
                values: [
                    { label: 'ring', value: 'flexible membership, O(n) state' },
                    { label: 'jump hash', value: 'no state, buckets only at the end' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { keyList, before, after, state, grown, replicas, moved, modulo, ideal, spread },
    };
}
