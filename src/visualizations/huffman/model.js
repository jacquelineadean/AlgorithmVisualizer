// Pure model for Huffman coding: symbol frequencies, the bottom-up merge
// that builds the tree, the codes read off it, and the entropy bound the
// result is measured against. Ties break deterministically so the same text
// always yields the same tree (and the same shareable link).

export const SAMPLES = [
    {
        id: 'mississippi',
        label: 'mississippi',
        text: 'mississippi',
        note: 'Four symbols, wildly uneven — the textbook case for a variable-length code.',
    },
    {
        id: 'abracadabra',
        label: 'abracadabra',
        text: 'abracadabra',
        note: 'Five symbols with one dominant: a gets a one-bit code and carries the saving.',
    },
    {
        id: 'sentence',
        label: 'a short sentence',
        text: 'the quick brown fox jumps over the lazy dog',
        note: 'Natural English: spaces and vowels dominate, and the tree leans accordingly.',
    },
    {
        id: 'uniform',
        label: 'abcdefgh (uniform)',
        text: 'abcdefgh',
        note: 'Equal frequencies: Huffman degenerates to a fixed-length code and saves nothing.',
    },
];

export const getSample = (id) => SAMPLES.find((sample) => sample.id === id) ?? SAMPLES[0];

export function frequencies(text) {
    const counts = new Map();
    for (const character of text) counts.set(character, (counts.get(character) ?? 0) + 1);
    return [...counts.entries()]
        .map(([symbol, count]) => ({ symbol, count }))
        .sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol));
}

// Huffman's construction: repeatedly merge the two lightest nodes. Ties go
// to the node created earlier, which keeps the tree stable across runs.
export function buildHuffman(freqs) {
    if (freqs.length === 0) throw new Error('Nothing to encode.');
    let counter = 0;
    const nodes = freqs.map((entry) => ({
        id: `leaf-${entry.symbol}`,
        symbol: entry.symbol,
        weight: entry.count,
        order: counter++,
    }));
    if (nodes.length === 1) {
        const root = { id: 'root', weight: nodes[0].weight, left: nodes[0], right: null, order: counter };
        return { root, merges: [], codes: new Map([[nodes[0].symbol, '0']]), nodes: [root, ...nodes] };
    }

    const pool = [...nodes];
    const merges = [];
    const all = [...nodes];
    while (pool.length > 1) {
        pool.sort((a, b) => a.weight - b.weight || a.order - b.order);
        const left = pool.shift();
        const right = pool.shift();
        const parent = {
            id: `node-${counter}`,
            weight: left.weight + right.weight,
            left,
            right,
            order: counter++,
        };
        merges.push({ left: left.id, right: right.id, parent: parent.id, weight: parent.weight });
        pool.push(parent);
        all.push(parent);
    }

    const root = pool[0];
    const codes = new Map();
    const walk = (node, prefix) => {
        if (!node) return;
        if (node.symbol != null) {
            codes.set(node.symbol, prefix || '0');
            return;
        }
        walk(node.left, `${prefix}0`);
        walk(node.right, `${prefix}1`);
    };
    walk(root, '');
    return { root, merges, codes, nodes: all };
}

export const encodedBits = (freqs, codes) =>
    freqs.reduce((sum, entry) => sum + entry.count * codes.get(entry.symbol).length, 0);

export const fixedWidth = (symbolCount) => Math.max(1, Math.ceil(Math.log2(symbolCount)));

export const fixedBits = (freqs) =>
    freqs.reduce((sum, entry) => sum + entry.count, 0) * fixedWidth(freqs.length);

// Shannon's entropy: the average bits per symbol no code can beat.
export function entropy(freqs) {
    const total = freqs.reduce((sum, entry) => sum + entry.count, 0);
    return -freqs.reduce((sum, entry) => {
        const p = entry.count / total;
        return sum + p * Math.log2(p);
    }, 0);
}

export const averageCodeLength = (freqs, codes) => {
    const total = freqs.reduce((sum, entry) => sum + entry.count, 0);
    return encodedBits(freqs, codes) / total;
};

// A prefix-free code: no codeword is a prefix of another, which is what
// makes the stream decodable without separators.
export function isPrefixFree(codes) {
    const words = [...codes.values()];
    for (const a of words) {
        for (const b of words) {
            if (a !== b && b.startsWith(a)) return false;
        }
    }
    return true;
}

export const encode = (text, codes) =>
    [...text].map((character) => codes.get(character)).join('');

export function decode(bits, root) {
    let out = '';
    let node = root;
    for (const bit of bits) {
        node = bit === '0' ? node.left : node.right;
        if (node.symbol != null) {
            out += node.symbol;
            node = root;
        }
    }
    return out;
}

// Tree layout for the stage: leaves spread evenly left to right, internal
// nodes centred over their children, depth on the vertical axis.
export function layout(root) {
    const positions = new Map();
    let leafIndex = 0;
    const depthOf = (node, depth = 0) =>
        node.symbol != null
            ? depth
            : Math.max(depthOf(node.left, depth + 1), node.right ? depthOf(node.right, depth + 1) : 0);
    const maxDepth = Math.max(1, depthOf(root));
    const leaves = (node) => (node.symbol != null ? 1 : leaves(node.left) + (node.right ? leaves(node.right) : 0));
    const total = leaves(root);

    const place = (node, depth) => {
        if (node.symbol != null) {
            const x = total === 1 ? 0.5 : leafIndex / (total - 1);
            leafIndex += 1;
            positions.set(node.id, { x, y: depth / maxDepth });
            return x;
        }
        const left = place(node.left, depth + 1);
        const right = node.right ? place(node.right, depth + 1) : left;
        const x = (left + right) / 2;
        positions.set(node.id, { x, y: depth / maxDepth });
        return x;
    };
    place(root, 0);
    return positions;
}
