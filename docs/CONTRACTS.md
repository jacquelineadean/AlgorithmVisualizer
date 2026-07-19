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

Shared stages: `protocol/ProtocolStage.jsx` (two actors, public channel,
optional eavesdropper, positioned tokens) — used by RSA and DH; Raft is its
expected third consumer (multi-node variant, Phase 4).

## Registration

```js
// src/visualizations/<id>/index.js
export default defineVisualization({
  id: 'dh',
  Visualizer: DhVisualizer,
  buildTrace: buildDhTrace,
  sources: SOURCES,
  gateFixtures: () => [ { p: 83n, g: 2n, a: 9n, b: 21n }, … ],
});
```

Then add `import './<id>';` to `src/visualizations/index.js`. Pages and
tests import from that aggregator only.

## The evidence gate

`src/visualizations/evidence-gate.test.js` iterates the registry: for every
visualization it builds each `gateFixtures()` trace and fails the suite if
any step (or caveat) lacks a resolvable citation or a declared provenance
class, or if any source record is incomplete. Registering a visualization
*is* opting into the gate — there is no way to ship an uncited entry.

## Rules of thumb

- Trace modules never import UI; visualizer components never compute — they
  configure.
- Explanations name real numbers from the current inputs (template them in),
  so the prose always matches what the user chose.
- Label every simplification `pedagogical`, and say what real deployments do
  in a `modern` caveat with its own citation.
- Extraction bar: nothing moves into the shared kit until two shipped
  visualizations duplicate it.
