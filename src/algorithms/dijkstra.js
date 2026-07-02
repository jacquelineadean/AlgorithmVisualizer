import { getNeighbors } from '../engine/grid';

// Dijkstra's algorithm on a uniform-cost grid.
// Returns all nodes in the order they were visited and links each reached
// node to its predecessor via previousNode, so the shortest path can be
// reconstructed by backtracking from the finish node.
function run(grid, startNode, finishNode) {
    const visitedNodesInOrder = [];
    startNode.distance = 0;
    const unvisitedNodes = grid.flat();

    while (unvisitedNodes.length) {
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
        const closestNode = unvisitedNodes.shift();
        if (closestNode.isWall) continue;
        // Every remaining node is unreachable.
        if (closestNode.distance === Infinity) break;

        closestNode.isVisited = true;
        visitedNodesInOrder.push(closestNode);
        if (closestNode === finishNode) break;

        for (const neighbor of getNeighbors(grid, closestNode)) {
            if (neighbor.isVisited || neighbor.isWall) continue;
            const distance = closestNode.distance + 1;
            if (distance < neighbor.distance) {
                neighbor.distance = distance;
                neighbor.previousNode = closestNode;
            }
        }
    }
    return visitedNodesInOrder;
}

export default {
    id: 'dijkstra',
    name: "Dijkstra's Algorithm",
    description: 'Guarantees the shortest path on a uniform-cost grid.',
    run,
};
