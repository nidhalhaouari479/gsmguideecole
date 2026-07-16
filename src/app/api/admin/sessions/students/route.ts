import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Fetch enrollments for this session
        const { data: enrollments, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .select(`
                user_id,
                status,
                amount_paid,
                total_price,
                receipt_url,
                created_at
            `)
            .eq('session_id', sessionId);

        if (enrollError) throw enrollError;

        if (!enrollments || enrollments.length === 0) {
            return NextResponse.json([]);
        }

        const userIds = enrollments.map(e => e.user_id);

        // 2. Fetch profiles for these users
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('id', userIds);

        if (profileError) throw profileError;

        // 3. Fetch auth users to get emails (profiles might be missing them)
        // Note: For a small number of users, we can just list them or fetch individually.
        // Since this is for a specific session (max seats usually small), listing all might be overkill if many users,
        // but Supabase listUsers doesn't support 'in' filter easily for many IDs without a loop or custom RPC.
        // However, for admin panel, we can afford a bit of overhead or just rely on profiles if they have emails.
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) {
            console.error('Error fetching auth users:', authError);
            // Non-blocking, we'll use profiles data
        }

        const students = enrollments.map(enrollment => {
            const profile = (profiles || []).find(p => p.id === enrollment.user_id);
            const authUser = (users || []).find(u => u.id === enrollment.user_id);

            return {
                id: enrollment.user_id,
                full_name: profile?.full_name || 'Sans Nom',
                email: profile?.email || authUser?.email || 'N/A',
                phone: profile?.phone || authUser?.phone || authUser?.user_metadata?.phone || 'N/A',
                status: enrollment.status,
                amount_paid: enrollment.amount_paid,
                total_price: enrollment.total_price,
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
