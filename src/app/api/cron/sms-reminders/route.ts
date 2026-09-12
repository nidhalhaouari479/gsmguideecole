import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { notifySessionStudents } from '@/lib/winsms';

type Seance = { date?: string; start_time?: string; room?: string };

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: sessions, error } = await admin
        .from('sessions')
        .select('id, schedule, course_id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = Date.now();
    const from = now + 23 * 60 * 60 * 1000;
    const to = now + 25 * 60 * 60 * 1000;
    let reminders = 0;

    for (const session of sessions || []) {
        let seances: Seance[] = [];
        try {
            const parsed = JSON.parse(session.schedule || '{}');
            seances = Array.isArray(parsed.seances) ? parsed.seances : [];
        } catch {
            continue;
        }
        const { data: course } = await admin.from('courses').select('title_fr').eq('id', session.course_id).maybeSingle();

        for (const seance of seances) {
            if (!seance.date || !seance.start_time) continue;
            const start = new Date(`${seance.date}T${seance.start_time}:00+01:00`).getTime();
            if (!Number.isFinite(start) || start < from || start > to) continue;

            await notifySessionStudents({
                sessionId: session.id,
                eventType: 'session_reminder_24h',
                eventKey: `reminder-24h:${session.id}:${seance.date}:${seance.start_time}`,
                message: `GSM Guide: rappel ${course?.title_fr || 'formation'} demain à ${seance.start_time}${seance.room ? `, salle ${seance.room}` : ''}. Merci d'arriver 10 min avant.`,
                metadata: { sessionId: session.id, date: seance.date, startTime: seance.start_time },
            });
            reminders++;
        }
    }

    return NextResponse.json({ success: true, reminders });
}
