import { NextResponse } from 'next/server';
import { verifyAdmin, verifyStaff } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: Request, context: any) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        // Handle both Next.js 14 (sync params) and 15 (async params)
        const params = await context.params;
        const id = params.id;

        const supabaseAdmin = createAdminClient();

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
            admin_note: profile.admin_note || '',
            admin_note_updated_at: profile.admin_note_updated_at || null,
            created_at: profile.created_at,
            // Payment summary
            total_paid: auth.role === 'admin' ? totalPaid : 0,
            total_price: auth.role === 'admin' ? totalPrice : 0,
            total_remaining: auth.role === 'admin' ? totalPrice - totalPaid : 0,
            enrollment_count: (enrollments || []).length,
            // Detailed enrollments
            enrollments: auth.role === 'admin' ? enrichedEnrollments : enrichedEnrollments.map(enrollment => ({
                ...enrollment,
                amount_paid: 0,
                total_price: 0,
                remaining: 0,
                course: enrollment.course ? { ...enrollment.course, base_price: 0 } : null
            })),
        };

        return NextResponse.json(studentProfile);
    } catch (error: any) {
        console.error('Student Profile API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: any) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const params = await context.params;
        const id = params.id;
        const { note } = await req.json();

        if (typeof note !== 'string') {
            return NextResponse.json({ error: 'Remarque invalide.' }, { status: 400 });
        }

        const cleanNote = note.trim();
        if (cleanNote.length > 3000) {
            return NextResponse.json(
                { error: 'La remarque ne peut pas dépasser 3000 caractères.' },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                admin_note: cleanNote || null,
                admin_note_updated_at: new Date().toISOString(),
                admin_note_updated_by: auth.user.id,
            })
            .eq('id', id)
            .select('id, admin_note, admin_note_updated_at')
            .single();

        if (error) {
            if (error.message.includes('admin_note')) {
                return NextResponse.json(
                    { error: 'Exécutez le fichier supabase-student-comments.sql dans Supabase.' },
                    { status: 500 }
                );
            }
            throw new Error(error.message);
        }

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.';
        console.error('Student Note API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function enrolledPayments(enrollments: any[]) {
    return enrollments.reduce((sum, e) => sum + (e.amount_paid || 0), 0);
}

function enrolledTotal(enrollments: any[]) {
    return enrollments.reduce((sum, e) => sum + (e.total_price || 0), 0);
}
