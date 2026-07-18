import App from './App';
import Home from './site/Home';
import Blog from './site/Blog';
import BlogPost from './site/BlogPost';
import VisualizerIndex from './pages/VisualizerIndex';
import PathfindingPage from './pages/PathfindingPage';
import RsaPage from './pages/RsaPage';
import BayesPage from './pages/BayesPage';

// Shared between the real hash router (main.jsx) and memory routers in tests.
export const routes = [
    {
        path: '/',
        element: <App />,
        children: [
            { index: true, element: <Home /> },
            { path: 'visualizer', element: <VisualizerIndex /> },
            { path: 'visualizer/pathfinding', element: <PathfindingPage /> },
            { path: 'visualizer/rsa', element: <RsaPage /> },
            { path: 'visualizer/bayes', element: <BayesPage /> },
            { path: 'blog', element: <Blog /> },
            { path: 'blog/:slug', element: <BlogPost /> },
        ],
    },
];
