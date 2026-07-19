import App from './App';
import Home from './site/Home';
import Blog from './site/Blog';
import BlogPost from './site/BlogPost';
import VisualizerIndex from './pages/VisualizerIndex';
import VisualizerPage from './pages/VisualizerPage';

// Shared between the real hash router (main.jsx) and memory routers in tests.
// Every registered trace visualization — pathfinding included, since its
// Phase 2b migration — renders through the generic /visualizer/:id page.
export const routes = [
    {
        path: '/',
        element: <App />,
        children: [
            { index: true, element: <Home /> },
            { path: 'visualizer', element: <VisualizerIndex /> },
            { path: 'visualizer/:id', element: <VisualizerPage /> },
            { path: 'blog', element: <Blog /> },
            { path: 'blog/:slug', element: <BlogPost /> },
        ],
    },
];
