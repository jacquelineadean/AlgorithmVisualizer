// Pure geometry for the mod-n helix (Phase 3a): clock arithmetic as a
// spiral. Every point derives from trace artifacts — a value v mod n sits
// at angle 2π·v/n, and each square-and-multiply row climbs one turn of
// pitch. No decorative geometry: if it isn't in the rows, it isn't drawn.

export function helixGeometry({ rows, mod, radius = 2.2, pitch = 0.55 }) {
    const n = Number(mod);
    if (!Number.isFinite(n) || n <= 0) throw new Error('mod must be a positive number.');

    const points = rows.map((row, i) => {
        const value = Number(row.value);
        const angle = (value / n) * Math.PI * 2;
        return {
            x: radius * Math.cos(angle),
            z: radius * Math.sin(angle),
            y: i * pitch,
            value,
            bit: row.bit,
        };
    });

    // i % 96 makes the closing point identical to the first — the ring
    // closes exactly, not within float epsilon.
    const ring = Array.from({ length: 97 }, (_, i) => {
        const angle = ((i % 96) / 96) * Math.PI * 2;
        return [radius * Math.cos(angle), 0, radius * Math.sin(angle)];
    });

    return { points, ring, radius, pitch };
}
