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
- **Design — [thinkingmachines.ai](https://thinkingmachines.ai/):** warm paper, editorial serif
  display over sans UI, hairline cards, generous whitespace. Since the Phase 1 differentiation
  update the site carries its own identity on top of that foundation — the hero graphic is a
  live algorithm (Bayes' rule), not borrowed decoration.

---

## Experience pillars

1. **Select** — a catalog of algorithms grouped by domain (Cryptography, Graphs & Pathfinding,
   Sorting & Order, Statistics & Probability, AI & Machine Learning, Distributed Systems).
2. **Interact** — each algorithm page is a live instrument, not a video: the user supplies
   inputs (a message, primes, sliders, a graph), scrubs a step player, and inspects any
   intermediate value.
3. **Evidence** — each step displays provenance chips linking to a sources panel. Provenance
   classes (adapted from Tekton's measured / rule-derived / reconstruction / conjecture):
   - `paper` — taken directly from the primary source (e.g. RSA 1978, Bayes 1763).
   - `theorem` — the mathematical bedrock (e.g. Euler's theorem, the product rule).
   - `modern-practice` — how it is done today (e.g. RFC 8017, NIST recommendations).
   - `pedagogical` — a simplification made for teaching (e.g. toy primes), always labeled.

## Information architecture

```
/                     Home — live-algorithm hero, stats, domain overview
/visualizer           Catalog — cards by domain (live + planned entries)
/visualizer/:id       One visualization (rsa, bayes, pathfinding, …)
/blog                 Notes on the project & how each visualization was sourced
/blog/:slug           A post
GitHub                External link in nav (repo)
```

Client-side routing uses hash URLs so deep links work on GitHub Pages without server rewrites.

## Core architecture (today)

```
catalog/                  Site-level registry: {id, name, domain, year, authors, status, route}
visualizations/
  provenance.js           Shared provenance classes
  evidence/               Shared evidence UI: chips, caveats, references (all pages)
  <id>/
    math|model            Pure, dependency-free computation (BigInt where needed) — unit tested
    sources.js            Citation database: {key, authors, title, venue, year, url}
    trace.js              buildTrace(inputs) → { steps[], artifacts }; each step:
                          {id, title, provenance, sourceRefs[], explanation, caveat?, kind, data}
    Visualizer            React component: step player + stage diagrams, driven only by the trace
  player/                 Shared TraceInstrument (steps, streams, deep links, KaTeX lines)
  protocol/ · sorting/    Shared stages (multi-actor lane; bar arrays)
  scene3d/                Phase 3 shell + pure scene geometry (lazy-loaded with three.js)
  registry.js · index.js  defineVisualization + central registration
```

**The evidence gate:** one suite iterates the registry and builds every visualization's
gate fixtures — any step or caveat without a resolvable citation and a declared provenance
class fails the build. The CI translation of Tekton's "the build fails if verification
fails"; registering a visualization *is* opting in.

## How this roadmap ships

- This is a living document: phases are built out in detail below, and their checklists are
  updated as work lands. Completed items keep their record (see Phase 1) rather than being
  deleted.
- Work ships as small PRs, each green on the full gate: unit tests + evidence gates + a
  browser walkthrough of affected pages + production build.
- Sequencing rationale: **contracts before breadth** (Phase 2 exists so Phases 3–4 don't
  produce N divergent copies of the step player), **renderers before the entries that need
  them** (Phase 3's 3D shell and Phase 4's drill-down contract precede their catalogs), and
  **breadth before community** (Phase 5's contributors need settled patterns to copy).
- Sizing: S ≈ a focused session, M ≈ one to two sessions, L ≈ several sessions. Estimates,
  not commitments.

## Phase overview

| Phase | Theme | Status | Exit condition |
| --- | --- | --- | --- |
| 1 | MVP, identity, first three cited visualizations | ✅ Shipped 2026-07-18 (PRs #2, #3) | RSA + Bayes + Dijkstra live under the evidence rule |
| 2 | Platform contracts & 2D breadth | ✅ Complete (2026-07-19) — exit met: 8 live, one shared player, zero per-page boilerplate | A new 2D visualization is a content-only PR; 8+ live |
| 3 | 3D renderer tier | Started (2026-07-19) — 3a shell + RSA helix | 3D pages ship under the same trace + evidence contract |
| 4 | Domain build-out + AI architecture explorer | Planned | Every domain ≥ 2 live; drill-down maps live; 20+ live |
| 5 | Polish, performance, community | Planned | External contribution lands without maintainer surgery |

---

## Phase 1 — MVP / Prototype ✅ (shipped 2026-07-18)

Goal: transform the single-page tool into a small site with the design system, and ship one
flagship evidence-cited visualization: **RSA public-key encryption**.

Shipped:
- Design system (`styles/theme.css`): paper/ink palette, Newsreader serif + Inter sans +
  IBM Plex Mono, pill buttons, hairline cards.
- Floating pill nav (Home, Visualizer, Blog, GitHub) + footer; hash routing.
- Home page, catalog page (live + planned cards by domain), blog with seed post.
- **RSA visualization**: message/prime/exponent inputs, 13-step player in three acts,
  extended-Euclid and square-and-multiply worked in full, animated Alice/Eve/Bob protocol
  lane, citations to RSA 1978, Diffie–Hellman 1976, Euler 1763, Knuth, RFC 8017,
  NIST SP 800-57, Katz–Lindell; evidence gate + BigInt unit tests.

**Differentiation update (also shipped in-phase):**
- Hero replaced with a live Bayes-rule animation (population → prior → test → posterior);
  asymmetric two-column hero layout; reduced-motion fallback.
- **Bayes' rule shipped early** (pulled forward from Phase 4): 1,000-person natural-frequency
  grid, prevalence/sensitivity/false-positive sliders, 7-step cited trace (Bayes 1763,
  Laplace 1774, Kolmogorov 1933, Gigerenzer–Hoffrage 1995, Eddy 1982), own evidence gate.
- Shared evidence kit extracted (`visualizations/evidence/`, `provenance.js`).
- Dijkstra page gained a cited evidence section (Dijkstra 1959; CLRS §22.3), simplifications
  labeled `pedagogical`.

**What Phase 1 taught us (inputs to Phase 2):**
- RSA and Bayes each hand-rolled a step player, player controls, and detail-card kinds —
  that duplication is exactly what Phase 2's contracts must absorb.
- The protocol lane (multi-actor + channel) wants to be a shared stage: Diffie–Hellman and
  Raft are the same shape with different actors and tokens.
- The grid engine's thousand-event animations don't fit the 13-step trace shape — the trace
  contract needs a streamed-event channel (designed in 2b).

---

## Phase 2 — Visualization platform (contracts & 2D breadth)

**Objective:** turn the patterns RSA and Bayes duplicate into typed contracts and a shared
component kit, so that a new 2D visualization is *content* — a trace, a sources file, and a
stage — rather than an app. Prove it by shipping five new entries on the contracts.

> **Progress (2026-07-18):** 2a shipped — `docs/CONTRACTS.md`, `<TraceInstrument>` with
> built-in detail kinds, `<ProtocolStage>`, `defineVisualization` registry, the generic
> `/visualizer/:id` page, the central evidence-gate suite, and the shared modular-math lib;
> RSA and Bayes migrated with no visible change. **Diffie–Hellman shipped from 2d as the
> contract proof** — its diff touches only `src/visualizations/dh/` plus one catalog entry.
>
> **Progress (2026-07-19):** 2c shipped — inputs + step serialize to the hash query with
> validated fallback, single write point in the instrument, Copy-link button; restore is
> tested. **2b's stream channel shipped and was prototyped on sorting as planned** —
> `step.stream {events, tick, batch}`, stage folds via `applyEvents`, Next completes a
> running stream, autoplay waits; **quicksort and merge sort shipped from 2d** on the shared
> `BarsStage` (6 live total).
>
> **Phase 2 complete (2026-07-19):** 2b finished — the grid engine and `algorithms/`
> registry were replaced by `visualizations/pathfinding/` (event-recording Dijkstra, A*,
> and BFS with per-algorithm cited traces, wall painting on the stage, scatter/clear
> controls); the old `engine/`, `algorithms/`, and `components/` trees are deleted and
> every visualization renders through the shared instrument. 2d finished — Vigenère
> (classic ATTACK AT DAWN / LEMON example; Vigenère 1586, Shannon 1949, Katz–Lindell) and
> the sieve of Eratosthenes (Horsley 1772, O'Neill 2009) are live; KaTeX renders TeX
> formula lines lazily (Bayes' posterior is the first consumer); the blog runs on MDX with
> a "how RSA was sourced" post. 2e shipped — focus-visible states, coarse-pointer touch
> targets, player wrap at 375 px, and reduced-motion users get streamed steps' final state
> immediately. **Exit criteria met: 8 live visualizations, one shared player, zero
> per-page boilerplate; adding an entry touches only its directory + a catalog card.**

### 2a. Contracts & component kit (M) ✅

- Write `docs/CONTRACTS.md` specifying, with examples from RSA/Bayes:
  - `Step` = `{id, act?, title, provenance, sourceRefs[], explanation, caveat?, kind, data}`
  - `Trace` = `{steps[], artifacts}`; sources module shape; catalog registration shape.
  - `defineVisualization({id, buildTrace, sources, Stage, detailKinds, Controls})` — one
    object per visualization; a generic route component renders any registered entry
    (deletes `RsaPage`/`BayesPage` boilerplate).
- Extract shared components from the two existing implementations:
  - `<StepPlayer>` — step list (with optional act grouping), prev/next/play, progress rail,
    arrow-key navigation with the modifier/input guards, autoplay with end-stop.
  - `<StepDetail>` — built-in kind renderers (`values`, `formula`, `blocks`, `table`) plus a
    per-visualization `detailKinds` map for custom kinds (RSA's `egcd`/`sqmul` become custom
    kinds registered this way).
  - `<ControlsCard>` — labeled inputs/selects/sliders with the shared styling.
  - Generalize the RSA lane into `<ProtocolStage>` (configurable actors, channel,
    eavesdropper, tokens) so Diffie–Hellman and later Raft reuse it.
- Shared evidence-gate utility: `assertEvidenceGate(buildTrace, fixtures, SOURCES)`; one suite
  iterates the registry so an unregistered or uncited visualization cannot ship.
- Migrate RSA and Bayes onto the kit with **zero visible change** (existing tests keep
  passing; before/after browser walkthrough).

### 2b. Streamed steps & the pathfinding migration (M)

- Extend the contract with an optional per-step event stream:
  `step.stream = {events[], tick}` — the stage animates events *within* a step (e.g. "settle
  the frontier" streams hundreds of visits), while the step list stays a readable handful of
  cited macro-steps (initialize → settle/relax loop → terminate → reconstruct path).
- Prototype the stream channel on **sorting** first (fresh code, no legacy), then migrate the
  grid engine to emit macro-steps + streams; the existing animator becomes the stream player.
- Pathfinding upgrades once migrated: weighted terrain brush, a live priority-queue/frontier
  inspector panel, and per-algorithm citations (Dijkstra 1959; A* — Hart–Nilsson–Raphael
  1968; BFS — Moore 1959 / CLRS).

### 2c. Deep links & shareable state (S)

- Serialize inputs and step into the hash query: `#/visualizer/rsa?p=61&q=53&e=17&m=HELLO&s=5`;
  parse-and-validate on load with graceful fallback to defaults; "Copy link to this step"
  button in the player.

### 2d. Content: five new visualizations + typesetting (L)

Each ships as a content-only PR on the 2a contracts — that is the acceptance test:

| Entry | Stage | Anchor sources |
| --- | --- | --- |
| Diffie–Hellman key exchange | `<ProtocolStage>` (Alice/Bob/Eve, color-mixing metaphor optional) | Diffie & Hellman 1976; RFC 3526 groups |
| Vigenère cipher (warm-up) | Tableau stage + keyword slider | Vigenère 1586; Kasiski 1863 (breaking it) |
| Quicksort | Bar-array stage with stream channel, comparison/swap counters | Hoare, CACM 1961 & Computer J. 1962 |
| Merge sort | Same bar-array stage, side-by-side race mode with quicksort | von Neumann 1945 via Knuth §5.2.4 |
| Sieve of Eratosthenes | Number-grid stage (reuses dot-grid patterns) | Nicomachus, *Introduction to Arithmetic* (trans.); modern number-theory text |

- KaTeX for formula-heavy steps, lazy-loaded only on pages that declare it.
- Blog to MDX; publish "how this was sourced" posts for RSA and Bayes using a shared template.

### 2e. Mobile & accessibility pass (S)

- Step player fully usable at 375 px; touch targets ≥ 44 px; visible focus states everywhere;
  `aria-live` announcement of step changes; reduced-motion audit of all stages.

**Acceptance criteria**
- Adding a visualization touches only `src/visualizations/<id>/` + one catalog entry —
  demonstrated by Diffie–Hellman shipping exactly that way.
- RSA/Bayes migration produces no visual or behavioral diff; full suite green throughout.
- Every registered visualization passes the shared evidence gate automatically.
- Any configuration is reachable by URL; pasted links restore inputs + step.
- Lighthouse accessibility ≥ 95 on all pages.

**Risks**
- *Over-abstraction:* extract only what two shipped visualizations already duplicate — no
  speculative options. New needs (e.g. Raft's multi-node lane) wait until a second consumer.
- *Stream-channel design:* prototyped on sorting before the riskier grid-engine migration.

**Exit:** 8+ visualizations live, one shared player, zero per-page boilerplate.

---

## Phase 3 — Interactive 3D renderings (the Tekton dimension)

**Objective:** add a 3D renderer tier — React Three Fiber + drei, Zustand for viewer state —
with Tekton-style construction scrubbing, used *only* where space genuinely adds insight, and
governed by the same trace + evidence contract as 2D.

> **Progress (2026-07-19):** 3a shipped in first form — `Scene3D` shell (R3F + drei orbit
> camera, paper-world lighting, error-boundary fallback for WebGL-less browsers) and the
> **RSA mod-n helix**: square-and-multiply rendered as clock arithmetic on a spiral, with a
> provenance overlay (hops = `paper`, the clock ring = `pedagogical`). All of three.js is
> code-split behind the "3D helix" toggle — 2D routes ship zero 3D bytes — and the helix
> geometry is recomputed from trace rows in unit tests (positions at angle 2π·v/n, one
> pitch per iteration). Remaining in 3a: scrub-timeline binding and walk mode; 3b's
> dedicated scenes and 3c's Playwright screenshots are untouched.

### 3a. Scene shell (M)

- `<Scene3D>` wrapper: orbit camera (walk mode optional later), paper-world lighting and
  materials derived from the theme tokens, scrub timeline bound to trace steps, and a
  **provenance overlay mode** — color every element by its provenance class, the direct
  Tekton homage.
- Performance budget enforced structurally: three.js code-split per route (2D routes' bundles
  unchanged), a static poster fallback for `prefers-reduced-motion` and low-power devices.
- Rule inherited from the evidence gate: **no decorative geometry** — every mesh derives from
  a trace artifact; scenes are generated, not hand-modeled.

### 3b. Candidate scenes (L, in order)

| Entry | Why 3D earns it | Anchor sources |
| --- | --- | --- |
| Sorting networks | Comparators as gates in space; depth *is* parallel time | Batcher 1968; Knuth §5.3.4 |
| Gradient descent on loss surfaces | The surface is the object; trajectories need elevation | Cauchy 1847; Polyak 1964 (momentum); Robbins–Monro 1951 |
| k-d trees / octrees | Spatial partitions are literally spatial | Bentley 1975 |
| RSA mod-n helix (upgrade toggle on the existing page) | Clock arithmetic as a spiral makes exponentiation hops legible | RSA 1978; Knuth §4.6.3 |
| Lattice intuition / LLL (stretch, feeds post-quantum content) | Lattices in 2D undersell the geometry | Lenstra–Lenstra–Lovász 1982 |

### 3c. Verification for 3D (S)

- Geometry assertions in unit tests: element positions recomputed from the trace, never
  hand-placed constants — the Tekton verifier discipline applied to scenes.
- Add Playwright for screenshot smoke tests of 3D routes (enters the toolchain here, reused
  by Phase 5 CI).

**Acceptance criteria**
- 2D-route bundles within ±5 KB of pre-Phase-3 sizes; 3D pages interactive at 60 fps on a
  recent laptop, degrading gracefully.
- Provenance overlay works in every scene; every mesh traceable to an artifact.
- Reduced-motion users get a complete non-animated reading path.

**Exit:** at least two 3D visualizations live on the shared scene shell.

---

## Phase 4 — Domain build-out + the AI architecture explorer

**Objective:** breadth across every domain — led by the **AI architecture explorer**, a third
renderer tier for systems that are *architectures*, not step sequences.

### 4a. DrilldownDiagram contract (M, designed first)

- Node schema: `{id, title, summary, provenance, sourceRefs[], children?, stage?}` — a node
  either drills into children or opens a focused stage (a small live diagram/matrix).
- Interaction: breadcrumb zoom, keyboard navigation, per-node evidence panel, deep-linkable
  node paths (`#/visualizer/llm-inference?node=decode.kv-cache`).
- **The evidence gate applies per node**, not just per step: an uncited component fails CI.
- Built as 2D SVG/HTML — drill-down is an information architecture, not a 3D problem.

### 4b. AI architecture explorer entries (L)

| Entry | Drill path (illustrative) | Anchor sources |
| --- | --- | --- |
| Transformer Architecture Map | model → block → attention → head → QKᵀ/√d → softmax → ΣV; MLP; residual stream; unembedding | Vaswani et al. 2017; Ba et al. 2016 (LayerNorm); He et al. 2015 (residuals) |
| LLM Inference Pipeline | request → tokenize → **prefill** (parallel attention, KV-cache build) → **decode** (autoregressive against the cache) → sampling (temperature/top-p) → detokenize; serving zoom: continuous batching, paged KV cache, speculative decoding | Vaswani et al. 2017; Pope et al. 2022; Yu et al. 2022 (Orca); Kwon et al. 2023 (PagedAttention); Leviathan et al. 2023 |
| Training Loop Map | data pipeline → forward → loss → backward → optimizer step; parallelism overlay (data/tensor/pipeline) | Rumelhart–Hinton–Williams 1986; Shoeybi et al. 2019 (Megatron-LM) |

Small live stages inside nodes where they teach (an attention head computing real weights on
a toy sentence; a KV cache filling as tokens decode; a batch scheduler packing requests).

### 4c. Statistics & probability (M)

| Entry | Stage | Anchor sources |
| --- | --- | --- |
| Central Limit Theorem | Pick a population (uniform/exponential/bimodal), watch sample-mean histograms converge | Laplace 1810; Lindeberg 1922 |
| Monte Carlo π | Darts + running estimate with ~1/√n error band | Metropolis & Ulam 1949 |
| Markov chains | Editable transition graph → stationary distribution | Markov 1906 |
| Regression as projection | Least squares as geometry | Legendre 1805; Gauss 1809 |

### 4d. AI/ML classics (M)

k-means (Lloyd 1957/1982), perceptron (Rosenblatt 1958), backprop on a tiny MLP
(Rumelhart–Hinton–Williams 1986), attention internals (shares components with 4b), decision
trees (Breiman et al. 1984). Gradient descent's 3D surface lands in Phase 3.

### 4e. Distributed systems (M–L)

| Entry | Stage | Anchor sources |
| --- | --- | --- |
| Raft consensus | Multi-node `<ProtocolStage>`: leader election + log replication, with partition/failure injection buttons | Ongaro & Ousterhout 2014 |
| Consistent hashing | Key ring; add/remove nodes and watch the moved-key fraction | Karger et al. 1997 |
| MapReduce | Job flow map (drill-down contract reuse) | Dean & Ghemawat 2004 |
| CAP explorer | Interactive partition scenarios | Brewer 2000; Gilbert & Lynch 2002 |

### 4f. Methodologies & numbers (M)

Huffman coding (Huffman 1952), PageRank as power iteration on an editable graph
(Brin & Page 1998), Euclid's algorithm standalone (Euclid, *Elements* VII — Heath trans.;
Knuth §4.5.2), SHA-256 rounds (NIST FIPS 180-4), Fourier epicycles (Fourier 1822).

**Acceptance criteria**
- Every domain has ≥ 2 live entries; 20+ live total; each new entry flips its catalog card
  planned → live with sources + gate in the same PR.
- Drill-down maps pass the per-node evidence gate and are deep-linkable to any node.
- The two priority maps (4b: transformer, inference pipeline) ship before the long tail.

**Exit:** the catalog reads as an atlas, and the AI systems story — architecture, inference
with prefill/decode, training — is fully explorable with citations.

---

## Phase 5 — Platform polish & community

**Objective:** make the atlas fast, findable, accessible, and contributable — the phase where
the project stops being a solo artifact.

### 5a. Discovery (M)

- Catalog search + filters (domain, era, status, source); keyboard palette optional.
- Guided tours as curated step sequences with progress ("Crypto in five visualizations",
  "Statistics against intuition", "How an LLM serves a request").

### 5b. Contribution pipeline (M)

- `docs/CONTRIBUTING-VISUALIZATIONS.md`: the contract checklist (trace + sources + stage +
  gate + catalog card) with a reference PR linked as the template.
- PR template with an evidence checklist; CI (GitHub Actions) running tests, evidence gates,
  build, and Lighthouse budgets on every PR; auto-deploy master to GitHub Pages, replacing
  the manual `npm run deploy`.
- Source-quality bar documented: primary literature or standards, verified by a maintainer;
  the blog documents sourcing per visualization.

### 5c. Performance (S–M)

- Route-level code splitting (`React.lazy` per visualization); budgets enforced in CI
  (core ≤ 120 KB gz; per-page chunks measured and tracked).
- Self-host subsetted fonts (drops the Google Fonts request; privacy + reliability).
- Asset audit; memoization pass on the hot grids (1,000-node stages).

### 5d. Accessibility (M)

- Full keyboard-only operation of every stage; screen-reader narratives for the visual stages
  (the trace *is* the alt text — generate readable step summaries from it).
- Contrast verification of all token pairs; reduced-motion completeness; publish an
  accessibility statement page.

### 5e. Reach: SEO, sharing, embeds (M)

- Prerender/SSG evaluation (vite prerender of the shell per route vs. history-mode migration
  with the 404 trick — decide with data; hash URLs remain the fallback).
- Open Graph cards per visualization (generated screenshots); sitemap; meta descriptions from
  catalog summaries.
- Teacher embed mode: minimal-chrome iframe of a single visualization with a locked
  configuration; "saved states" gallery optional.
- Analytics decision: default none; if ever added, privacy-respecting and self-hosted.

**Acceptance criteria**
- An external contributor lands a visualization with review comments only — no maintainer
  rewrites — proving the Phase 2 contracts + 5b docs.
- CI blocks merges on tests, evidence gates, bundle budgets, and Lighthouse thresholds.
- Cold load of any single visualization ≤ 2 s on mid-tier mobile.

**Exit:** the project sustains contributions and growth without the maintainer being the
bottleneck — the atlas compounds.

---

## Algorithm backlog by domain

Phase tags mark where each entry is scheduled; unmarked "later" items are unscheduled.

| Domain | Live | Next up | Later |
| --- | --- | --- | --- |
| Cryptography | RSA, Diffie–Hellman, Vigenère | SHA-256 (P4) | AES rounds, elliptic curves, lattices/LLL (P3) |
| Graphs & pathfinding | Dijkstra, A*, BFS | — | Bellman–Ford, max-flow, MST, weighted terrain |
| Sorting & order | Quicksort, merge sort | — | Heapsort, radix, sorting networks (P3) |
| Numbers & primes | Sieve of Eratosthenes | Euclid (P4) | Miller–Rabin, Karatsuba, FFT multiply |
| Statistics & probability | Bayes' rule | CLT, Monte Carlo π (P4) | Markov chains (P4), regression (P4) |
| AI & machine learning | — | Transformer architecture map, LLM inference pipeline (P4) | Attention internals, backprop, k-means, decision trees (P4); gradient descent (P3) |
| Distributed & architectures | — | Raft, consistent hashing (P4) | MapReduce, CAP explorer, load balancing |
| Methodologies | — | Huffman, PageRank (P4) | Fourier epicycles, simplex, RSA signatures |

## Standing decisions

- **Stack:** React 19 + Vite; react-router (hash) for pages; vitest. Three.js/R3F deferred to
  Phase 3 and code-split. No CSS framework — the theme is small and bespoke.
- **Math:** BigInt for all number theory; pure modules, no UI imports, fully unit-tested.
- **Evidence-first rule:** a visualization cannot register without a sources file and a
  passing evidence gate; drill-down maps extend the gate per node; 3D scenes may contain no
  geometry that isn't derived from a cited trace artifact. Provenance classes are rendered,
  not just stored.
- **Contracts before breadth:** shared components are extracted only from shipped duplication,
  never speculatively; a second consumer is the bar for generalizing.
- **Design tokens** live in `src/styles/theme.css`; pages consume variables only.
- **Deploys:** GitHub Pages; manual `npm run deploy` until Phase 5 CI automates it.

## Risks & mitigations

- **Scope creep per algorithm** — the trace contract caps ambition: ship steps + evidence
  first, exotic diagrams second. Phase tables above define "done" per entry.
- **Over-abstraction in Phase 2** — extraction bar: two shipped consumers. New contract
  features (streams, drill-down) are prototyped on the cheapest entry first.
- **3D performance on low-end devices** — code-splitting, poster fallbacks, and a fps budget
  gate before any 3D entry merges.
- **Citation accuracy** — sources restricted to primary literature and standards verified by
  the maintainer; anchor sources are named in this roadmap *before* an entry is built.
- **Toy-parameter misconceptions** — every simplification is labeled `pedagogical` in the UI
  with a note on real-world parameters (2048-bit moduli, OAEP padding, real screening data).
- **Solo-maintainer bottleneck** — Phase 5's contribution pipeline is scheduled work, not an
  aspiration; the reference-PR pattern starts accumulating in Phase 2.
