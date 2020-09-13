import React, {Component} from 'react';
import Node from '../Node/Node';

import './PathfindingVisualizer.css';

export default class PathfindingVisualizer extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div>
                <Node></Node>
            </div>
        );
    }
}