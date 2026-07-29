// Builds the SHA-256 trace: padding, the message schedule, 64 rounds of
// compression streamed one at a time, the final digest, and a measured
// avalanche.

import { H0, avalanche, flipLastBit, hex, pad, sha256, toBytes } from './model';

export function buildSha256Trace({ message }) {
    if (typeof message !== 'string') {
        throw new Error('Type a message to hash.');
    }
    if (message.length > 200) {
        throw new Error('Keep the message under 200 characters so the rounds stay watchable.');
    }

    const bytes = toBytes(message);
    const padded = pad(bytes);
    const run = sha256(message);
    const blocks = run.blocks.length;
    const first = run.perBlock[0];
    const neighbour = flipLastBit(message);
    const flip = message.length > 0 ? avalanche(message, neighbour) : null;

    const steps = [
        {
            id: 'pad',
            title: `Pad ${bytes.length} bytes to ${padded.length}`,
            provenance: 'modern',
            sourceRefs: [{ key: 'FIPS1804', detail: '§5.1.1' }],
            explanation:
                `The message is ${bytes.length} byte${bytes.length === 1 ? '' : 's'} — ` +
                `${bytes.length * 8} bits. Append a single 1 bit, then zeros until 64 bits ` +
                'short of a multiple of 512, then the original length as a 64-bit big-endian ' +
                `integer. That gives ${padded.length} bytes, exactly ${blocks} block` +
                `${blocks === 1 ? '' : 's'}. Encoding the length is not bookkeeping: it is ` +
                'what stops two different messages from ever sharing a padded form.',
            kind: 'values',
            data: {
                view: 'state',
                round: -1,
                values: [
                    { label: 'message', value: `${bytes.length} bytes` },
                    { label: 'padded', value: `${padded.length} bytes` },
                    { label: 'blocks', value: blocks },
                    { label: 'length field', value: `${bytes.length * 8} bits` },
                ],
            },
        },
        {
            id: 'init',
            title: 'Eight starting words, from nothing up a sleeve',
            provenance: 'modern',
            sourceRefs: [{ key: 'FIPS1804', detail: '§5.3.3' }],
            explanation:
                'The initial hash value is the fractional parts of the square roots of the ' +
                'first eight primes; the 64 round constants come from the cube roots of the ' +
                'first 64. Using recognizable mathematical constants is deliberate — it is a ' +
                'public argument that no backdoor was chosen into them.',
            kind: 'formula',
            data: {
                view: 'state',
                round: -1,
                caption: 'H⁽⁰⁾ — √2, √3, √5, √7, √11, √13, √17, √19, fractional parts:',
                lines: [
                    H0.slice(0, 4).map(hex).join('  '),
                    H0.slice(4).map(hex).join('  '),
                ],
            },
        },
        {
            id: 'schedule',
            title: '16 words become 64',
            provenance: 'modern',
            sourceRefs: [{ key: 'FIPS1804', detail: '§6.2.2' }],
            explanation:
                'The first block’s 512 bits are read as 16 words. Words 17 through 64 are ' +
                'built by mixing four earlier ones through rotations and shifts, so a single ' +
                'input bit reaches most of the schedule within a handful of expansions. The ' +
                'compression function never sees the message directly — it sees this.',
            kind: 'formula',
            data: {
                view: 'schedule',
                round: -1,
                lines: [
                    { tex: 'W_t = \\sigma_1(W_{t-2}) + W_{t-7} + \\sigma_0(W_{t-15}) + W_{t-16}' },
                    `W₀ … W₃ = ${first.schedule.slice(0, 4).map(hex).join('  ')}`,
                    `W₆₀ … W₆₃ = ${first.schedule.slice(60).map(hex).join('  ')}`,
                ],
            },
        },
        {
            id: 'rounds',
            title: '64 rounds of stirring',
            provenance: 'modern',
            sourceRefs: [{ key: 'FIPS1804', detail: '§6.2.2' }],
            explanation:
                'Each round computes two values — T₁ from e, f, g, the round constant and the ' +
                'schedule word; T₂ from a, b, c — then shifts every working variable down one ' +
                'position, inserting T₁ + T₂ at the top and adding T₁ into the middle. Nothing ' +
                'is ever thrown away and nothing is invertible without the whole history. ' +
                'Watch the bit grid: after four or five rounds it is already noise.',
            kind: 'values',
            data: {
                view: 'state',
                round: 0,
                eventBase: 0,
                values: [
                    { label: 'rounds', value: 64 },
                    { label: 'per round', value: 'T₁, T₂, shift' },
                ],
            },
            stream: {
                events: first.rounds.map((_, i) => ({ t: 'round', i })),
                tick: 90,
            },
        },
        {
            id: 'digest',
            title: 'Add the block back in',
            provenance: 'modern',
            sourceRefs: [
                { key: 'FIPS1804', detail: '§6.2.2' },
                { key: 'MERKLE1989' },
                { key: 'DAMGARD1989' },
            ],
            explanation:
                `After the rounds, the working variables are added to the incoming hash value ` +
                `— that final addition is what makes the compression function one-way rather ` +
                `than a permutation. ${
                    blocks > 1
                        ? `With ${blocks} blocks, each result feeds the next.`
                        : 'A single block, so this is the digest.'
                } Chaining blocks this way is the Merkle–Damgård construction, and its ` +
                'security theorem is the reason the padding must encode the length.',
            kind: 'formula',
            data: {
                view: 'state',
                round: 63,
                caption: 'The digest:',
                lines: [run.digest.match(/.{1,16}/g)],
                result: run.digest,
            },
        },
        {
            id: 'avalanche',
            title: flip
                ? `One bit changed, ${flip.changed} of 256 flipped`
                : 'Flip one bit of the input',
            provenance: 'modern',
            sourceRefs: [{ key: 'FIPS1804' }, { key: 'STEVENS2017' }],
            explanation: flip
                ? `Change the last character of the message by a single bit and ` +
                  `${flip.changed} of the 256 output bits change — ` +
                  `${(flip.fraction * 100).toFixed(1)}%, against the 50% an ideal random ` +
                  'function would give. The two digests share no visible structure. That is ' +
                  'the avalanche criterion, and it is why a hash can stand in for the thing ' +
                  'it hashes.'
                : 'Type a message to see the avalanche.',
            caveat: {
                provenance: 'modern',
                text: 'SHA-1 has the same shape and is broken: Wang’s 2005 attack cut collision search far below brute force, and in 2017 SHAttered produced two real colliding PDFs. SHA-256 has no such attack, but this page is a teaching implementation — it is not constant-time, and no visualization should be used to hash anything that matters.',
                sourceRefs: [{ key: 'WANG2005' }, { key: 'STEVENS2017' }],
            },
            kind: 'values',
            data: {
                view: 'avalanche',
                round: 63,
                values: flip
                    ? [
                          { label: 'bits changed', value: `${flip.changed} / 256` },
                          { label: 'fraction', value: `${(flip.fraction * 100).toFixed(1)}%` },
                          { label: 'ideal', value: '50%' },
                      ]
                    : [{ label: 'message', value: 'empty' }],
            },
        },
    ];

    return {
        steps,
        artifacts: { message, bytes, padded, run, first, digest: run.digest, flip, neighbour },
    };
}
