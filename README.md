# Algorithm Visualizer

Interactive, **evidence-cited** visualizations of famous algorithms — built with
[React](https://react.dev/) and [Vite](https://vitejs.dev/).

Pick an algorithm, feed it your own inputs, and step through a rendering in which
**every step cites its source** — the original paper, the underlying theorem, or the
modern standard — with labeled provenance whenever the visualization simplifies for
teaching. See [ROADMAP.md](ROADMAP.md) for the multi-phase plan.

**Live now**

- **RSA Encryption** (`#/visualizer/rsa`) — key generation, encryption, and decryption
  on your own message and primes, with square-and-multiply and extended-Euclid worked
  in full, cited to Rivest–Shamir–Adleman (1978), Euler (1763), RFC 8017, and more.
- **Dijkstra's Algorithm** (`#/visualizer/pathfinding`) — draw walls on a grid and watch
  the search sweep to the shortest path.

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
├── pages/                 # One page per route (catalog index, pathfinding, RSA)
├── visualizations/
│   └── rsa/
│       ├── math.js        # Pure BigInt number theory (unit tested)
│       ├── sources.js     # Citation database + provenance classes
│       ├── trace.js       # buildRsaTrace(inputs) → steps with citations
│       ├── RsaVisualizer  # Step player, protocol lane diagram, references
│       └── *.test.js      # Math tests + the evidence gate
├── engine/                # Reusable grid engine (grid model, runner, animator)
├── algorithms/            # Pluggable grid algorithms (Dijkstra; registry)
└── components/            # Grid visualizer + node cell
```

### The evidence gate

Adapted from evidence-based reconstruction projects: a visualization's trace steps must
each resolve at least one citation in its sources file, or the test suite fails
(`src/visualizations/rsa/trace.test.js`). Provenance classes — `paper`, `theorem`,
`modern`, `pedagogical` — are rendered in the UI, not just stored.

### Adding a grid algorithm

Create `src/algorithms/<name>.js` exporting `{ id, name, description, run(grid, start,
finish) }` and register it in `src/algorithms/index.js`; it appears in the pathfinding
dropdown automatically. (Phase 2 unifies this registry with the site catalog — see the
roadmap.)
