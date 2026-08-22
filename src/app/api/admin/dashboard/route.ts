import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabaseAdmin = createAdminClient();

        const [
            { data: rawProfiles },
            { data: teachers },
            { data: sessions },
            { data: enrollments },
            { data: courses },
            { data: sessionRequests },
            { data: attendance }
        ] = await Promise.all([
            supabaseAdmin.from('profiles').select('*'),
            supabaseAdmin.from('professeurs').select('*'),
            supabaseAdmin.from('sessions').select('*, courses(*)'),
            supabaseAdmin.from('enrollments').select('*'),
            supabaseAdmin.from('courses').select('*'),
            supabaseAdmin.from('session_requests').select('*, courses(title_fr)').order('created_at', { ascending: false }),
            supabaseAdmin.from('attendance_records').select('status, seance_date, session_id')
        ]);

        // Filter students on the server to handle null roles correctly
        const students = (rawProfiles || []).filter(p => !p.role || p.role === 'student');

        return NextResponse.json({
            students: students || [],
            teachers: teachers || [],
            sessions: sessions || [],
            enrollments: enrollments || [],
            courses: courses || [],
            sessionRequests: sessionRequests || [],
            attendance: attendance || []
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
