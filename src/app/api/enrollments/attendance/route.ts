import { NextResponse } from 'next/server';
import { createAdminClient, createSSRClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const supabase = await createSSRClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        if (!sessionId) {
            return NextResponse.json({ error: 'Session manquante.' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data: enrollment, error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .select('id, status')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .neq('status', 'rejected')
            .maybeSingle();

        if (enrollmentError) throw new Error(enrollmentError.message);
        if (!enrollment) {
            return NextResponse.json({ error: 'Inscription introuvable.' }, { status: 403 });
        }

        const { data: attendance, error: attendanceError } = await supabaseAdmin
            .from('attendance_records')
            .select('seance_key, status, arrival_time, note')
            .eq('session_id', sessionId)
            .eq('user_id', user.id);

        if (attendanceError) throw new Error(attendanceError.message);

        return NextResponse.json(attendance || []);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur de chargement des présences.';
        console.error('[Student Attendance API] Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
