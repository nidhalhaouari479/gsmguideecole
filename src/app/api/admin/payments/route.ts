import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabaseAdmin = createAdminClient();

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

export async function POST(request: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId, courseId, sessionId, amount, note, receiptUrl } = await request.json();
        const paymentAmount = Number(amount);
        const cleanNote = typeof note === 'string' ? note.trim() : '';

        if (!userId || !sessionId) {
            return NextResponse.json(
                { error: 'Étudiant et session requis.' },
                { status: 400 }
            );
        }
        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            return NextResponse.json({ error: 'Le montant doit être supérieur à 0 DT.' }, { status: 400 });
        }
        if (cleanNote.length > 2000) {
            return NextResponse.json(
                { error: 'La remarque ne peut pas dépasser 2000 caractères.' },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('sessions')
            .select('id, course_id')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session || (courseId && session.course_id !== courseId)) {
            return NextResponse.json({ error: 'La session ne correspond pas à la formation choisie.' }, { status: 400 });
        }

        const { data: enrollment, error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .select('id, amount_paid, total_price, receipt_url')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .single();

        if (enrollmentError || !enrollment) {
            return NextResponse.json(
                { error: 'Cet étudiant n’est pas inscrit à cette session.' },
                { status: 404 }
            );
        }

        const currentPaid = Number(enrollment.amount_paid) || 0;
        const totalPrice = Number(enrollment.total_price) || 0;
        const newTotal = currentPaid + paymentAmount;

        if (totalPrice > 0 && newTotal > totalPrice) {
            return NextResponse.json(
                { error: `Le montant dépasse le reste à payer (${Math.max(totalPrice - currentPaid, 0).toLocaleString('fr-FR')} DT).` },
                { status: 400 }
            );
        }

        let history: Array<Record<string, unknown>> = [];
        if (typeof enrollment.receipt_url === 'string' && enrollment.receipt_url.startsWith('[')) {
            try {
                const parsedHistory = JSON.parse(enrollment.receipt_url);
                if (Array.isArray(parsedHistory)) history = parsedHistory;
            } catch {
                history = [];
            }
        } else if (enrollment.receipt_url) {
            history.push({
                url: enrollment.receipt_url,
                amount: currentPaid,
                status: 'approved',
                source: 'legacy',
                date: new Date().toISOString(),
            });
        } else if (currentPaid > 0) {
            history.push({
                url: null,
                amount: currentPaid,
                status: 'approved',
                source: 'existing_balance',
                date: new Date().toISOString(),
            });
        }

        history.push({
            url: typeof receiptUrl === 'string' && receiptUrl.trim() ? receiptUrl.trim() : null,
            amount: paymentAmount,
            status: 'approved',
            source: 'admin',
            date: new Date().toISOString(),
        });

        const updatePayload: Record<string, unknown> = {
            amount_paid: newTotal,
            status: 'approved',
            receipt_url: JSON.stringify(history),
        };
        if (cleanNote) {
            updatePayload.finance_note = cleanNote;
            updatePayload.finance_note_updated_at = new Date().toISOString();
            updatePayload.finance_note_updated_by = auth.user.id;
        }

        const { data, error: updateError } = await supabaseAdmin
            .from('enrollments')
            .update(updatePayload)
            .eq('id', enrollment.id)
            .select('*')
            .single();

        if (updateError) {
            if (updateError.message.includes('finance_note')) {
                return NextResponse.json(
                    { error: 'Exécutez le fichier supabase-finance-comments.sql dans Supabase.' },
                    { status: 500 }
                );
            }
            throw updateError;
        }

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Impossible d’ajouter le paiement.';
        console.error('Manual Payment API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
