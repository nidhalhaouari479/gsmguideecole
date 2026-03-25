import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request, context: any) {
    try {
        // Handle both Next.js 14 (sync params) and 15 (async params)
        const params = await context.params;
        const id = params.id;

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1. Fetch student profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (profileError) throw profileError;

        // 2. Fetch auth user for email/phone
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
        if (authError) throw authError;

        // 3. Fetch enrollments for this student
        const { data: enrollments, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .select('*')
            .eq('user_id', id)
            .order('created_at', { ascending: false });

        if (enrollError) throw enrollError;

        // 4. For each enrollment, get the session and course info
        const enrichedEnrollments = await Promise.all(
            (enrollments || []).map(async (enrollment) => {
                // Get session info
                const { data: session } = await supabaseAdmin
                    .from('sessions')
                    .select('*')
                    .eq('id', enrollment.session_id)
                    .single();

                // Get course info from sessions course_id
                let course = null;
                if (session?.course_id) {
                    const { data: courseData } = await supabaseAdmin
                        .from('courses')
                        .select('id, title_fr, title_en, category, level, base_price, duration, instructor_name, image_url')
                        .eq('id', session.course_id)
                        .single();
                    course = courseData;
                }

                return {
                    id: enrollment.id,
                    session_id: enrollment.session_id,
                    status: enrollment.status,
                    amount_paid: enrollment.amount_paid || 0,
                    total_price: enrollment.total_price || 0,
                    remaining: (enrollment.total_price || 0) - (enrollment.amount_paid || 0),
                    enrolled_at: enrollment.created_at,
                    payment_date: enrollment.payment_date,
                    session: session ? {
                        id: session.id,
                        start_date: session.start_date,
                        end_date: session.end_date,
                        schedule: session.schedule,
                        seats_available: session.seats_available,
                    } : null,
                    course: course ? {
                        id: course.id,
                        title: course.title_fr || course.title_en,
                        category: course.category,
                        level: course.level,
                        base_price: course.base_price,
                        duration: course.duration,
                        instructor_name: course.instructor_name,
                        image_url: course.image_url,
                    } : null,
                };
            })
        );

        // 5. Aggregate totals
        const totalPaid = (enrollments || []).reduce((sum, en) => {
            let enrollmentPaid = 0;
            if (en.receipt_url && en.receipt_url.startsWith('[')) {
                try {
                    const history = JSON.parse(en.receipt_url);
                    enrollmentPaid = history
                        .filter((h: any) => h.status === 'approved')
                        .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
                } catch (e) {
                    enrollmentPaid = Number(en.amount_paid) || 0;
                }
            } else {
                enrollmentPaid = Number(en.amount_paid) || 0;
            }
            return sum + enrollmentPaid;
        }, 0);

        const totalPrice = (enrollments || []).reduce((sum, en) => sum + (Number(en.total_price) || 0), 0);

        const studentProfile = {
            id: profile.id,
            full_name: profile.full_name || 'Sans nom',
            email: authUser?.email || 'N/A',
            phone: profile.phone || authUser?.phone || 'N/A',
            gender: profile.gender,
            age: profile.age,
            source: profile.source,
            cin_number: profile.cin_number,
            role: profile.role,
            is_blocked: !!profile.is_blocked,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            // Payment summary
            total_paid: totalPaid,
            total_price: totalPrice,
            total_remaining: totalPrice - totalPaid,
            enrollment_count: (enrollments || []).length,
            // Detailed enrollments
            enrollments: enrichedEnrollments,
        };

        return NextResponse.json(studentProfile);
    } catch (error: any) {
        console.error('Student Profile API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function enrolledPayments(enrollments: any[]) {
    return enrollments.reduce((sum, e) => sum + (e.amount_paid || 0), 0);
}

function enrolledTotal(enrollments: any[]) {
    return enrollments.reduce((sum, e) => sum + (e.total_price || 0), 0);
}
