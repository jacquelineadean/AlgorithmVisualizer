// Dijkstra's algorithm 
    // returns all nodes in the order in which they were visited
    // makes node point back to their previous node
        // allows for computation of the the shortest path by backtracking from the finish node 

export function dijkstra(grid, startNode, finishNode) {
    const visitedNodesInOrder = [];
    startNode.distance = 0;
    const unvisitedNodes = getAllNodes(grid);
}

function sortNodesByDistance(unvisitedNodes) {

}

function updateUnvisitedNeighbors(node, grid) {

}

function getUnvisited