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
            { data: courses }
        ] = await Promise.all([
            supabaseAdmin.from('profiles').select('*'),
            supabaseAdmin.from('professeurs').select('*'),
            supabaseAdmin.from('sessions').select('*, courses(*)'),
            supabaseAdmin.from('enrollments').select('*'),
            supabaseAdmin.from('courses').select('*')
        ]);

        // Filter students on the server to handle null roles correctly
        const students = (rawProfiles || []).filter(p => !p.role || p.role === 'student');

        return NextResponse.json({
            students: students || [],
            teachers: teachers || [],
            sessions: sessions || [],
            enrollments: enrollments || [],
            courses: courses || []
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
