# Algorithm Visualizer

Interactive, **evidence-cited** visualizations of famous algorithms — built with
[React](https://react.dev/) and [Vite](https://vitejs.dev/).

Pick an algorithm, feed it your own inputs, and step through a rendering in which
**every step cites its source** — the original paper, the underlying theorem, or the
modern standard — with labeled provenance whenever the visualization simplifies for
teaching. See [ROADMAP.md](ROADMAP.md) for the multi-phase plan.

**Live now** — eight visualizations, every step cited:

- **RSA Encryption** (`#/visualizer/rsa`) — keygen, encryption, decryption on your own
  message and primes; extended Euclid and square-and-multiply worked in full; optional
  3D mod-n helix (lazy-loaded three.js). RSA 1978, Euler 1763, RFC 8017, and more.
- **Diffie–Hellman** (`#/visualizer/dh`) — a shared secret over an open channel.
  DH 1976, Merkle 1978, RFC 3526, NIST SP 800-56A.
- **Vigenère Cipher** (`#/visualizer/vigenere`) — the repeating key, streamed letter by
  letter, and why Kasiski broke it. Vigenère 1586, Shannon 1949.
- **Sieve of Eratosthenes** (`#/visualizer/sieve`) — primes by elimination, crossing
  from p². Horsley 1772, O'Neill 2009.
- **Bayes' Rule** (`#/visualizer/bayes`) — 1,000 people through a screening test; also
  powers the home hero. Bayes 1763, Laplace 1774, Gigerenzer–Hoffrage 1995.
- **Shortest Paths** (`#/visualizer/pathfinding`) — draw a maze, compare Dijkstra, A*,
  and BFS over it. Dijkstra 1959, Hart–Nilsson–Raphael 1968, CLRS.
- **Quicksort** (`#/visualizer/quicksort`) — Hoare's partition, streamed. Hoare 1961/62.
- **Merge Sort** (`#/visualizer/mergesort`) — doubling runs and the n log n guarantee.
  Knuth §5.2.4, CLRS §2.3.

## Getting Started

```bash
npm install
npm start          # dev server at http://localhost:5173
```

### Scripts

| Script            | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm start` / `npm run dev` | Run the Vite dev server            |
| `npm run build`   | Production build into `dist/`                |
| `npm run preview` | Serve the production build locally           |
| `npm test`        | Run the test suite (Vitest) in watch mode    |
| `npm run test:run`| Run the test suite once                      |
| `npm run deploy`  | Build and publish `dist/` to GitHub Pages    |

## Architecture

```
src/
├── styles/theme.css       # Design tokens (paper/ink palette, type, provenance colors)
├── routes.jsx             # Route table (hash routing for GitHub Pages)
├── App.jsx                # Layout shell: floating nav + outlet + footer
├── site/                  # Home, Blog, FloatingNav, Footer
├── catalog/               # Site-level registry of visualizations by domain
├── pages/                 # Catalog index + the generic /visualizer/:id page
├── visualizations/
│   ├── provenance.js      # Shared provenance classes (paper/theorem/modern/pedagogical)
│   ├── evidence/          # Shared chips, caveats, and references components
│   ├── player/            # TraceInstrument: steps, streams, deep links, KaTeX lines
│   ├── protocol/ sorting/ # Shared stages (multi-actor lane, bar arrays)
│   ├── scene3d/           # Phase 3 shell + pure scene geometry (lazy three.js)
│   ├── registry.js        # defineVisualization; index.js registers everything
│   └── rsa/ dh/ vigenere/ sieve/ bayes/ pathfinding/ quicksort/ mergesort/
│                          # One directory per visualization: math|model, sources,
│                          # trace, Visualizer, tests (see docs/CONTRACTS.md)
└── docs/CONTRACTS.md      # The visualization contracts (steps, streams, 3D rules)
```

### The evidence gate

Adapted from evidence-based reconstruction projects: a visualization's trace steps must
each resolve at least one citation in its sources file, or the test suite fails
(`src/visualizations/evidence-gate.test.js` runs over the whole registry). Provenance
classes — `paper`, `theorem`,
`modern`, `pedagogical` — are rendered in the UI, not just stored.

### Adding a visualization

One directory under `src/visualizations/<id>/` (math, sources, trace, Visualizer,
tests), one `defineVisualization` registration, one catalog card — the full checklist
lives in [docs/CONTRACTS.md](docs/CONTRACTS.md). The central evidence gate refuses
anything uncited.
