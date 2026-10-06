import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Sessions available in the "Ajouter un paiement" form, so a payment can open
// a new session for a student whose previous session is already fully paid.
export async function GET() {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabaseAdmin = createAdminClient();
        const [
            { data: sessions, error: sessionsError },
            { data: courses, error: coursesError },
            { data: enrollments, error: enrollmentsError },
        ] = await Promise.all([
            supabaseAdmin.from('sessions').select('id, course_id, start_date, seats_available').order('start_date', { ascending: false }),
            supabaseAdmin.from('courses').select('id, title_fr, base_price, sold_price'),
            supabaseAdmin.from('enrollments').select('session_id').in('status', ['pending', 'approved']),
        ]);

        if (sessionsError) throw sessionsError;
        if (coursesError) throw coursesError;
        if (enrollmentsError) throw enrollmentsError;

        const result = (sessions || []).map(session => {
            const course = (courses || []).find(c => c.id === session.course_id);
            const reserved = (enrollments || []).filter(e => e.session_id === session.id).length;
            return {
                id: session.id,
                course_id: session.course_id,
                course_title: course?.title_fr || 'Formation sans nom',
                start_date: session.start_date,
                price: Number(course?.sold_price || course?.base_price || 0),
                seats_left: Math.max(Number(session.seats_available || 0) - reserved, 0),
            };
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('Payment Sessions API Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Impossible de charger les sessions.' },
            { status: 500 }
        );
    }
}
