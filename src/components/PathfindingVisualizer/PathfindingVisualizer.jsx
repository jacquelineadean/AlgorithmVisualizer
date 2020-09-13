import React, {Component} from 'react';
import Node from '../Node/Node';

import './PathfindingVisualizer.css';

export default class PathfindingVisualizer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            nodes: [],
        };
    }

    componentDidMount() {
        const nodes = [];
        // Nested for loop to render grid (rows & cols) of nodes
        for (let row = 0; row < 15; row++) {
            const currentRow = [];
            for (let col = 0; col < 50; col++) {
                currentRow.push([]);
            }
            nodes.push(currentRow);
        }
        this.setState({nodes});
    }

    render() {
        const {nodes} = this.state;

        return (
            <div className='grid'>
                {nodes.map((row, rowIdx) => {
                    return (
                        <div key={rowIdx}>
                            {row.map((node, nodeIdx) => {
                                const {isStart, isFinish} = node;
                                return (
                                    <Node key={nodeIdx} isStart={isStart} isFinish={isFinish}/>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    }
}