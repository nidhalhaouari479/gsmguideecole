import { NextResponse } from 'next/server';
import { verifyStaff } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import { canAccessSession } from '@/lib/staff-session-access';
import { readPaymentHistory } from '@/lib/payment-history';

export async function GET(req: Request) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        if (!await canAccessSession(auth.user.id, auth.role, sessionId)) {
            return NextResponse.json({ error: 'Cette session ne vous est pas attribuée.' }, { status: 403 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Enrollments and catalogue price (used by the admin for per-student discounts), in parallel.
        const [{ data: enrollments, error: enrollError }, { data: sessionInfo }] = await Promise.all([
            supabaseAdmin
                .from('enrollments')
                .select('user_id, status, amount_paid, total_price, receipt_url, created_at')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true }),
            auth.role === 'admin'
                ? supabaseAdmin.from('sessions').select('courses(base_price, sold_price)').eq('id', sessionId).maybeSingle()
                : Promise.resolve({ data: null }),
        ]);

        if (enrollError) throw enrollError;

        if (!enrollments || enrollments.length === 0) {
            return NextResponse.json([]);
        }

        const sessionCourse = (sessionInfo as { courses?: { base_price?: number; sold_price?: number } | { base_price?: number; sold_price?: number }[] } | null)?.courses;
        const course = Array.isArray(sessionCourse) ? sessionCourse[0] : sessionCourse;
        const catalogPrice = Number(course?.sold_price || course?.base_price || 0);

        const userIds = [...new Set(enrollments.map(e => e.user_id))];

        // 2. Profiles for these users
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('id', userIds);

        if (profileError) throw profileError;

        // 3. Auth accounts, only for students whose profile lacks an email or phone.
        //    (Fetched one by one in parallel: listing every account was slow and capped at 50 users.)
        const missingIds = userIds.filter(id => {
            const profile = (profiles || []).find(p => p.id === id);
            return !profile?.email || !profile?.phone;
        });
        const users = (await Promise.all(missingIds.map(async id => {
            const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
            if (error) console.error('Error fetching auth user:', error);
            return data?.user || null;
        }))).filter(user => user !== null);

        // Older data may contain the same student twice in a session: show them only once.
        const uniqueEnrollments = enrollments.filter(
            (enrollment, index) => enrollments.findIndex(e => e.user_id === enrollment.user_id) === index
        );

        const students = uniqueEnrollments.map(enrollment => {
            const profile = (profiles || []).find(p => p.id === enrollment.user_id);
            const authUser = (users || []).find(u => u.id === enrollment.user_id);

            return {
                id: enrollment.user_id,
                full_name: profile?.full_name || 'Sans Nom',
                email: profile?.email || authUser?.email || 'N/A',
                phone: profile?.phone || authUser?.phone || authUser?.user_metadata?.phone || 'N/A',
                status: enrollment.status,
                amount_paid: auth.role === 'admin' ? enrollment.amount_paid : 0,
                total_price: auth.role === 'admin' ? enrollment.total_price : 0,
                catalog_price: catalogPrice,
                payments: auth.role === 'admin'
                    ? readPaymentHistory(enrollment).map((payment, index) => ({ ...payment, index }))
                    : [],
                has_financial_history: Number(enrollment.amount_paid || 0) > 0 || Boolean(enrollment.receipt_url),
                enrolled_at: enrollment.created_at
            };
        });

        return NextResponse.json(students);
    } catch (error: any) {
        console.error('Session Students API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
