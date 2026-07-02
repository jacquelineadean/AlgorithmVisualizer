import Visualizer from './components/Visualizer/Visualizer';
import './App.css';

export default function App() {
    return (
        <div className="App">
            <div className="terminal">
                <div className="terminal-titlebar">
                    <span className="titlebar-dot dot-close" />
                    <span className="titlebar-dot dot-min" />
                    <span className="titlebar-dot dot-max" />
                    <h1 className="terminal-title">algorithm-visualizer — bash</h1>
                </div>
                <div className="terminal-body">
                    <p className="prompt-line">
                        <span className="prompt-user">visitor@algoviz</span>
                        <span className="prompt-path">:~</span>
                        <span className="prompt-symbol">$ </span>./visualize
                    </p>
                    <Visualizer />
                </div>
            </div>
        </div>
    );
}
