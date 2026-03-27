import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabaseAdmin = createAdminClient();

        // Fetch all tables separately to avoid schema cache join errors
        const [
            { data: sessions, error: seError },
            { data: courses, error: coError },
            { data: professeurs, error: prError },
            { data: enrollments, error: enError }
        ] = await Promise.all([
            supabaseAdmin.from('sessions').select('*').order('start_date', { ascending: true }),
            supabaseAdmin.from('courses').select('id, title_fr, category, base_price, image_url, instructor_id'),
            supabaseAdmin.from('professeurs').select('id, nom, prenom'),
            supabaseAdmin.from('enrollments').select('session_id, status')
        ]);

        if (seError) throw seError;
        if (coError) throw coError;
        if (prError) throw prError;
        if (enError) throw enError;

        const sessionsWithStats = (sessions || []).map(session => {
            const course = (courses || []).find(c => c.id === session.course_id);
            
            // Extract instructor_id from JSON schedule if available
            let instructorIdFromSession = null;
            try {
                const parsed = JSON.parse(session.schedule);
                instructorIdFromSession = parsed.instructor_id;
            } catch (e) {}

            const instructor = (professeurs || []).find(p => p.id === (instructorIdFromSession || course?.instructor_id));
            const sessionEnrollments = (enrollments || []).filter(e => e.session_id === session.id);
            const confirmedCount = sessionEnrollments.filter(e => e.status === 'approved').length;
            const pendingCount = sessionEnrollments.filter(e => e.status === 'pending').length;

            return {
                ...session,
                courses: course || null,
                instructor: instructor ? {
                    id: instructor.id,
                    full_name: `${instructor.nom} ${instructor.prenom}`,
                    email: '' // Fallback
                } : null,
                stats: {
                    total_enrollments: sessionEnrollments.length,
                    confirmed: confirmedCount,
                    pending: pendingCount
                }
            };
        });

        return NextResponse.json(sessionsWithStats);
    } catch (error: any) {
        console.error('Sessions API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { course_id, instructor_id, seats_available, seances, schedule: globalSchedule } = body;

        if (!course_id || !seats_available || !seances || seances.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sortedSeances = [...seances].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const start_date = sortedSeances[0].date;
        const end_date = sortedSeances[sortedSeances.length - 1].date;

        const scheduleWithData = JSON.stringify({
            label: globalSchedule || 'Personalized',
            seances: seances,
            instructor_id: instructor_id || null
        });

        const supabaseAdmin = createAdminClient();

        const { data, error } = await supabaseAdmin
            .from('sessions')
            .insert([{
                course_id,
                seats_available,
                start_date,
                end_date,
                schedule: scheduleWithData
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Create Session Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { id, course_id, instructor_id, seats_available, seances, schedule: globalSchedule } = body;

        if (!id || !course_id || !seats_available || !seances || seances.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sortedSeances = [...seances].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const start_date = sortedSeances[0].date;
        const end_date = sortedSeances[sortedSeances.length - 1].date;

        const scheduleWithData = JSON.stringify({
            label: globalSchedule || 'Personalized',
            seances: seances,
            instructor_id: instructor_id || null
        });

        const supabaseAdmin = createAdminClient();

        const { data, error } = await supabaseAdmin
            .from('sessions')
            .update({
                course_id,
                seats_available,
                start_date,
                end_date,
                schedule: scheduleWithData
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Update Session Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('sessions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Session Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
