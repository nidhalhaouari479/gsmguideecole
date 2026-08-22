import { NextResponse } from 'next/server';
import { verifyStaff } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import { canAccessSession } from '@/lib/staff-session-access';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type Seance = {
    date: string;
    start_time: string;
    end_time?: string;
};

const makeSeanceKey = (seance: Seance) =>
    `${seance.date}|${seance.start_time}|${seance.end_time || ''}`;

const parseSeances = (schedule: string): Seance[] => {
    try {
        const parsed = JSON.parse(schedule);
        return Array.isArray(parsed?.seances) ? parsed.seances : [];
    } catch {
        return [];
    }
};

export async function GET(req: Request) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        const seanceKey = searchParams.get('seanceKey');

        if (!sessionId || !seanceKey) {
            return NextResponse.json({ error: 'Session et séance requises.' }, { status: 400 });
        }

        if (!await canAccessSession(auth.user.id, auth.role, sessionId)) {
            return NextResponse.json({ error: 'Cette session ne vous est pas attribuée.' }, { status: 403 });
        }

        const supabaseAdmin = createAdminClient();
        const { data: enrollments, error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .select('user_id, status')
            .eq('session_id', sessionId)
            .eq('status', 'approved');

        if (enrollmentError) throw new Error(enrollmentError.message);
        if (!enrollments?.length) return NextResponse.json([]);

        const userIds = enrollments.map((enrollment) => enrollment.user_id);

        const [
            { data: profiles, error: profileError },
            { data: attendance, error: attendanceError },
            { data: authUsersData, error: authUsersError },
        ] = await Promise.all([
            supabaseAdmin.from('profiles').select('id, full_name, phone').in('id', userIds),
            supabaseAdmin
                .from('attendance_records')
                .select('user_id, status, arrival_time, note')
                .eq('session_id', sessionId)
                .eq('seance_key', seanceKey),
            supabaseAdmin.auth.admin.listUsers(),
        ]);

        if (profileError) throw new Error(profileError.message);
        if (attendanceError) throw new Error(attendanceError.message);
        if (authUsersError) console.error('[Presence API] Auth users error:', authUsersError);

        const students = userIds.map((userId) => {
            const profile = (profiles || []).find((item) => item.id === userId);
            const authUser = authUsersData?.users?.find((item) => item.id === userId);
            const record = (attendance || []).find((item) => item.user_id === userId);

            return {
                user_id: userId,
                full_name: profile?.full_name || authUser?.user_metadata?.full_name || 'Sans nom',
                email: authUser?.email || 'N/A',
                phone: profile?.phone || authUser?.phone || 'N/A',
                status: (record?.status || 'present') as AttendanceStatus,
                arrival_time: record?.arrival_time?.slice(0, 5) || '09:00',
                note: record?.note || '',
            };
        });

        return NextResponse.json(students);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur de chargement des présences.';
        console.error('[Presence API] GET error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { sessionId, seance, records } = await req.json() as {
            sessionId: string;
            seance: Seance;
            records: Array<{
                user_id: string;
                status: AttendanceStatus;
                arrival_time: string;
                note?: string;
            }>;
        };

        if (!sessionId || !seance?.date || !seance?.start_time || !Array.isArray(records)) {
            return NextResponse.json({ error: 'Données de présence incomplètes.' }, { status: 400 });
        }

        if (!await canAccessSession(auth.user.id, auth.role, sessionId)) {
            return NextResponse.json({ error: 'Cette session ne vous est pas attribuée.' }, { status: 403 });
        }

        const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
        if (records.some((record) => !validStatuses.includes(record.status))) {
            return NextResponse.json({ error: 'Un état de présence est invalide.' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('sessions')
            .select('schedule')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 });
        }

        const seanceKey = makeSeanceKey(seance);
        const sessionSeances = parseSeances(session.schedule);
        if (!sessionSeances.some((item) => makeSeanceKey(item) === seanceKey)) {
            return NextResponse.json({ error: 'Cette séance ne correspond pas à la session.' }, { status: 400 });
        }

        const { data: approvedEnrollments, error: enrollmentsError } = await supabaseAdmin
            .from('enrollments')
            .select('user_id')
            .eq('session_id', sessionId)
            .eq('status', 'approved');

        if (enrollmentsError) throw new Error(enrollmentsError.message);
        const approvedUserIds = new Set((approvedEnrollments || []).map((item) => item.user_id));

        const rows = records
            .filter((record) => approvedUserIds.has(record.user_id))
            .map((record) => ({
                session_id: sessionId,
                user_id: record.user_id,
                seance_key: seanceKey,
                seance_date: seance.date,
                scheduled_start: seance.start_time,
                scheduled_end: seance.end_time || null,
                status: record.status,
                arrival_time: record.status === 'absent' ? null : (record.arrival_time || '09:00'),
                note: record.note?.trim() || null,
                recorded_by: auth.user.id,
            }));

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Aucun étudiant validé dans cette session.' }, { status: 400 });
        }

        const { error: upsertError } = await supabaseAdmin
            .from('attendance_records')
            .upsert(rows, { onConflict: 'session_id,seance_key,user_id' });

        if (upsertError) throw new Error(upsertError.message);

        return NextResponse.json({ success: true, saved: rows.length });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.';
        console.error('[Presence API] POST error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
