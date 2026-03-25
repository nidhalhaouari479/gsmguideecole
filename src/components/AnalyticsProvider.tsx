"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [sessionId, setSessionId] = useState('');
    const [lastPath, setLastPath] = useState('');
    const [startTime, setStartTime] = useState(Date.now());

    useEffect(() => {
        let sid = sessionStorage.getItem('analytics_session_id');
        if (!sid) {
            sid = generateSessionId();
            sessionStorage.setItem('analytics_session_id', sid);
        }
        setSessionId(sid);
    }, []);

    const sendEvent = (eventType: string, path: string, elementId?: string, duration?: number) => {
        if (!sessionId || path.includes('/admin')) return; // Ignore admin routes

        try {
            const payload = {
                session_id: sessionId,
                event_type: eventType,
                path,
                element_id: elementId,
                duration
            };

            const data = JSON.stringify(payload);

            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data,
                keepalive: true
            }).catch(() => {});
        } catch (e) {
            // Silently ignore tracking errors
        }
    };

    // Track page views and time on page
    useEffect(() => {
        if (!sessionId) return;

        const now = Date.now();

        // If navigating away from a previous page, calculate duration
        if (lastPath && lastPath !== pathname) {
            const timeSpentSecs = Math.round((now - startTime) / 1000);
            if (timeSpentSecs > 0 && timeSpentSecs < 3600) { // Limit to 1 hour max
                sendEvent('time_on_page', lastPath, undefined, timeSpentSecs);
            }
        }

        // Send new page view
        sendEvent('page_view', pathname);
        
        setLastPath(pathname);
        setStartTime(now);

        // Before unload handler to catch the last time on page
        const handleBeforeUnload = () => {
            const timeSpentSecs = Math.round((Date.now() - startTime) / 1000);
            if (timeSpentSecs > 0 && timeSpentSecs < 3600) {
                // Must send synchronously or via keepalive on unload
                sendEvent('time_on_page', pathname, undefined, timeSpentSecs);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);

    }, [pathname, sessionId]); // lastPath and startTime purposefully omitted

    // Global click tracker for buttons/links
    useEffect(() => {
        if (!sessionId) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Traverse up to find button or anchor
            const interactiveElement = target.closest('button, a');
            if (interactiveElement) {
                const text = interactiveElement.textContent?.trim().substring(0, 50) || '';
                const id = interactiveElement.id || text || interactiveElement.tagName;
                sendEvent('click', pathname, id);
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [pathname, sessionId]);

    return <>{children}</>;
}
