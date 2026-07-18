# Roadmap — Algorithm Visualizer

**Vision:** an interactive visualization atlas for the famous algorithms, methodologies, and
software architectures of mathematics, computer science, cryptography, statistics, and AI/ML —
where the user picks an algorithm and explores a stepped, interactive rendering in which
**every step cites its source** (the original paper, theorem, RFC, or textbook).

Two references anchor the product:

- **Flow — [Tekton](https://github.com/tangxiya-star/Tekton):** select a model → interactive
  rendering driven by a cited evidence corpus. Nothing renders without a source; provenance is
  a first-class, color-coded layer the user can toggle. We adapt this from architecture to
  algorithms: every visualization is generated from a *trace* whose steps carry citations and
  a provenance class.
- **Design — [thinkingmachines.ai](https://thinkingmachines.ai/):** warm paper background,
  editorial serif display type over sans-serif UI, letterspaced caps wordmark, cobalt/green/
  vermilion accents, organic shapes, pill buttons, generous whitespace. Academic but friendly.

---

## Experience pillars

1. **Select** — a catalog of algorithms grouped by domain (Cryptography, Graphs & Pathfinding,
   Sorting & Order, Numbers & Primes, Statistics & Probability, AI & Machine Learning,
   Distributed Systems & Architectures).
2. **Interact** — each algorithm page is a live instrument, not a video: the user supplies
   inputs (a message, primes, an array, a graph), scrubs a step player, and inspects any
   intermediate value.
3. **Evidence** — each step displays provenance chips linking to a sources panel. Provenance
   classes (adapted from Tekton's measured / rule-derived / reconstruction / conjecture):
   - `paper` — taken directly from the primary source (e.g. RSA 1978, CACM).
   - `theorem` — the mathematical bedrock (e.g. Euler's theorem).
   - `modern-practice` — how it is done today (e.g. RFC 8017, NIST recommendations).
   - `pedagogical` — a simplification made for teaching (e.g. toy primes), always labeled.

## Information architecture

```
/                     Home — hero, domain overview, featured visualizations
/visualizer           Catalog — cards by domain (live + planned entries)
/visualizer/:id       One visualization (e.g. /visualizer/rsa, /visualizer/pathfinding)
/blog                 Notes on the project & how each visualization was sourced
/blog/:slug           A post
GitHub                External link in nav (repo)
```

Client-side routing uses hash URLs so deep links work on GitHub Pages without server rewrites.

## Core architecture (established in Phase 1, formalized in Phase 2)

```
catalog/        Site-level registry: {id, name, domain, year, authors, status, route}
visualizations/<id>/
  math|model    Pure, dependency-free computation (BigInt where needed) — unit tested
  trace         buildTrace(inputs) → { steps[], artifacts } ; each step: {id, phase,
                title, explanation, values, provenance, sourceRefs[] }
  sources       Citation database for the algorithm: {key, authors, title, venue, year, url}
  Visualizer    React component: step player + diagrams, driven only by the trace
engine/         (existing) grid/run/animator for grid-based algorithms
```

**The evidence gate:** a unit test asserts every trace step resolves at least one valid
`sourceRef` — the CI translation of Tekton's "the build fails if verification fails."

---

## Phases

### Phase 1 — MVP / Prototype (this iteration) ✅

Goal: transform the single-page tool into a small site with the design system, and ship one
flagship evidence-cited visualization: **RSA public-key encryption**.

Deliverables:
- Design system (`styles/theme.css`): paper/ink palette, Newsreader serif + Inter sans +
  IBM Plex Mono, pill buttons, hairline cards.
- Floating pill nav (Home, Visualizer, Blog, GitHub) + footer; hash routing.
- Home page: hero with organic-shape composition, stat row, domain grid.
- Catalog page listing live + planned visualizations by domain.
- Existing pathfinding visualizer preserved at `/visualizer/pathfinding`.
- **RSA visualization** at `/visualizer/rsa`:
  - Inputs: message, primes p and q, public exponent e (validated live).
  - Step player across three acts — key generation (with extended-Euclid table for d),
    encryption (square-and-multiply), decryption + why-it-works (Euler).
  - Protocol lane diagram (Alice / public channel + Eve / Bob) animated per step.
  - Evidence panel: provenance chips per step; sources include Rivest–Shamir–Adleman 1978,
    Diffie–Hellman 1976, Euler 1763, Knuth TAOCP §4.6.3, RFC 8017, NIST SP 800-57.
  - Evidence gate test + BigInt math unit tests (keygen, encrypt/decrypt round-trip, EGCD).
- Blog with one seed post explaining the evidence-first approach.
- Updated README + this roadmap.

Acceptance: all tests pass; home, catalog, pathfinding, RSA, and blog pages verified in the
browser; RSA round-trip correct for arbitrary printable-ASCII messages and valid prime pairs.

### Phase 2 — Visualization platform

Goal: turn the RSA page's patterns into contracts every future visualization implements.

- Formalize `buildTrace` / step player / renderer interfaces; extract a shared `<StepPlayer>`,
  `<EvidencePanel>`, `<ProvenanceChip>`, `<ValueInspector>` component kit.
- Migrate pathfinding onto the trace model (unifying `algorithms/` with `visualizations/`).
- Keyboard controls (←/→/space), autoplay speeds, shareable state deep links
  (inputs serialized in the URL), mobile layout pass.
- Math typesetting (KaTeX) for formula-heavy steps.
- Blog on MDX; per-visualization "how this was sourced" posts.
- New visualizations to pressure-test the contracts:
  - Cryptography: Diffie–Hellman key exchange, Caesar/Vigenère (warm-up), SHA-256 rounds.
  - Graphs: A*, BFS/DFS on the existing grid engine.
  - Sorting: quicksort, merge sort, heapsort with comparison counters.
- Evidence gate becomes a shared test utility applied to every registered visualization.

### Phase 3 — Interactive 3D renderings (the Tekton dimension)

Goal: add a 3D renderer tier (React Three Fiber + drei, Zustand for viewer state) for
algorithms where space genuinely adds insight — with the same trace/evidence contract, plus
Tekton-style construction scrubbing and orbit/walk cameras.

- 3D scene shell: camera modes, scrub timeline, provenance color overlay toggle.
- Candidates chosen because 3D earns its complexity:
  - Sorting networks in 3D (comparators as gates in space).
  - Gradient descent on loss surfaces (statistics/ML bridge).
  - k-d trees / octrees (spatial partitioning).
  - Lattice-based crypto intuition (LLL reduction on 3D lattices).
  - RSA upgrade: modular exponentiation on a 3D helix ("clock arithmetic" as a spiral).
- Performance budget: code-split three.js per page; 2D pages stay dependency-light.

### Phase 4 — Domain build-out: AI/ML, statistics, distributed architectures

Goal: breadth. Each entry ships on the Phase-2 contracts (2D) or Phase-3 renderer (3D).

- AI/ML: transformer attention (heads as interactive matrices), backpropagation,
  k-means, decision trees / random forests, perceptron → MLP evolution.
- Statistics: central limit theorem sampler, Bayes' theorem updater, Markov chains,
  Monte Carlo estimation (π by darts), regression as projection.
- Numbers & primes: sieve of Eratosthenes, Euclid's algorithm (standalone), Miller–Rabin.
- Distributed systems & architectures: Raft consensus (leader election + log replication),
  MapReduce, consistent hashing, CAP trade-off explorer, load-balancer strategies.
- Methodologies: Fourier transform (epicycles), PageRank, Huffman coding, RSA signatures.

### Phase 5 — Platform polish & community

- Search + filtering across the catalog; guided tours ("crypto in 5 visualizations").
- Contribution pipeline: a documented spec so others can add a visualization by PR
  (catalog entry + trace + sources + evidence-gate test = mergeable).
- Accessibility audit (keyboard-only operation, reduced-motion paths, contrast).
- Performance: per-route code splitting, Lighthouse budget in CI.
- SEO/SSG evaluation (prerender or migrate shell to SSG if search visibility matters).
- Optional: saved states/galleries, embeds for teachers, analytics.

---

## Algorithm backlog by domain

| Domain | Live | Next up | Later |
| --- | --- | --- | --- |
| Cryptography | RSA | Diffie–Hellman, SHA-256, Vigenère | AES rounds, elliptic curves, lattices/LLL |
| Graphs & pathfinding | Dijkstra | A*, BFS/DFS | Bellman–Ford, max-flow, MST |
| Sorting & order | — | Quicksort, merge sort | Heapsort, radix, sorting networks (3D) |
| Numbers & primes | — | Euclid, sieve of Eratosthenes | Miller–Rabin, Karatsuba, FFT multiply |
| Statistics & probability | — | CLT, Monte Carlo π | Bayes updater, Markov chains, regression |
| AI & machine learning | — | k-means, perceptron | Attention, backprop, decision trees |
| Distributed & architectures | — | Raft, consistent hashing | MapReduce, CAP explorer, load balancing |
| Methodologies | — | Huffman, PageRank | Fourier epicycles, simplex, RSA signatures |

## Standing decisions

- **Stack:** React 19 + Vite; react-router (hash) for pages; vitest. Three.js/R3F deferred to
  Phase 3 and code-split. No CSS framework — the theme is small and bespoke.
- **Math:** BigInt for all number theory; pure modules, no UI imports, fully unit-tested.
- **Evidence-first rule:** a visualization cannot register in the catalog without a sources
  file and passing evidence gate. Provenance classes are rendered, not just stored.
- **Design tokens** live in `src/styles/theme.css`; pages consume variables only.
- **Deploys:** GitHub Pages via `npm run deploy` (hash routing keeps deep links working).

## Risks & mitigations

- **Scope creep per algorithm** — the trace contract caps ambition: ship steps + evidence
  first, exotic diagrams second.
- **3D performance on low-end devices** — Phase 3 gates on code-splitting and a 2D fallback.
- **Citation accuracy** — sources restricted to primary literature and standards the
  maintainer has verified; the blog documents sourcing per visualization.
- **Toy-parameter misconceptions** — every simplification is labeled `pedagogical` in the UI
  with a note on real-world parameters (e.g. 2048-bit moduli, OAEP padding).
