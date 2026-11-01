# System design contracts

The System Design Visualizer is the site's second component, beside the
Algorithm Visualizer. An algorithm page steps through one computation. A
system page walks down one whole system, layer by layer, the way the
seven-layer AI inference stack reads from the SDK call to the GPU.

Everything lives under `src/systemdesign/`. Nothing in
`src/visualizations/` imports from it, and it reuses only the shared
evidence components and theme tokens.

```
src/systemdesign/
├── categories.js       # The category list and the default (fundamentals)
├── index.js            # SYSTEMS registry: getSystem, getCategory, systemsByCategory
├── model.js            # Pure helpers: defineSystem, tray order, citations, textOf
├── sources.js          # Every citation, keyed (SOURCES)
├── models/             # Pure numeric models; every number a page states comes from here
├── systems/            # One file per system (content only, no JSX)
├── labs/               # Interactive labs, registered by name in labs/index.js
├── ui/                 # SystemsIndex, SystemPage, Blocks, Rich, SystemDesign.css
├── content.test.js     # The content gate (see below)
└── pages.test.jsx      # Renders every tab of every tray of every system
```

## Routes

| Route | Page |
| --- | --- |
| `#/systems` | Index, Fundamentals category selected |
| `#/systems?category=ai` | Index, AI category selected |
| `#/systems/:systemId` | A system's overview tray |
| `#/systems/:systemId/:trayId` | One layer or topic tray |
| `…?tab=:sectionId` | Opens that section's tab |

The left and right arrow keys walk the trays in order. Both system routes load
lazily, so the algorithm pages ship none of this code.

## Categories

`categories.js` holds the list. There are two today:

- `fundamentals` (default): a method for open-ended design, plus three
  components taken five layers deep and one worked design that uses them.
- `ai`: the seven-layer AI inference stack.

`content.test.js` pins the list to exactly these two, so a third category is a
deliberate change to the test as well as the data.

## The shape of a system

```js
defineSystem({
    id: 'kafka-log',                  // URL segment, unique
    category: 'fundamentals',         // a CATEGORIES id
    name: 'Kafka as a durable log',
    kicker: 'Component, five layers deep',
    summary: 'One line for the index card.',
    intro: 'The paragraph under the page title.',
    direction: { label: 'Depth', top: 'what it is for', bottom: 'how it runs' },
    topicsLabel: 'Beside the request path', // optional heading over topic trays
    trace: { steps: [...] },          // optional: the request-trace lab's steps
    overview: { title, lede, sections },
    layers: [tray, ...],              // read top to bottom; colors 1–7 in order
    topics: [tray, ...],              // cross-cutting trays after the layers
});
```

A **tray** is `{ id, code, name, products?, title, lede, sections }`. The rack
shows `code` and `name`; the panel shows `title`, `lede` and one tab per
section.

A **section** is `{ id, label, provenance, sourceRefs, heading?, blocks, caveat? }`.
`provenance` is one of `paper`, `theorem`, `modern`, `pedagogical`.
`caveat` is `{ provenance, sourceRefs, text }`.

## Blocks

`ui/Blocks.jsx` renders each block by `kind`:

| kind | Fields |
| --- | --- |
| `prose` | `text` |
| `list` | `items`, `style: 'cards'`, `ordered: true` |
| `compare` | `a`, `b`, `rows: [{ label, a, b, note }]`, `note` |
| `spec` | `owns`, `neighbors`, `pattern`, `metrics`, `knobs`, `failures`, `boundary` |
| `stats` | `items: [{ value, label, note }]` |
| `table` | `columns`, `rows`, `caption`, `layerColumn` |
| `bars` | `title`, `unit`, `categories`, `series: [{ name, values }]`, `note` |
| `timeline` | `events: [{ date, title, text, kind }]` |
| `quiz` | `questions: [{ q, options, answer, explain }]`, `results` |
| `drill` | `title`, `scenario`, `scarce`, `steps: [{ layer, title, text }]`, `switches` |
| `checklist` | `groups: [{ title, items }]` |
| `code` | `code`, `notes` |
| `quote` | `label`, `text` |
| `links` | `items: [{ to, label, text }]` |
| `layers` | (draws the system's own layer stack) |
| `lab` | `lab` (a `LABS` key), `props`, `title`, `sub` |
| `note` | `text` |

Text fields accept three inline marks: `**bold**`, `` `code` `` and
`[label](/systems/...)`. Internal links render as router links.

## The content gate

`content.test.js` runs over every system and fails the suite when:

- a section or caveat cites nothing, or cites a key missing from `sources.js`;
- a source lacks an `https` URL;
- a block kind or lab name is unknown;
- a drill step, table layer column or glossary entry names a layer that does
  not exist;
- an internal link points at a system, tray or `?tab=` that does not exist;
- a quiz answer index is out of range;
- any text mentions podcast episodes, hosts or show notes.

The last rule exists because the Fundamentals and AI material started as
companions to a podcast. The podcast stays in `sources.js` as citations
(`SDDD_STACK`, `SDDD_MODELS`) and nowhere else.

`pages.test.jsx` renders every tab of every tray of every system through the
real router and checks the heading and that no lab is missing.

## Numbers

A number in prose comes from `models/`. For example, the Kafka hot-partition
share is `partitionLoad({ partitions: 12, skew: 1.1 })`, and the chat-serving
fleet size is `estimateFleet(...)`. `models/models.test.js` pins each model
against its published value. A spec-sheet input (H100 bandwidth, list prices)
lives once in `models/` and is cited where it is used.

## Adding a system

1. Add `src/systemdesign/systems/<id>.js` exporting `defineSystem({...})`.
2. Add new citations to `sources.js`.
3. Add any new lab to `labs/` and register it in `labs/index.js`.
4. Import the system in `index.js` and append it to `SYSTEMS`.
5. Run `npm run test:run`. The content gate and the page smoke test cover it
   with no new test code.
