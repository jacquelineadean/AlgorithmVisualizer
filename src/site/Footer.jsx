import { Link } from 'react-router-dom';
import { GITHUB_URL } from './FloatingNav';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="content footer-inner">
                <div>
                    <div className="eyebrow">Algorithm Visualizer</div>
                    <p className="footer-tagline">
                        Built in the open. Every step cites its source.
                    </p>
                </div>
                <div className="footer-links">
                    <Link to="/visualizer">Visualizer</Link>
                    <Link to="/blog">Blog</Link>
                    <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
}
