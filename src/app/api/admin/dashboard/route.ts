import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
