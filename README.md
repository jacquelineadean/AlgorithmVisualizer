# Algorithm Visualizer

Interactive, **evidence-cited** visualizations of famous algorithms — built with
[React](https://react.dev/) and [Vite](https://vitejs.dev/).

Pick an algorithm, feed it your own inputs, and step through a rendering in which
**every step cites its source** — the original paper, the underlying theorem, or the
modern standard — with labeled provenance whenever the visualization simplifies for
teaching. See [ROADMAP.md](ROADMAP.md) for the multi-phase plan.

**Live now** — 28 visualizations across eight domains, every step (and every architecture
node) cited:

**Cryptography** — RSA (`#/visualizer/rsa`, with an optional 3D mod-n helix) · Diffie–Hellman ·
Vigenère · SHA-256, a complete implementation checked against FIPS 180-4's own test vectors.

**Graphs & pathfinding** — Dijkstra / A* / BFS over a maze you draw · PageRank on an editable
link graph.

**Sorting & order** — quicksort's partition and merge sort's doubling runs, both streamed.

**Numbers & primes** — the sieve of Eratosthenes · Euclid's algorithm, drawn as the square
tiling Euclid actually described.

**Statistics & probability** — Bayes' rule · the central limit theorem · Monte Carlo π ·
Markov chains · least squares as a projection.

**AI & machine learning** — k-means · the perceptron · backpropagation on a nine-parameter
network (gradients checked against finite differences) · attention internals · and three
**drill-down architecture maps**: the transformer stack, the LLM inference pipeline, and the
training loop.

**Distributed systems** — Raft, with a partition you can watch it refuse to commit through ·
consistent hashing · MapReduce · the CAP theorem.

**Methodologies** — Huffman coding · Fourier epicycles.

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
│   ├── drilldown/         # DrilldownInstrument: breadcrumb zoom over cited node trees
│   ├── stages/            # Shared PlotStage · GraphStage · MatrixStage
│   ├── protocol/ sorting/ # Shared stages (multi-actor lane, bar arrays)
│   ├── scene3d/           # Phase 3 shell + pure scene geometry (lazy three.js)
│   ├── registry.js        # defineVisualization; index.js registers everything
│   └── <id>/              # One directory per visualization: math|model, sources,
│                          # trace (or map), Visualizer, tests — see docs/CONTRACTS.md
└── docs/CONTRACTS.md      # The visualization contracts (steps, streams, maps, 3D rules)
```

### The evidence gate

Adapted from evidence-based reconstruction projects: every trace step — and every node of
every architecture map — must resolve at least one citation in its sources file, or the test
suite fails (`src/visualizations/evidence-gate.test.js` runs over the whole registry).
Provenance classes — `paper`, `theorem`, `modern`, `pedagogical` — are rendered in the UI, not
just stored. A companion suite (`src/pages/live-entries.test.jsx`) renders every live catalog
card through the router, because a correct model and a page that crashes on mount are
different failures.

Where a page states a number — a parameter count, a KV-cache size, a mistake bound, a
compression ratio — that number is computed by a pure module and pinned by a test against the
published value, not typed into prose.

### Adding a visualization

One directory under `src/visualizations/<id>/` (math, sources, trace *or* map, Visualizer,
tests), one `defineVisualization` registration, one catalog card — the full checklist lives in
[docs/CONTRACTS.md](docs/CONTRACTS.md). The central evidence gate refuses anything uncited.
