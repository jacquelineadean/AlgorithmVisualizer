import { Outlet, ScrollRestoration } from 'react-router-dom';
import FloatingNav from './site/FloatingNav';
import Footer from './site/Footer';
import './App.css';

export default function App() {
    return (
        <div className="app-shell">
            <FloatingNav />
            <main className="app-main">
                <Outlet />
            </main>
            <Footer />
            <ScrollRestoration />
        </div>
    );
}
