// Pure model for the Vigenère cipher. Letters A–Z; spaces pass through
// unenciphered and do not consume key letters (a labeled convention).

const A = 'A'.charCodeAt(0);
export const toNum = (ch) => ch.charCodeAt(0) - A;
export const toChar = (n) => String.fromCharCode(A + ((n % 26) + 26) % 26);

export const sanitizeMessage = (text) => text.toUpperCase().replace(/[^A-Z ]/g, '').slice(0, 24);
export const sanitizeKey = (text) => text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12);

// Per-position alignment and encipherment events for the lanes stage:
//   {t:'align', i, k}   key letter k lines up under position i
//   {t:'enc', i, p, k, c}   cipher letter appears at position i
export function vigenereEvents(message, key) {
    const alignEvents = [];
    const encEvents = [];
    const cipherChars = [];
    const keyRow = [];
    let ki = 0;
    for (let i = 0; i < message.length; i++) {
        const ch = message[i];
        if (ch === ' ') {
            keyRow.push(' ');
            cipherChars.push(' ');
            continue;
        }
        const k = key[ki % key.length];
        ki++;
        keyRow.push(k);
        alignEvents.push({ t: 'align', i, k });
        const c = toChar(toNum(ch) + toNum(k));
        cipherChars.push(c);
        encEvents.push({ t: 'enc', i, p: ch, k, c });
    }
    return {
        alignEvents,
        encEvents,
        keyRow,
        cipher: cipherChars.join(''),
    };
}

export function decryptVigenere(cipher, key) {
    let ki = 0;
    let out = '';
    for (const ch of cipher) {
        if (ch === ' ') {
            out += ' ';
            continue;
        }
        const k = key[ki % key.length];
        ki++;
        out += toChar(toNum(ch) - toNum(k));
    }
    return out;
}

// Fold events[0 … upTo) into lane state for the stage.
export function applyLaneEvents(message, events, upTo) {
    const keyRow = Array(message.length).fill('');
    const cipherRow = Array(message.length).fill('');
    let cursor = null;
    const limit = Math.min(upTo, events.length);
    for (let i = 0; i < limit; i++) {
        const e = events[i];
        if (e.t === 'align') {
            keyRow[e.i] = e.k;
            cursor = e.i;
        } else if (e.t === 'enc') {
            cipherRow[e.i] = e.c;
            cursor = e.i;
        }
    }
    return { keyRow, cipherRow, cursor };
}
