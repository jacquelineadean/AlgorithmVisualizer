import { Link, NavLink } from 'react-router-dom';
import './FloatingNav.css';

export const GITHUB_URL = 'https://github.com/jacquelineadean/AlgorithmVisualizer';

const navLinkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

export default function FloatingNav() {
    return (
        <header className="floating-nav-wrap">
            <nav className="floating-nav" aria-label="Primary">
                <Link to="/" className="wordmark">
                    Algorithm&nbsp;Visualizer
                </Link>
                <div className="nav-links">
                    <NavLink to="/visualizer" className={navLinkClass}>
                        Visualizer
                    </NavLink>
                    <NavLink to="/blog" className={navLinkClass}>
                        Blog
                    </NavLink>
                    <a
                        className="nav-link external"
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noreferrer"
                    >
                        GitHub
                        <svg
                            className="external-icon"
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            aria-hidden="true"
                        >
                            <path
                                d="M2 1h7v7M9 1 1 9"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.2"
                            />
                        </svg>
                    </a>
                </div>
            </nav>
        </header>
    );
}
