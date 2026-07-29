// Pure model for the Fourier epicycles: a closed path sampled as complex
// numbers, its discrete Fourier transform, and the rotating-circle
// reconstruction that the coefficients literally describe. No FFT here —
// the O(N²) definition is the point; the Cooley–Tukey speedup is the story.

export const PATHS = [
    {
        id: 'square',
        label: 'A square',
        note: 'Corners are discontinuities in the derivative, so the series needs many terms — and rings near each one.',
    },
    {
        id: 'heart',
        label: 'A heart',
        note: 'Smooth and closed: a handful of circles already captures it.',
    },
    {
        id: 'star',
        label: 'A five-pointed star',
        note: 'Five-fold symmetry shows up directly in the spectrum — only every fifth harmonic carries weight.',
    },
    {
        id: 'circle',
        label: 'A circle',
        note: 'One coefficient, exactly. A circle is a single rotating vector, which is what the whole method is made of.',
    },
];

export const getPath = (id) => PATHS.find((path) => path.id === id) ?? PATHS[0];

// Each preset is generated, not traced by hand — the geometry is in the
// formula, so the tests can check the spectrum against what it should be.
export function samplePath(id, count = 128) {
    const points = [];
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = 2 * Math.PI * t;
        if (id === 'circle') {
            points.push({ x: Math.cos(angle), y: Math.sin(angle) });
        } else if (id === 'square') {
            // Walk the perimeter of the unit square, one quarter per side.
            const side = Math.floor(t * 4);
            const u = t * 4 - side;
            const corners = [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
            ];
            const [x0, y0] = corners[side];
            const [x1, y1] = corners[(side + 1) % 4];
            points.push({ x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u });
        } else if (id === 'star') {
            const radius = 1 + 0.55 * Math.cos(5 * angle);
            points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
        } else {
            // The classic parametric heart, scaled to roughly unit size.
            const s = Math.sin(angle);
            points.push({
                x: (16 * s * s * s) / 17,
                y: (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) / 17,
            });
        }
    }
    return points;
}

// The discrete Fourier transform, straight from the definition:
//   X_k = (1/N) Σ x_n e^{−2πikn/N}
// Frequencies are centred (…, −2, −1, 0, 1, 2, …) so a coefficient's sign
// is its direction of rotation.
export function dft(points) {
    const N = points.length;
    const coefficients = [];
    for (let index = 0; index < N; index++) {
        const k = index <= N / 2 ? index : index - N;
        let re = 0;
        let im = 0;
        for (let n = 0; n < N; n++) {
            const angle = (-2 * Math.PI * index * n) / N;
            re += points[n].x * Math.cos(angle) - points[n].y * Math.sin(angle);
            im += points[n].x * Math.sin(angle) + points[n].y * Math.cos(angle);
        }
        coefficients.push({
            k,
            re: re / N,
            im: im / N,
            amplitude: Math.hypot(re, im) / N,
            phase: Math.atan2(im, re),
        });
    }
    return coefficients;
}

// The inverse, evaluated at a continuous t ∈ [0, 1) — which is what lets the
// reconstruction be animated rather than merely resampled.
export const evaluate = (coefficients, t) =>
    coefficients.reduce(
        (sum, c) => {
            const angle = 2 * Math.PI * c.k * t + c.phase;
            return {
                x: sum.x + c.amplitude * Math.cos(angle),
                y: sum.y + c.amplitude * Math.sin(angle),
            };
        },
        { x: 0, y: 0 }
    );

// Coefficients sorted by amplitude — the order to draw the circles in, and
// the order to truncate in.
export const byAmplitude = (coefficients) =>
    [...coefficients].sort((a, b) => b.amplitude - a.amplitude || Math.abs(a.k) - Math.abs(b.k));

export const strongest = (coefficients, count) => byAmplitude(coefficients).slice(0, count);

// The chain of circles: each coefficient's vector, tip to tail, at time t.
export function epicycles(coefficients, t) {
    let x = 0;
    let y = 0;
    return coefficients.map((c) => {
        const angle = 2 * Math.PI * c.k * t + c.phase;
        const from = { x, y };
        x += c.amplitude * Math.cos(angle);
        y += c.amplitude * Math.sin(angle);
        return { from, to: { x, y }, radius: c.amplitude, k: c.k };
    });
}

// Root-mean-square distance between the truncated reconstruction and the
// original samples — the number that falls as harmonics are added.
export function reconstructionError(points, coefficients) {
    const N = points.length;
    let total = 0;
    for (let n = 0; n < N; n++) {
        const approximation = evaluate(coefficients, n / N);
        total += (approximation.x - points[n].x) ** 2 + (approximation.y - points[n].y) ** 2;
    }
    return Math.sqrt(total / N);
}

// Parseval: the energy of the samples equals the energy of the spectrum.
export const signalEnergy = (points) =>
    points.reduce((sum, point) => sum + point.x * point.x + point.y * point.y, 0) / points.length;

export const spectrumEnergy = (coefficients) =>
    coefficients.reduce((sum, c) => sum + c.amplitude * c.amplitude, 0);

// Operation counts: the whole reason the FFT mattered.
export const naiveOps = (n) => n * n;
export const fftOps = (n) => n * Math.log2(n);
