import { useCallback, useEffect, useState } from 'react';

// The trays a reader has opened, per system. Kept in this browser only;
// when storage is blocked the count simply starts over on each visit.

const key = (systemId) => `sd-visited:${systemId}`;

function read(systemId) {
    try {
        const ids = JSON.parse(localStorage.getItem(key(systemId)) ?? '[]');
        return new Set(Array.isArray(ids) ? ids : []);
    } catch {
        return new Set();
    }
}

function write(systemId, ids) {
    try {
        localStorage.setItem(key(systemId), JSON.stringify([...ids]));
    } catch {
        // Storage blocked: progress lasts until the page reloads.
    }
}

// Marks trayId as visited and returns [visited ids, reset].
export function useVisited(systemId, trayId) {
    const [visited, setVisited] = useState(() => read(systemId));

    useEffect(() => {
        setVisited(read(systemId));
    }, [systemId]);

    useEffect(() => {
        if (!trayId) return;
        setVisited((prev) => {
            if (prev.has(trayId)) return prev;
            const next = new Set(prev).add(trayId);
            write(systemId, next);
            return next;
        });
    }, [systemId, trayId]);

    const reset = useCallback(() => {
        const next = new Set(trayId ? [trayId] : []);
        write(systemId, next);
        setVisited(next);
    }, [systemId, trayId]);

    return [visited, reset];
}
