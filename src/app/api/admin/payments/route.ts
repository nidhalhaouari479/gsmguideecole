import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Service Role Key missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Fetch raw tables
        const [
            { data: enrollments, error: enError },
            { data: profiles, error: prError },
            { data: sessions, error: seError },
            { data: courses, error: coError }
        ] = await Promise.all([
            supabaseAdmin.from('enrollments').select('*').order('created_at', { ascending: false }),
            supabaseAdmin.from('profiles').select('*'),
            supabaseAdmin.from('sessions').select('*'),
            supabaseAdmin.from('courses').select('id, title_fr, category')
        ]);

        let authUsers: any[] = [];
        try {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
            if (!authError && authData) authUsers = authData.users || [];
        } catch (authErr) {
            console.warn('Auth users fetch failed, falling back to profiles only:', authErr);
        }

        if (enError) throw enError;

        console.log(`[API] Fetched ${enrollments?.length || 0} enrollments, ${profiles?.length || 0} profiles`);

        // 2. Manual Join
        const enriched = (enrollments || []).map(en => {
            const profile = (profiles || []).find(p => p.id === en.user_id);
            const authUser = (authUsers || []).find(u => u.id === en.user_id);

            const session = (sessions || []).find(s => s.id === en.session_id);
            const course = session ? (courses || []).find(c => c.id === session.course_id) : null;

            // Merge profile with auth user data if available
            const studentInfo = {
                full_name: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || 'Sans nom',
                email: profile?.email || authUser?.email || 'N/A',
                phone: profile?.phone || authUser?.user_metadata?.phone || authUser?.phone || null
            };

            return {
                ...en,
                profiles: studentInfo,
                sessions: session ? {
                    ...session,
                    courses: course || null
                } : null
            };
        });

        return NextResponse.json(enriched);
    } catch (error: any) {
        console.error('Admin Payments API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
