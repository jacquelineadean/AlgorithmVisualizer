# Visualization contracts

How a visualization plugs into the atlas. Established in Phase 2a; the
reference implementations are `src/visualizations/rsa/` (acts, custom detail
kind, protocol stage) and `src/visualizations/dh/` (the first entry built
*on* the contracts — its PR touched only `src/visualizations/dh/` and one
catalog entry, which is the standard every new entry is held to).

## The shape of a visualization

```
src/visualizations/<id>/
  math.js         Pure computation. BigInt for number theory. No UI imports.
  math.test.js    Unit tests for the math, including a classic worked example.
  sources.js      Citation database + `export { PROVENANCE } from '../provenance'`.
  trace.js        buildTrace(inputs) → { steps, artifacts }. Throws on bad inputs
                  with user-readable messages (they render in the error card).
  trace.test.js   Worked-example assertions + input validation tests.
  <Id>Visualizer  Thin component: input state + controls JSX + stage renderer,
                  handed to <TraceInstrument>.
  index.js        defineVisualization({...}) registration (see below).
```

Plus one entry in `src/catalog/index.js` with `status: 'live'`, a `route`
of `/visualizer/<id>`, and an `intro` paragraph for the generic page header.
There is no page file — `pages/VisualizerPage.jsx` renders any registered id.

## Step

```js
{
  id: 'compute-d',            // stable, kebab-case; stages key off reached ids
  act: 'keygen',              // optional; must match an entry in ACTS if used
  title: 'Derive the private exponent',
  provenance: 'paper',        // 'paper' | 'theorem' | 'modern' | 'pedagogical'
  sourceRefs: [{ key: 'RSA78', detail: '§VII.D' }],   // ≥ 1, keys resolve in sources.js
  explanation: 'Prose the detail card shows. Write for a reader, not a log.',
  caveat: {                   // optional labeled aside (its own provenance + refs)
    provenance: 'modern',
    text: '…',
    sourceRefs: [{ key: 'RFC8017' }],
  },
  kind: 'values',             // picks the detail renderer (see kinds below)
  data: { … },                // shape depends on kind
}
```

`buildTrace` returns `{ steps, artifacts }`. `artifacts` is everything the
stage needs to draw (keys, counts, intermediate values) — stages read
artifacts plus the set of reached step ids, never recompute.

## Built-in detail kinds

| kind | data shape |
| --- | --- |
| `values` | `{ values: [{ label, value }] }` — tile grid |
| `formula` | `{ caption?, lines: [string], result? }` — mono math lines |
| `blocks` | `{ blocks: [{ from, to, masked? }] }` — mapping chips |
| `sqmul` | `{ mapping?, focus: { caption, rows: [{bit, squared, value}], result } }` — square-and-multiply table |

A visualization may pass `detailKinds={{ myKind: MyView }}` to
`<TraceInstrument>`; custom kinds render `data` however they like (RSA's
`egcd` is the example). A custom kind gets promoted to built-in when a second
visualization needs it — that's how `sqmul` earned its place (RSA, then DH).

## Streams (Phase 2b)

For work that is hundreds of micro-events rather than a readable sentence —
a partition's pointer walk, a merge pass — a step may carry a stream:

```js
{
  id: 'divide-and-conquer',
  …,
  stream: {
    events: […],   // any shapes the stage understands
    tick: 24,      // ms per batch (default 40)
    batch: 3,      // events applied per tick (default 1)
  },
}
```

Behavior, owned by `<TraceInstrument>`:
- Arriving at a streamed step replays its stream from the start.
- `renderStage` receives `streamIndex` and `streamDone`; the stage derives
  its picture by folding events `0 … streamIndex` (see `sorting/model.js`
  `applyEvents` for the reference fold).
- **Next / → complete a running stream first**, then advance on the second
  press. Autoplay waits for `streamDone` before moving on.
- The step list stays a handful of cited macro-steps; streams carry the
  animation, never the citations.

Sorting convention: the trace stores the full event array in
`artifacts.events`, each step notes `data.eventBase` (events already applied
when the step is entered), and streamed steps slice their own range —
tested by asserting the slices concatenate back to `artifacts.events`.

## Deep links (Phase 2c)

Inputs and the current step serialize into the hash query
(`#/visualizer/rsa?m=HI&p=11&q=13&e=7&s=2`):

- The visualizer passes `urlParams={{ m, p, q, e }}` (stringable values) to
  `<TraceInstrument>`, which owns the single write point (inputs + 1-based
  `s`), using replace-style navigation so history stays clean.
- The visualizer reads its initial state once, in a `readInitial(searchParams)`
  helper with per-field validation and graceful fallback to defaults —
  never trust a pasted URL.
- The player's **Copy link** button copies the current URL, which restores
  inputs and step exactly.

## TraceInstrument

```jsx
<TraceInstrument
  trace={built.trace}        // rebuild via useMemo when inputs change
  error={built.error}        // string → error card replaces stage/player
  sources={SOURCES}
  acts={ACTS}                // or listLabel="…" for a flat list
  controls={<>…</>}          // rendered in the controls card
  renderStage={(ctx) => <MyStage {...ctx} />}  // {steps, stepIndex, artifacts}
  detailKinds={{ … }}        // optional
  playIntervalMs={3000}      // optional autoplay pace
/>
```

The instrument owns step state, autoplay, arrow-key navigation (with form
and browser-shortcut guards), layout, and the evidence section. Stages are
pure functions of `(steps reached, artifacts)` so the diagram can never
disagree with the step player.

**The instrument block.** The stage and its transport render as one block
(`.ti-instrument`): the graphic on top, and beneath it the shared
`player/Transport.jsx` — previous · play/pause · next as icon buttons with
full accessible names, the "Step 3 / 13" readout and progress rail, and Copy
link. On viewports 900 px and wider the block pins below the floating nav
while the step list, detail card, and evidence scroll under it, so the
picture stays in place as the reader steps; `useStickyInstrument` enables
that only when the block leaves at least half the viewport for reading —
the drill-down pipelines pin on a laptop, full-width SVG stages on taller
monitors, and tall stages such as the sieve grid never do. Play advances a
step every `playIntervalMs`, waits for a running stream, and stops at the
end; pressing Play at the end starts over.

Two rules for stages follow from this: **keep a constant height across
steps** (a legend that appears on the last step should reserve its space),
and never scroll the page yourself — the instrument is the fixed point.

Shared stages: `protocol/ProtocolStage.jsx` (two actors, public channel,
optional eavesdropper, positioned tokens) — used by RSA and DH; Raft is its
expected third consumer (multi-node variant, Phase 4).

## Drill-down maps (Phase 4a)

Some subjects are architectures, not step sequences: a transformer, an
inference pipeline, a MapReduce job. Those register a **map** instead of a
trace and render through `<DrilldownInstrument>` — a second renderer tier
under the same evidence rule.

```js
// node
{
  id: 'attention',            // unique among its siblings; paths key off it
  title: 'Multi-head self-attention',
  summary: 'One line for the card.',
  provenance: 'paper',
  sourceRefs: [{ key: 'VASWANI2017', detail: '§3.2' }],  // ≥ 1, as for steps
  detail: 'Prose shown when this node is focused.',       // optional
  metrics: [{ label: 'heads', value: 12 }],               // optional tile row
  caveat: { provenance, text, sourceRefs },               // optional
  layout: 'flow' | 'stack' | 'grid',                      // how children lay out
  stage: { kind: 'attention', data: { … } },              // optional live panel
  children: [ …nodes ],                                   // or a leaf
}
```

`buildMap(inputs) → { root }`. A node either drills into `children` or opens
a focused `stage`; most leaves do the latter, and those stages are small live
instruments (`stageKinds={{ kind: Component }}`), free to hold their own
state — the KV-cache scrubber and the nucleus sampler both do.

**The phase player.** The instrument flattens the map into its pre-order
sequence (`drilldown/model.js` `sequenceOf`: a phase, then each of its
sub-phases, then the next phase — the root is phase 1, the overview) and
renders the same instrument shape as the trace tier:

- A fixed graphic, `PipelineStage`: the root as a full-width bar, then one
  rail per level of the map (`maxDepth`). Rail 0 is the top-level flow;
  each rail below shows the sub-phases of whichever phase above is on the
  current path, or an empty track. Every rail is always drawn, so the
  block never changes height as the reader moves. Boxes are buttons (click
  = jump), named by the node title; they read done → on-path → current →
  upcoming, arrows fill in as the flow passes, and a dot slides into the
  phase just entered.
- The shared transport beneath it: previous · play/pause · next, the
  "Phase 4 / 16" readout, Copy link. Play walks the whole pipeline,
  sub-phases included, one phase per `playIntervalMs`, and stops at the end.
- One card for the focused node: breadcrumbs (`aria-label="Map location"`),
  title, summary, evidence row, detail prose, metrics, the node's live
  panel (`stageKinds`), caveat, and a line naming the sub-phases inside.

Keyboard: ← / → previous and next phase (as on the trace player), ↑ or
Backspace up a level, ↓ into the first sub-phase. The deep link is the node
path, `#/visualizer/llm-inference?model=7b&node=decode.kv-cache`; a path
that no longer resolves stops at the deepest node that still exists rather
than blanking the page. The block pins on wide viewports exactly as the
trace instrument does.

Because rails show one level's siblings side by side, keep sibling titles
short in front of the dash — `Prefill — read the prompt` shows as
"Prefill" on the rail and in full in the tooltip, the accessible name, and
the node card.

**The gate applies per node.** `evidence-gate.test.js` walks the whole tree:
any node without a resolvable citation, a declared provenance class, a title,
or a summary fails the suite — and sibling id collisions fail it too, since
they would make paths ambiguous. Maps register with `buildMap` in place of
`buildTrace`; `defineVisualization` rejects anything that supplies both or
neither.

Rule of thumb, inherited from the 3D tier: **metrics are computed, never
quoted.** The transformer map derives its parameter counts from the selected
configuration, and the tests hold them to the published totals. If a number
on a map cannot be recomputed from a pure module, it does not belong there.

## Shared stage kit

`stages/` holds the primitives Phase 4 entries draw with. Each earned its
place the usual way — two or more shipped consumers:

| Stage | Shape | Consumers |
| --- | --- | --- |
| `PlotStage` | declarative cartesian marks (`points`, `line`, `bars`, `segment`, `circle`, `rect`, `marker`, `label`) | Monte Carlo, CLT, k-means, perceptron, regression, backprop, Fourier, consistent hashing, and the inference/training map panels |
| `GraphStage` | nodes at normalized coordinates plus directed or undirected edges | Markov, PageRank, Huffman, backprop, Raft, CAP |
| `MatrixStage` | labelled heat grid | attention, Markov, Raft logs, transformer map |

Callers pass data-space values derived from trace artifacts; the stages
compute nothing.

## Registration

```js
// src/visualizations/<id>/index.js
export default defineVisualization({
  id: 'dh',
  Visualizer: DhVisualizer,
  buildTrace: buildDhTrace,   // …or buildMap, for a drill-down map
  sources: SOURCES,
  gateFixtures: () => [ { p: 83n, g: 2n, a: 9n, b: 21n }, … ],
});
```

Then add `import './<id>';` to `src/visualizations/index.js`. Pages and
tests import from that aggregator only.

## The evidence gate

`src/visualizations/evidence-gate.test.js` iterates the registry: for every
visualization it builds each `gateFixtures()` trace — or map — and fails the
suite if any step, node, or caveat lacks a resolvable citation or a declared
provenance class, or if any source record is incomplete. Registering a
visualization *is* opting into the gate; there is no way to ship an uncited
entry.

`src/pages/live-entries.test.jsx` is the other half of that bargain: it
renders every catalog card marked `live` through the real router and asserts
the page mounts, shows its player or breadcrumbs, and resolves at least one
reference. A model can be perfect and the component still broken — this is
the suite that notices.

## 3D scenes (Phase 3)

A 3D view is an *addition* to a stage, never a replacement, and it obeys two
hard rules:

- **Lazy or nothing:** the scene module (which imports `scene3d/Scene3D` and,
  through it, all of three.js) loads via `React.lazy` behind an explicit user
  toggle — 2D routes ship zero 3D bytes. See `rsa/RsaHelixScene.jsx`.
- **No decorative geometry:** every position derives from trace artifacts
  through a pure geometry module with unit tests that recompute the positions
  from first principles (`scene3d/helix.js` + `helix.test.js` are the
  reference). If it isn't in the trace, it isn't drawn.

`Scene3D` provides the paper-world canvas, lighting, orbit camera, and a
WebGL error-boundary fallback. Scenes should offer a provenance overlay
mapping element colors to the classes they derive from.

## Rules of thumb

- Trace modules never import UI; visualizer components never compute — they
  configure.
- Explanations name real numbers from the current inputs (template them in),
  so the prose always matches what the user chose.
- Label every simplification `pedagogical`, and say what real deployments do
  in a `modern` caveat with its own citation.
- Extraction bar: nothing moves into the shared kit until two shipped
  visualizations duplicate it.
