import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import { notifyUserBySms } from '@/lib/winsms';
import { readPaymentHistory } from '@/lib/payment-history';

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
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
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

        const { data: existingEnrollment, error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .select('id, amount_paid, total_price, receipt_url')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (enrollmentError) throw enrollmentError;

        let enrollment = existingEnrollment;
        if (!enrollment) {
            // Student not yet in this session: enroll them, this payment becomes the first installment.
            const { data: sessionInfo, error: seatsError } = await supabaseAdmin
                .from('sessions')
                .select('seats_available')
                .eq('id', sessionId)
                .single();
            if (seatsError) throw seatsError;

            const { count: reservedCount, error: countError } = await supabaseAdmin
                .from('enrollments')
                .select('id', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .in('status', ['pending', 'approved']);
            if (countError) throw countError;
            if ((reservedCount || 0) >= Number(sessionInfo.seats_available || 0)) {
                return NextResponse.json({ error: 'Cette session est complète.' }, { status: 409 });
            }

            const { data: coursePrice, error: priceError } = await supabaseAdmin
                .from('courses')
                .select('base_price, sold_price')
                .eq('id', session.course_id)
                .single();
            if (priceError || !coursePrice) {
                return NextResponse.json({ error: 'Formation introuvable.' }, { status: 404 });
            }
            const sessionPrice = Number(coursePrice.sold_price || coursePrice.base_price || 0);
            if (sessionPrice > 0 && paymentAmount > sessionPrice) {
                return NextResponse.json(
                    { error: `Le montant dépasse le prix de la session (${sessionPrice.toLocaleString('fr-FR')} DT).` },
                    { status: 400 }
                );
            }

            const { data: created, error: createError } = await supabaseAdmin
                .from('enrollments')
                .insert({
                    user_id: userId,
                    session_id: sessionId,
                    status: 'approved',
                    amount_paid: 0,
                    total_price: sessionPrice,
                    receipt_url: null,
                })
                .select('id, amount_paid, total_price, receipt_url')
                .single();
            if (createError?.code === '23505') {
                return NextResponse.json(
                    { error: 'Cet étudiant est déjà inscrit à cette session. Réessayez.' },
                    { status: 409 }
                );
            }
            if (createError) throw createError;
            enrollment = created;
        }

        const currentPaid = Number(enrollment.amount_paid) || 0;
        const totalPrice = Number(enrollment.total_price) || 0;
        const newTotal = currentPaid + paymentAmount;

        if (totalPrice > 0 && newTotal > totalPrice) {
            const remainingBefore = Math.max(totalPrice - currentPaid, 0);
            return NextResponse.json(
                {
                    error: remainingBefore === 0
                        ? `Cette session est déjà soldée (${currentPaid.toLocaleString('fr-FR')} / ${totalPrice.toLocaleString('fr-FR')} DT). Choisissez une autre session pour enregistrer ce paiement.`
                        : `Le montant dépasse le reste à payer (${remainingBefore.toLocaleString('fr-FR')} DT).`,
                },
                { status: 400 }
            );
        }

        const history = readPaymentHistory(enrollment);
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

        const { data: course } = await supabaseAdmin
            .from('courses')
            .select('title_fr')
            .eq('id', session.course_id)
            .maybeSingle();
        const remaining = Math.max(totalPrice - newTotal, 0);
        await notifyUserBySms({
            userId,
            eventType: remaining === 0 ? 'payment_completed' : 'payment_added',
            eventKey: `manual-payment:${enrollment.id}:${newTotal}`,
            message: remaining === 0
                ? `GSM Guide Academy: paiement de ${paymentAmount} DT enregistré. ${course?.title_fr || 'Formation'} entièrement payée. Merci!`
                : `GSM Guide Academy: paiement de ${paymentAmount} DT enregistré pour ${course?.title_fr || 'votre formation'}. Total payé: ${newTotal} DT. Reste: ${remaining} DT.`,
            metadata: { enrollmentId: enrollment.id, paymentAmount, totalPaid: newTotal, remaining },
        });

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Impossible d’ajouter le paiement.';
        console.error('Manual Payment API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Correct (new amount) or remove an approved payment from a student's session history. */
export async function PATCH(request: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId, sessionId, index, amount, remove = false } = await request.json();
        const entryIndex = Number(index);
        const newAmount = remove ? 0 : Number(amount);

        if (!userId || !sessionId || !Number.isInteger(entryIndex) || entryIndex < 0) {
            return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 400 });
        }
        if (!remove && (!Number.isFinite(newAmount) || newAmount <= 0)) {
            return NextResponse.json({ error: 'Le montant doit être supérieur à 0 DT.' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data: enrollment, error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .select('id, amount_paid, total_price, receipt_url')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (enrollmentError) throw enrollmentError;
        if (!enrollment) {
            return NextResponse.json({ error: 'Cette inscription est introuvable.' }, { status: 404 });
        }

        const history = readPaymentHistory(enrollment);
        const entry = history[entryIndex];
        if (!entry) {
            return NextResponse.json({ error: 'Ce paiement n’existe plus. Rechargez la liste.' }, { status: 404 });
        }
        if (entry.status !== 'approved') {
            return NextResponse.json({ error: 'Seuls les paiements validés peuvent être modifiés.' }, { status: 400 });
        }

        const oldAmount = Number(entry.amount) || 0;
        const currentPaid = Number(enrollment.amount_paid) || 0;
        const totalPrice = Number(enrollment.total_price) || 0;
        const newPaid = Math.max(currentPaid - oldAmount + newAmount, 0);

        if (totalPrice > 0 && newPaid > totalPrice) {
            const maxAmount = Math.max(totalPrice - (currentPaid - oldAmount), 0);
            return NextResponse.json(
                { error: `Le total payé dépasserait le prix (${totalPrice.toLocaleString('fr-FR')} DT). Montant maximum pour ce paiement : ${maxAmount.toLocaleString('fr-FR')} DT.` },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        if (remove) {
            history.splice(entryIndex, 1);
        } else {
            history[entryIndex] = {
                ...entry,
                amount: newAmount,
                original_amount: entry.original_amount ?? oldAmount,
                corrected_at: now,
                corrected_by: auth.user.id,
            };
        }

        const { data, error: updateError } = await supabaseAdmin
            .from('enrollments')
            .update({
                amount_paid: newPaid,
                receipt_url: history.length > 0 ? JSON.stringify(history) : null,
            })
            .eq('id', enrollment.id)
            .select('*')
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Impossible de modifier le paiement.';
        console.error('Payment Correction API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
