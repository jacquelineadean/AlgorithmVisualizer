import { cloneGridForSearch, reconstructPath } from './grid';

// Runs an algorithm against a snapshot of the grid.
//
// An algorithm is an object with:
//   id:   unique string identifier
//   name: display name
//   run(grid, startNode, finishNode): may mutate the given grid freely;
//     returns the visited nodes in visit order and links each reached node
//     to its predecessor via previousNode.
//
// Returns { visitedNodesInOrder, pathNodesInOrder }; pathNodesInOrder is
// empty when the finish node is unreachable.
export function runAlgorithm(algorithm, grid, start, finish) {
    const workingGrid = cloneGridForSearch(grid);
    const startNode = workingGrid[start.row][start.col];
    const finishNode = workingGrid[finish.row][finish.col];
    const visitedNodesInOrder = algorithm.run(workingGrid, startNode, finishNode) ?? [];
    return {
        visitedNodesInOrder,
        pathNodesInOrder: reconstructPath(finishNode),
    };
}
