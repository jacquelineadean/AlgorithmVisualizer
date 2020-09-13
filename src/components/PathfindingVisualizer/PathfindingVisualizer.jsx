import React, {Component} from 'react';
import Node from '../Node/Node';

import './PathfindingVisualizer.css';

// Setting node placement variables
const START_NODE_ROW = 10;
const START_NODE_COL = 15;
const FINISH_NODE_ROW = 10;
const FINISH_NODE_COL = 35;

export default class PathfindingVisualizer extends Component {
    constructor() {
        super();
        this.state = {
            grid: [],
            mousePressed: false,
        };
    }

    componentDidMount() {
        const grid = getInitialGrid();
        this.setState({grid});
        // const nodes = [];
        // // Nested for loop to render grid (rows & cols) of nodes
        // for (let row = 0; row < 15; row++) {
        //     const currentRow = [];
        //     for (let col = 0; col < 50; col++) {
        //         currentRow.push([]);
        //     }
        //     nodes.push(currentRow);
        // }
        // this.setState({nodes});
    }

    handleMouseDown(row, col) {
        const newGrid = getNewGridWithWallToggled(this.state.grid, row, col);
        this.setState({grid: newGrid, mousePressed: true});
    }

    handleMouseEnter(row, col) {
        if (!this.state.mousePressed) return;
        const newGrid = getNewGridWithWallToggled(this.state.grid, row, col);
        this.setState({grid: newGrid});
    }

    handleMouseUp() {
        this.setState({mousePressed: false});
    }

    animateShortestPath(nodesInShortestPathOrder) {

    }

    visualizeDijkstra() {

    }

    render() {
        const {grid, mousePressed} = this.state;

        return (
            <>
                <button onClick={() => this.visualizeDijkstra()}>
                    Visualize Dijkstra's Algorithm
                </button>
            
                <div className='grid'>
                    {grid.map((row, rowIdx) => {
                        return (
                            <div key={rowIdx}>
                                {row.map((node, nodeIdx) => {
                                    const {row, col, isStart, isFinish, isWall} = node;
                                    return (
                                        <Node 
                                            key={nodeIdx} 
                                            col={col} 
                                            isStart={isStart} 
                                            isFinish={isFinish} 
                                            isWall={isWall} 
                                            mousePressed={mousePressed} 
                                            onMouseDown={(row, col) => this.handleMouseDown(row, col)} 
                                            onMouseEnter={(row, col) => 
                                                this.handleMouseEnter(row, col)
                                            }
                                            onMouseUp={() => this.handleMouseUp()}
                                            row={row}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </>
        );
    }
}

// Functions 
// ================================================================================
const getInitialGrid = () => {
    const grid = [];
    // iterate through rows and cols to create grid
    for (let row = 0; row < 20; row++) {
        const currentRow = [];
        for (let col = 0; col < 50; col++) {
            currentRow.push(createNode(col, row));
        }
        grid.push(currentRow);
    }
    return grid;
};

const createNode = (col, row) => {
    // Create the nodes and their placement on the grid
    return {
        col,
        row,
        isStart: row === START_NODE_ROW && col === START_NODE_COL,
        isFinish: row === FINISH_NODE_ROW && col === FINISH_NODE_COL,
        distance: Infinity,
        isVisited: false,
        isWall: false,
        previousNode: null
    }
};

const getNewGridWithWallToggled = (grid, row, col) => {
    const newGrid = grid.slice();
    const node = newGrid[row][col];
    const newNode = {
        ...node,
        isWall: !node.isWall,
    };
    newGrid[row][col] = newNode;
    return newGrid;
};