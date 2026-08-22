import { NextResponse } from 'next/server';
import { verifyStaff } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import { canAccessSession } from '@/lib/staff-session-access';

export async function POST(req: Request) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId, sessionId } = await req.json();

        if (!userId || !sessionId) {
            return NextResponse.json({ error: 'Étudiant et session requis.' }, { status: 400 });
        }

        if (!await canAccessSession(auth.user.id, auth.role, sessionId)) {
            return NextResponse.json({ error: 'Cette session ne vous est pas attribuée.' }, { status: 403 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Check if enrollment already exists
        const { data: existingEnrollment } = await supabaseAdmin
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .maybeSingle();

        if (existingEnrollment) {
            return NextResponse.json({ error: 'Cet étudiant est déjà inscrit à cette session.' }, { status: 400 });
        }

        // 2. Fetch session and course price
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('sessions')
            .select('course_id, seats_available')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 });
        }

        const { count: enrollmentCount, error: countError } = await supabaseAdmin
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .in('status', ['pending', 'approved']);

        if (countError) throw countError;
        if ((enrollmentCount || 0) >= Number(session.seats_available || 0)) {
            return NextResponse.json({ error: 'Cette session est complète.' }, { status: 409 });
        }

        const { data: course, error: courseError } = await supabaseAdmin
            .from('courses')
            .select('base_price, sold_price')
            .eq('id', session.course_id)
            .single();

        if (courseError || !course) {
            return NextResponse.json({ error: 'Formation introuvable.' }, { status: 404 });
        }

        const totalPrice = course.sold_price || course.base_price;

        // 3. Create enrollment
        const { data, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .insert([{
                user_id: userId,
                session_id: sessionId,
                status: 'approved',
                amount_paid: 0,
                total_price: totalPrice,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (enrollError) throw enrollError;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Manual Enrollment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId, sessionId } = await req.json();
        if (!userId || !sessionId) {
            return NextResponse.json({ error: 'Étudiant et session requis.' }, { status: 400 });
        }

        if (!await canAccessSession(auth.user.id, auth.role, sessionId)) {
            return NextResponse.json({ error: 'Cette session ne vous est pas attribuée.' }, { status: 403 });
        }

        const supabaseAdmin = createAdminClient();

        const { data: enrollment, error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .select('id, amount_paid, receipt_url')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .maybeSingle();

        if (enrollmentError) throw enrollmentError;
        if (!enrollment) {
            return NextResponse.json({ error: 'Cette inscription est introuvable.' }, { status: 404 });
        }
        if (Number(enrollment.amount_paid || 0) > 0 || Boolean(enrollment.receipt_url)) {
            return NextResponse.json(
                { error: 'Impossible de retirer cet étudiant : son inscription contient déjà un paiement ou un justificatif.' },
                { status: 409 }
            );
        }

        const { error: deleteError } = await supabaseAdmin
            .from('enrollments')
            .delete()
            .eq('id', enrollment.id);

        if (deleteError) throw deleteError;

        const { error: attendanceError } = await supabaseAdmin
            .from('attendance_records')
            .delete()
            .eq('user_id', userId)
            .eq('session_id', sessionId);

        if (
            attendanceError
            && attendanceError.code !== '42P01'
            && attendanceError.code !== 'PGRST205'
        ) {
            console.error('Attendance cleanup after enrollment removal failed:', attendanceError);
        }

        return NextResponse.json({
            success: true,
            message: 'Étudiant retiré de la session.'
        });
    } catch (error: any) {
        console.error('Remove Enrollment Error:', error);
        return NextResponse.json(
            { error: error.message || 'Impossible de retirer cet étudiant de la session.' },
            { status: 500 }
        );
    }
}
