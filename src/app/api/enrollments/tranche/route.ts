import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { enrollmentId, receiptUrl, studentName, studentEmail, courseName, amount } = await req.json();

        if (!enrollmentId || !receiptUrl) {
            return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Fetch current enrollment to get history
        const { data: enrollment, error: fetchError } = await supabaseAdmin
            .from('enrollments')
            .select('receipt_url, amount_paid, created_at, status, user_id')
            .eq('id', enrollmentId)
            .single();

        if (fetchError) throw fetchError;

        let history: any[] = [];
        try {
            if (enrollment.receipt_url && enrollment.receipt_url.startsWith('[')) {
                history = JSON.parse(enrollment.receipt_url);
            } else if (enrollment.receipt_url) {
                history = [{
                    url: enrollment.receipt_url,
                    amount: enrollment.amount_paid || 0,
                    date: enrollment.created_at,
                    status: enrollment.status || 'approved'
                }];
            }
        } catch (e) {
            console.warn("Failed to parse history, resetting", e);
        }

        // Parse amount from URL hash or from body
        const amountMatch = receiptUrl.match(/amount=(\d+)/);
        const declaredAmount = amount || (amountMatch ? parseInt(amountMatch[1]) : 0);

        history.push({
            url: receiptUrl,
            amount: declaredAmount,
            date: new Date().toISOString(),
            status: 'pending'
        });

        const { error } = await supabaseAdmin
            .from('enrollments')
            .update({ receipt_url: JSON.stringify(history), status: 'pending' })
            .eq('id', enrollmentId);

        if (error) throw error;

        // --- NOTIFICATIONS & EMAILS ---
        const displayName = studentName || 'Un étudiant';
        const displayCourse = courseName || 'une formation';
        const amountStr = declaredAmount ? ` de ${declaredAmount} DT` : '';

        // 1. Dashboard Notification
        try {
            await supabaseAdmin.from('notifications').insert({
                type: 'payment_submitted',
                title: '💳 Nouveau Paiement Soumis',
                message: `${displayName} a soumis un justificatif de paiement${amountStr} pour ${displayCourse}. En attente de validation.`,
                metadata: {
                    enrollmentId,
                    userId: enrollment.user_id,
                    studentEmail: studentEmail || null,
                    amount: declaredAmount,
                    courseName: displayCourse
                }
            });
        } catch (notifErr) {
            console.error('[Tranche API] DB Notification error:', notifErr);
        }

        // 2. Email to Admin
        try {
            const { sendEmail } = await import('@/lib/mail');
            const templatePath = path.join(process.cwd(), 'src/lib/email-templates/admin-payment-notification.html');
            
            if (fs.existsSync(templatePath)) {
                let html = fs.readFileSync(templatePath, 'utf8');
                html = html.replace('{{NAME}}', displayName)
                           .replace('{{EMAIL}}', studentEmail || 'N/A')
                           .replace('{{COURSE}}', displayCourse)
                           .replace('{{AMOUNT}}', (declaredAmount || 0).toString());

                await sendEmail({
                    to: 'info@gsm-guide-academy.tn',
                    subject: `💳 Alerte Paiement : ${displayName} (${displayCourse})`,
                    html: html,
                });
            }
        } catch (emailErr) {
            console.error('[Tranche API] Email notification error:', emailErr);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Submit Tranche API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
