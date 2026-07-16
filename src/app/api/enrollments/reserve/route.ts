import { NextResponse } from 'next/server';
import { createAdminClient, createSSRClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const supabase = await createSSRClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Vous devez être connecté pour réserver.' }, { status: 401 });
        }

        const { sessionId, receiptUrl, declaredAmount } = await req.json();
        if (!sessionId) {
            return NextResponse.json({ error: 'Session manquante.' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { data: existingEnrollment, error: existingError } = await supabaseAdmin
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('session_id', sessionId)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existingEnrollment) {
            return NextResponse.json(
                { error: 'Vous avez déjà réservé une place dans cette session.' },
                { status: 409 }
            );
        }

        const { data: session, error: sessionError } = await supabaseAdmin
            .from('sessions')
            .select('id, course_id, seats_available')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 });
        }

        const { count: reservedCount, error: countError } = await supabaseAdmin
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .in('status', ['pending', 'approved']);

        if (countError) throw countError;
        if ((reservedCount || 0) >= Number(session.seats_available || 0)) {
            return NextResponse.json({ error: 'Cette session est complète.' }, { status: 409 });
        }

        const { data: course, error: courseError } = await supabaseAdmin
            .from('courses')
            .select('title_fr, base_price, sold_price, reservation_amount')
            .eq('id', session.course_id)
            .single();

        if (courseError || !course) {
            return NextResponse.json({ error: 'Formation introuvable.' }, { status: 404 });
        }

        const totalPrice = Number(course.sold_price || course.base_price || 0);
        const reservationAmount = Number(course.reservation_amount ?? 400);
        const hasReceipt = Boolean(receiptUrl);
        const amount = hasReceipt ? Math.max(0, Number(declaredAmount) || 0) : 0;

        if (hasReceipt && amount < reservationAmount) {
            return NextResponse.json(
                { error: `Le montant minimum pour cette formation est de ${reservationAmount} DT.` },
                { status: 400 }
            );
        }
        if (amount > totalPrice) {
            return NextResponse.json(
                { error: `Le montant versé ne peut pas dépasser le prix total de ${totalPrice} DT.` },
                { status: 400 }
            );
        }

        const { data: enrollment, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .insert({
                user_id: user.id,
                session_id: sessionId,
                total_price: totalPrice,
                amount_paid: 0,
                receipt_url: receiptUrl || null,
                status: 'pending',
            })
            .select('id')
            .single();

        if (enrollError) throw enrollError;

        const studentName = user.user_metadata?.full_name || user.email || 'Un étudiant';
        const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert({
                type: hasReceipt ? 'payment_submitted' : 'reservation_submitted',
                title: hasReceipt ? '💳 Nouveau paiement soumis' : '📅 Nouvelle réservation sans paiement',
                message: hasReceipt
                    ? `${studentName} a réservé ${course.title_fr} avec un justificatif de ${amount} DT.`
                    : `${studentName} a réservé ${course.title_fr} sans reçu de paiement. Montant reçu : 0 DT.`,
                metadata: {
                    enrollmentId: enrollment.id,
                    userId: user.id,
                    studentEmail: user.email || null,
                    amount,
                    courseName: course.title_fr,
                },
            });

        if (notificationError) {
            console.error('[Reserve API] Notification error:', notificationError);
        }

        return NextResponse.json({ success: true, enrollmentId: enrollment.id });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de la réservation.';
        console.error('[Reserve API] Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
