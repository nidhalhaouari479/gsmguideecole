import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all events in the last 7 days
        const { data: events, error } = await supabaseAdmin
            .from('analytics_events')
            .select('*')
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: true });

        if (error) {
            // Provide clear error messages
            if (error.code === '42P01') {
                throw new Error('TABLE_MISSING: La table "analytics_events" n\'existe pas. Exécutez le script SQL de création dans Supabase.');
            }
            throw error;
        }

        const allEvents = events || [];

        // --- KPIs ---
        const pageViews = allEvents.filter(e => e.event_type === 'page_view');
        const clicks = allEvents.filter(e => e.event_type === 'click');
        const timeEvents = allEvents.filter(e => e.event_type === 'time_on_page' && typeof e.duration === 'number');

        const uniqueVisitors = new Set(pageViews.map(e => e.session_id)).size;
        const totalPageViews = pageViews.length;
        const totalClicks = clicks.length;
        const avgTime = timeEvents.length > 0
            ? Math.round(timeEvents.reduce((sum, e) => sum + e.duration, 0) / timeEvents.length)
            : 0;

        // Format avgTime as "Xm Ys"
        const avgTimeFormatted = `${Math.floor(avgTime / 60)}m ${avgTime % 60}s`;

        // --- TRAFFIC PER DAY (last 7 days) ---
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const today = new Date();
        const trafficByDay: Record<string, number> = {};

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = days[d.getDay()];
            trafficByDay[key] = 0;
        }

        pageViews.forEach(e => {
            const d = new Date(e.created_at);
            const key = days[d.getDay()];
            if (key in trafficByDay) {
                trafficByDay[key] = (trafficByDay[key] || 0) + 1;
            }
        });

        const trafficChart = Object.entries(trafficByDay).map(([name, traffic]) => ({ name, traffic }));

        // --- TIME PER PAGE ---
        const timeByPage: Record<string, { total: number; count: number }> = {};
        timeEvents.forEach(e => {
            if (!timeByPage[e.path]) timeByPage[e.path] = { total: 0, count: 0 };
            timeByPage[e.path].total += e.duration;
            timeByPage[e.path].count += 1;
        });

        const timePerPage = Object.entries(timeByPage)
            .map(([name, data]) => ({ name, time: Math.round(data.total / data.count) }))
            .sort((a, b) => b.time - a.time)
            .slice(0, 5);

        // --- CLICKS PER BUTTON ---
        const clicksByButton: Record<string, number> = {};
        clicks.forEach(e => {
            if (!e.element_id) return;
            const key = e.element_id.substring(0, 30);
            clicksByButton[key] = (clicksByButton[key] || 0) + 1;
        });

        const clicksChart = Object.entries(clicksByButton)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        // --- TABLE: Page Stats ---
        const viewsByPage: Record<string, number> = {};
        pageViews.forEach(e => {
            viewsByPage[e.path] = (viewsByPage[e.path] || 0) + 1;
        });

        const pageTable = Object.entries(viewsByPage)
            .map(([page, views]) => {
                const timeData = timeByPage[page];
                const avgSecs = timeData ? Math.round(timeData.total / timeData.count) : 0;
                const avgFormatted = `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`;
                return { page, views, time: avgFormatted };
            })
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        return NextResponse.json({
            kpis: {
                uniqueVisitors,
                totalPageViews,
                totalClicks,
                avgTime: avgTimeFormatted
            },
            trafficChart,
            timePerPage,
            clicksChart,
            pageTable
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
