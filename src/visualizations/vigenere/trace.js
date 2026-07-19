// Builds the Vigenère trace: the cipher's rule, the key repeating under
// the message (streamed), encipherment letter by letter (streamed),
// decryption, and the three-century fall.

import {
    applyLaneEvents,
    decryptVigenere,
    sanitizeKey,
    sanitizeMessage,
    toChar,
    toNum,
    vigenereEvents,
} from './model';

export { applyLaneEvents };

export function buildVigenereTrace({ message, key }) {
    const clean = sanitizeMessage(message ?? '');
    const cleanKey = sanitizeKey(key ?? '');
    if (!/[A-Z]/.test(clean)) {
        throw new Error('Type a message using letters A–Z (spaces allowed).');
    }
    if (cleanKey.length === 0) {
        throw new Error('The keyword needs at least one letter A–Z.');
    }

    const { alignEvents, encEvents, keyRow, cipher } = vigenereEvents(clean, cleanKey);
    const events = [...alignEvents, ...encEvents];
    const decrypted = decryptVigenere(cipher, cleanKey);
    const first = encEvents[0];

    const steps = [
        {
            id: 'the-square',
            title: 'One cipher per key letter',
            provenance: 'paper',
            sourceRefs: [{ key: 'VIGENERE1586' }],
            explanation:
                'A Caesar shift uses one shifted alphabet; Vigenère’s 1586 treatise layers ' +
                `many — each key letter selects its own. Numbering A=0 … Z=25, a key letter ` +
                'k shifts a plaintext letter p to the ciphertext letter c.',
            caveat: {
                provenance: 'pedagogical',
                text: 'Spaces are kept and skip the key here so the lanes stay readable; historical practice stripped them (and the polyalphabetic idea itself predates the treatise, via Alberti and Trithemius).',
                sourceRefs: [{ key: 'KL2020', detail: 'Ch. 1' }],
            },
            kind: 'formula',
            data: {
                eventBase: 0,
                lines: ['c = (p + k) mod 26', 'p = (c − k) mod 26'],
            },
        },
        {
            id: 'repeat-the-key',
            title: 'The keyword repeats beneath',
            provenance: 'paper',
            sourceRefs: [{ key: 'VIGENERE1586' }],
            explanation:
                `“${cleanKey}” cycles under the message, one key letter per plaintext ` +
                'letter. This repetition is the cipher’s engine — and, three centuries ' +
                'later, its undoing.',
            kind: 'values',
            data: {
                eventBase: 0,
                values: [
                    { label: 'keyword', value: cleanKey },
                    { label: 'period', value: cleanKey.length },
                ],
            },
            stream: { events: alignEvents, tick: 90 },
        },
        {
            id: 'encipher',
            title: 'Encipher, letter by letter',
            provenance: 'paper',
            sourceRefs: [{ key: 'VIGENERE1586' }],
            explanation:
                `Each column adds its key letter. The first: ` +
                `${first.p} (${toNum(first.p)}) + ${first.k} (${toNum(first.k)}) = ` +
                `${toNum(first.p) + toNum(first.k)} ≡ ${toNum(first.c)} → ${first.c}. ` +
                'Identical plaintext letters no longer encrypt alike — that is the whole ' +
                'point of going polyalphabetic.',
            kind: 'formula',
            data: {
                eventBase: alignEvents.length,
                caption: 'First letter, worked:',
                lines: [
                    `${first.p} + ${first.k} → (${toNum(first.p)} + ${toNum(first.k)}) mod 26 = ${toNum(first.c)} → ${first.c}`,
                ],
            },
            stream: { events: encEvents, tick: 120 },
        },
        {
            id: 'decipher',
            title: 'Decipher by subtracting',
            provenance: 'paper',
            sourceRefs: [{ key: 'VIGENERE1586' }],
            explanation:
                `Whoever knows the keyword subtracts it: ${first.c} − ${first.k} → ` +
                `${toChar(toNum(first.c) - toNum(first.k))}, and so on — recovering ` +
                `“${decrypted}”. Symmetric, fast, and for three hundred years reputed ` +
                'le chiffre indéchiffrable.',
            kind: 'values',
            data: {
                eventBase: events.length,
                values: [
                    { label: 'ciphertext', value: cipher },
                    { label: 'recovered', value: decrypted },
                ],
            },
        },
        {
            id: 'three-centuries',
            title: 'Why it fell',
            provenance: 'modern',
            sourceRefs: [
                { key: 'SHANNON49', detail: '§10–11' },
                { key: 'KL2020', detail: 'Ch. 1' },
            ],
            explanation:
                'A repeating key means every kth letter is a plain Caesar cipher. Kasiski ' +
                '(1863) spotted the period from repeated ciphertext fragments; Friedman’s ' +
                'index of coincidence measures it statistically. Shannon made the lesson ' +
                'general: natural language carries redundancy, and any cipher that reuses ' +
                'key material leaves it showing. Only the one-time pad escapes.',
            kind: 'values',
            data: {
                eventBase: events.length,
                values: [
                    { label: 'weakness', value: `period ${cleanKey.length} repeats` },
                    { label: 'every kth letter', value: 'one Caesar cipher' },
                ],
            },
        },
    ];

    return {
        steps,
        artifacts: { message: clean, key: cleanKey, keyRow, cipher, decrypted, events },
    };
}
