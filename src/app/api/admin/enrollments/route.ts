import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId, sessionId } = await req.json();

        if (!userId || !sessionId) {
            return NextResponse.json({ error: 'User ID and Session ID are required' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Check if enrollment already exists
        const { data: existingEnrollment } = await supabaseAdmin
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .single();

        if (existingEnrollment) {
            return NextResponse.json({ error: 'Student already enrolled in this session' }, { status: 400 });
        }

        // 2. Fetch session and course price
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('sessions')
            .select('course_id')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const { data: course, error: courseError } = await supabaseAdmin
            .from('courses')
            .select('base_price, sold_price')
            .eq('id', session.course_id)
            .single();

        if (courseError || !course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
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
