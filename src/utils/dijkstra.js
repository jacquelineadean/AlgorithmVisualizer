// Dijkstra's algorithm 
    // returns all nodes in the order in which they were visited
    // makes node point back to their previous node
        // allows for computation of the the shortest path by backtracking from the finish node 

export function dijkstra(grid, startNode, finishNode) {
    // Store ordered list of nodes visited 
    const visitedNodesInOrder = [];
    // Initial distance
    startNode.distance = 0;
    // unvisited nodes are initially set to nodes in the graph
    const unvisitedNodes = getAllNodes(grid);
    // Loop will execute while there are unvisited nodes
    while (!!unvisitedNodes.length) {
        // Sort by distance
        sortNodesByDistance(unvisitedNodes);
        // Return the value of the closest node and remove it from the unvisited nodes array
        const closestNode = unvisitedNodes.shift();
        // if wall, skip
        if (closestNode.isWall) { 
            continue;
        }
        // if the closest node is at a distance of infinity, stop
        if (closestNode.distance === Infinity) {
            return visitedNodesInOrder;
        }
        // Update state
        closestNode.isVisited = true;
        // Add closestNode to the array of visited nodes
        visitedNodesInOrder.push(closestNode);
        // if closest node is the finish node, stop
        if (closestNode === finishNode) {
            return visitedNodesInOrder;
        }
        // 
        updateUnvisitedNeighbors(closestNode, grid);
    }
}

// Sort the unvisited nodes by relative distance
function sortNodesByDistance(unvisitedNodes) {
    unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
}

// Transform neighbors into a linked list 
function updateUnvisitedNeighbors(node, grid) {
    const unvisitedNeighbors = getUnvisitedNeighbors(node, grid);
    // Store distance from node to neighboring and point to their previous node (node)
    for (const neighbor of unvisitedNeighbors) {
        neighbor.distance = node.distance + 1;
        neighbor.previousNode = node;
    }
}

// Get neighboring nodes where visited is false
function getUnvisitedNeighbors(node, grid) {
    const neighbors = [];
    const {col, row} = node;
    // add surrounding nodes to neighbors array
    if (row > 0) {
        neighbors.push(grid[row - 1][col]);
    } 
    if (row < grid.length -1){
        neighbors.push(grid[row + 1][col]);
    } 
    if (col > 0) {
        neighbors.push(grid[row][col + 1]);
    }
    if (col < grid[0].length - 1) {
        neighbors.push(grid[row][col + 1]);
    }
    // return filtered neighbors array of nodes that have not been visited 
    return neighbors.filter(neighbor => !neighbor.isVisited);
}

function getAllNodes(grid) {
    const nodes = [];
    for (const row of grid) {
        for (const node of row) {
            nodes.push(node);
        }
    }
    return nodes;
}

// Backtracks from the finishNode to find the shortest path
// Only works when called after the dijkstra method above
export function getNodesInShortestPathOrder(finishNode) {
    const nodesInShortestPathOrder = [];
    let currentNode = finishNode;
    while (currentNode !== null) {
        nodesInShortestPathOrder.unshift(currentNode);
        currentNode = currentNode.previousNode;
    }
    return nodesInShortestPathOrder; 
}