import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import './styles/theme.css';
import { routes } from './routes';

// Hash router so deep links survive GitHub Pages static hosting.
const router = createHashRouter(routes);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);
