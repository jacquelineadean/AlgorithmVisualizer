import App from './App';
import Home from './site/Home';
import Blog from './site/Blog';
import BlogPost from './site/BlogPost';
import VisualizerIndex from './pages/VisualizerIndex';
import VisualizerPage from './pages/VisualizerPage';

// Shared between the real hash router (main.jsx) and memory routers in tests.
// Every registered trace visualization — pathfinding included, since its
// Phase 2b migration — renders through the generic /visualizer/:id page.
// The System Design Visualizer lives under /systems: an index by category,
// then one page per system with a tray per layer (/systems/:id/:layer).
// Its pages load on first visit, so the algorithm pages stay light.
const systemsIndex = () => import('./systemdesign/ui/SystemsIndex').then((m) => ({ Component: m.default }));
const systemPage = () => import('./systemdesign/ui/SystemPage').then((m) => ({ Component: m.default }));

export const routes = [
    {
        path: '/',
        element: <App />,
        children: [
            { index: true, element: <Home /> },
            { path: 'visualizer', element: <VisualizerIndex /> },
            { path: 'visualizer/:id', element: <VisualizerPage /> },
            { path: 'systems', lazy: systemsIndex },
            { path: 'systems/:systemId', lazy: systemPage },
            { path: 'systems/:systemId/:layerId', lazy: systemPage },
            { path: 'blog', element: <Blog /> },
            { path: 'blog/:slug', element: <BlogPost /> },
        ],
    },
];
