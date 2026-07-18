import App from './App';
import Home from './site/Home';
import Blog from './site/Blog';
import BlogPost from './site/BlogPost';
import VisualizerIndex from './pages/VisualizerIndex';
import PathfindingPage from './pages/PathfindingPage';
import VisualizerPage from './pages/VisualizerPage';

// Shared between the real hash router (main.jsx) and memory routers in tests.
// Registered trace visualizations render through the generic /visualizer/:id
// page; pathfinding keeps a dedicated page until its Phase 2b trace migration.
export const routes = [
    {
        path: '/',
        element: <App />,
        children: [
            { index: true, element: <Home /> },
            { path: 'visualizer', element: <VisualizerIndex /> },
            { path: 'visualizer/pathfinding', element: <PathfindingPage /> },
            { path: 'visualizer/:id', element: <VisualizerPage /> },
            { path: 'blog', element: <Blog /> },
            { path: 'blog/:slug', element: <BlogPost /> },
        ],
    },
];
