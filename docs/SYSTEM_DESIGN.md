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
    intro: 'One sentence under the page title.',
    direction: { label: 'Depth', top: 'what it is for', bottom: 'how it runs' },
    topicsLabel: 'Beside the request path', // optional heading over topic trays
    trace: { steps: [...] },          // optional: the request-trace lab's steps
    overview: { title, sections },   // lede optional
    layers: [tray, ...],              // read top to bottom; colors 1–7 in order
    topics: [tray, ...],              // cross-cutting trays after the layers
});
```

A **tray** is `{ id, code, name, products?, title, lede, sections }`. The rack
and the `layers` block show `code`, `name` and `products`; the panel shows
`title`, `lede` and one tab per section.

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
- any text mentions podcast episodes, hosts or show notes;
- any source file under `src/systemdesign/` except `sources.js` mentions
  interviews. The material is for learning and design work.

The last rule exists because the Fundamentals and AI material started as
companions to a podcast. The podcast stays in `sources.js` as citations
(`SDDD_STACK`, `SDDD_MODELS`) and nowhere else.

`pages.test.jsx` renders every tab of every tray of every system through the
real router and checks the heading and that no lab is missing.

## The page

`ui/SystemPage.jsx` draws each system as a server rack beside a stage.

- The rack (left, sticky) holds a plate with the category, kicker and
  system name (the page's h1), the overview tray, the direction label, a
  cabinet with one tray per layer, a patch panel with the topics as jacks,
  and a meter of trays opened. Opened trays live in `localStorage` under
  `sd-visited:<systemId>` (`ui/progress.js`).
- An amber token rides the cabinet's cable beside the open layer.
  `ui/rackSignal.js` lets a lab point it at another layer: the request
  trace moves it tray by tray while the request travels.
- The stage shows a chip and eyebrow, the tray title in Big Shoulders
  Display, the lede as an italic dek, tabs with a sliding bar, the section,
  and previous and next buttons.
- A `stats` block renders as rack front panels on an overview tray and as
  cards elsewhere. A `spec` block renders as a datasheet under a dark band
  in the layer's color. The `layers` block draws the trays as rack units.
- Below 900px the rack becomes a sticky strip of tray codes and jacks.

## Theme

- Colors are tokens. `src/styles/theme.css` holds the site's; the top of
  `ui/SystemDesign.css` holds the layer colors (`--sd-c1` to `--sd-c7`),
  the rack (`--sd-rack*`) and the token (`--sd-token`).
- Every token has a dark value, written twice: under
  `prefers-color-scheme: dark` and under `:root[data-theme='dark']`.
- The theme follows the system setting until the nav's toggle stores a
  choice (`src/site/theme.js`); `index.html` applies it before first paint.
- The rack stays dark in both themes.
- Canvas and WebGL code reads tokens with `themeVar()` and re-renders on a
  theme change through `useTheme()`.

## Copy

Labs carry the explanation, so text stays short. An intro is one sentence,
a tray lede one sentence, and a prose block at most two short paragraphs.
A lab's `sub` says what to press and what to watch. A tray opens on the
lab that runs its mechanism when it has one; explanation tabs follow it.

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
