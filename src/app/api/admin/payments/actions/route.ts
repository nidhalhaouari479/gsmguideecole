import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import fs from 'fs';
import path from 'path';
import { notifyAdminBySms, notifyUserBySms } from '@/lib/winsms';

export async function POST(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { enrollmentId, status, amount, studentName, studentEmail, courseName } = await req.json();

        if (!enrollmentId || !status) {
            return NextResponse.json({ error: 'ID ou Statut manquant' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // Fetch current enrollment for meta/history
        const { data: enrollment, error: fetchError } = await supabaseAdmin
            .from('enrollments')
            .select('user_id, receipt_url, amount_paid, total_price, status')
            .eq('id', enrollmentId)
            .single();

        if (fetchError) throw fetchError;

        // Update history if status is approved/rejected
        let history: any[] = [];
        try {
            if (enrollment.receipt_url && enrollment.receipt_url.startsWith('[')) {
                history = JSON.parse(enrollment.receipt_url);
                // Mark the latest pending item as the new status
                const latestPendingIdx = history.map(h => h.status).lastIndexOf('pending');
                if (latestPendingIdx !== -1) {
                    history[latestPendingIdx].status = status;
                }
            }
        } catch (e) {
            console.warn("Failed to update history", e);
        }

        const { error: updateError } = await supabaseAdmin
            .from('enrollments')
            .update({ 
                status, 
                amount_paid: amount !== undefined ? amount : enrollment.amount_paid,
                receipt_url: history.length > 0 ? JSON.stringify(history) : enrollment.receipt_url
            })
            .eq('id', enrollmentId);

        if (updateError) throw updateError;

        // --- NOTIFICATIONS & EMAILS ---
        const displayName = studentName || 'Cher étudiant';
        const displayCourse = courseName || 'votre formation';
        const isApproved = status === 'approved';
        const isReservationWithoutPayment = !enrollment.receipt_url;

        // 1. Admin Dashboard Notification (Audit Trail)
        try {
            await supabaseAdmin.from('notifications').insert({
                type: isReservationWithoutPayment
                    ? (isApproved ? 'reservation_approved' : 'reservation_rejected')
                    : (isApproved ? 'payment_approved' : 'payment_rejected'),
                title: isReservationWithoutPayment
                    ? (isApproved ? '✅ Réservation validée' : '❌ Réservation refusée')
                    : (isApproved ? '✅ Paiement validé' : '❌ Paiement rejeté'),
                message: isReservationWithoutPayment
                    ? (isApproved
                        ? `La réservation sans paiement de ${studentName || 'un étudiant'} pour ${displayCourse} a été validée à 0 DT.`
                        : `La réservation sans paiement de ${studentName || 'un étudiant'} pour ${displayCourse} a été refusée.`)
                    : (isApproved
                        ? `Le paiement de ${studentName || 'un étudiant'} pour ${displayCourse} a été approuvé.`
                        : `Le paiement de ${studentName || 'un étudiant'} pour ${displayCourse} a été rejeté.`),
                metadata: { enrollmentId, userId: enrollment.user_id, courseName: displayCourse }
            });
            await notifyAdminBySms({
                eventType: isReservationWithoutPayment
                    ? (isApproved ? 'reservation_approved' : 'reservation_rejected')
                    : (isApproved ? 'payment_approved' : 'payment_rejected'),
                eventKey: `admin-notification:${isReservationWithoutPayment ? 'reservation' : 'payment'}:${enrollmentId}:${status}`,
                message: isReservationWithoutPayment
                    ? `GSM Guide - Réservation ${isApproved ? 'validée' : 'refusée'} : ${studentName || 'Étudiant'}, ${displayCourse}.`
                    : `GSM Guide - Paiement ${isApproved ? 'validé' : 'refusé'} : ${studentName || 'Étudiant'}, ${displayCourse}.`,
                metadata: { enrollmentId, userId: enrollment.user_id, status, courseName: displayCourse },
            });
        } catch (notifErr) {
            console.error('[Action API] DB Notification error:', notifErr);
        }

        // 2. Email to Student
        try {
            if (studentEmail) {
                const { sendEmail } = await import('@/lib/mail');
                const templatePath = path.join(process.cwd(), 'src/lib/email-templates/student-payment-update.html');
                
                if (fs.existsSync(templatePath)) {
                    let html = fs.readFileSync(templatePath, 'utf8');
                    const statusText = isApproved ? 'APPROUVÉ (VALIDÉ)' : 'REJETÉ (ANNULÉ)';
                    const statusClass = isApproved ? 'approved' : 'rejected';
                    const message = isReservationWithoutPayment
                        ? (isApproved
                            ? `Votre réservation sans paiement pour "${displayCourse}" a été validée. Votre place est maintenant confirmée.`
                            : `Votre demande de réservation pour "${displayCourse}" a été refusée. Veuillez nous contacter pour plus d’informations.`)
                        : (isApproved
                            ? `Félicitations ! Votre paiement a été reçu et validé. Vos accès à la formation "${displayCourse}" sont maintenant confirmés.`
                            : `Nous avons rencontré un problème avec votre justificatif de paiement pour "${displayCourse}". Veuillez nous contacter ou soumettre un nouveau justificatif.`);

                    html = html.replace('{{NAME}}', displayName)
                               .replace('{{COURSE}}', displayCourse)
                               .replace('{{STATUS_TEXT}}', statusText)
                               .replace('{{STATUS_CLASS}}', statusClass)
                               .replace('{{MESSAGE}}', message);

                    await sendEmail({
                        to: studentEmail,
                        subject: isReservationWithoutPayment
                            ? (isApproved ? `✅ Réservation validée : ${displayCourse}` : `❌ Réservation refusée : ${displayCourse}`)
                            : (isApproved ? `✅ Paiement validé : ${displayCourse}` : `❌ Problème de paiement : ${displayCourse}`),
                        html: html,
                    });
                }
            }
        } catch (emailErr) {
            console.error('[Action API] Student email error:', emailErr);
        }

        const paid = Number(amount !== undefined ? amount : enrollment.amount_paid) || 0;
        const remaining = Math.max((Number(enrollment.total_price) || 0) - paid, 0);
        await notifyUserBySms({
            userId: enrollment.user_id,
            eventType: isReservationWithoutPayment
                ? (isApproved ? 'reservation_approved' : 'reservation_rejected')
                : (isApproved ? 'payment_approved' : 'payment_rejected'),
            eventKey: `${isReservationWithoutPayment ? 'reservation' : 'payment'}:${enrollmentId}:${status}:${paid}`,
            message: isReservationWithoutPayment
                ? (isApproved
                    ? `GSM Guide: votre réservation pour ${displayCourse} est confirmée.`
                    : `GSM Guide: votre réservation pour ${displayCourse} est refusée. Contactez l'administration.`)
                : (isApproved
                    ? `GSM Guide: paiement validé pour ${displayCourse}. Payé: ${paid} DT. Reste: ${remaining} DT.`
                    : `GSM Guide: votre paiement pour ${displayCourse} est refusé. Contactez l'administration.`),
            metadata: { enrollmentId, paid, remaining, status },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update Payment Action API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
