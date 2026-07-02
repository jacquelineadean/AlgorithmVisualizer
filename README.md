# Algorithm Visualizer

An interactive, terminal-styled, grid-based visualizer for pathfinding
algorithms, built with [React](https://react.dev/) and
[Vite](https://vitejs.dev/).

Draw walls by clicking/tapping and dragging on the grid, pick an algorithm,
and hit **./run** to watch the search sweep the grid and trace the shortest
path from the start node (▸) to the target (◎).

The grid sizes itself to the device: it fills a desktop monitor, fits a phone
without overflowing, and reflows on resize/rotation (walls that remain in
bounds are preserved). Input uses pointer events, so wall drawing works with
both mouse and touch.

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

The app is split into a reusable visualization engine and pluggable
algorithms, so new algorithms can be added without touching the UI.

```
src/
├── engine/            # Reusable, UI-agnostic engine
│   ├── grid.js        # Grid model: creation, walls, neighbors, path reconstruction
│   ├── run.js         # Runs an algorithm against a snapshot of the grid
│   └── animator.js    # Schedules/cancels the two-phase animation
├── algorithms/        # Pluggable algorithms
│   ├── index.js       # Registry: registerAlgorithm / getAlgorithm / listAlgorithms
│   └── dijkstra.js    # Dijkstra's algorithm
└── components/
    ├── Visualizer/    # Controls + grid, wired to the engine
    └── Node/          # A single memoized grid cell
```

### Adding an algorithm

1. Create `src/algorithms/<name>.js` exporting an object with the algorithm
   interface:

   ```js
   export default {
       id: 'astar',
       name: 'A* Search',
       description: 'Optional one-liner shown in the UI.',
       // May mutate the given grid freely (it is a working copy).
       // Return the visited nodes in visit order, and link each reached
       // node to its predecessor via node.previousNode so the engine can
       // reconstruct the shortest path.
       run(grid, startNode, finishNode) {
           /* ... */
       },
   };
   ```

2. Register it in `src/algorithms/index.js`:

   ```js
   import astar from './astar';
   registerAlgorithm(astar);
   ```

It will automatically appear in the algorithm dropdown.
