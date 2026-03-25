import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { userId, full_name, phone, gender, age, source, cin_number, email } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID missing' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Core data — columns that ALWAYS exist in profiles
        const coreData: Record<string, any> = {
            full_name: full_name || null,
            phone: phone || null,
            gender: gender || null,
            age: age || null,
            source: source || null,
        };

        const optionalData: Record<string, any> = {};
        if (cin_number) optionalData.cin_number = cin_number;

        console.log('[Profile API] Saving data for user:', userId, { ...coreData, ...optionalData });

        // Update profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ ...coreData, ...optionalData })
            .eq('id', userId);

        if (profileError) {
            console.error('[Profile API] Profile update failed:', profileError.message);
            // We might want to handle the "optional fields" retry logic if needed, 
            // but for now let's focus on notifications
        }

        // --- NOTIFICATIONS & EMAILS ---
        try {
            const { sendEmail } = await import('@/lib/mail');
            const adminEmail = "info@gsm-guide-academy.tn";

            // 1. Notification in Admin Dashboard (DB)
            await supabaseAdmin.from('notifications').insert({
                type: 'new_student',
                title: 'Nouveau Étudiant',
                message: `${full_name} vient de s'inscrire à l'académie.`,
                metadata: { userId, email, phone, source }
            });

            // 2. Email to Student
            const welcomeTemplatePath = path.join(process.cwd(), 'src/lib/email-templates/welcome-student.html');
            if (fs.existsSync(welcomeTemplatePath)) {
                let welcomeHtml = fs.readFileSync(welcomeTemplatePath, 'utf8');
                welcomeHtml = welcomeHtml.replace('{{NAME}}', full_name);

                await sendEmail({
                    to: email,
                    subject: 'Bienvenue à GSM Guide Academy !',
                    html: welcomeHtml,
                });
            }

            // 3. Email to Admin
            const adminTemplatePath = path.join(process.cwd(), 'src/lib/email-templates/admin-notification.html');
            if (fs.existsSync(adminTemplatePath)) {
                let adminHtml = fs.readFileSync(adminTemplatePath, 'utf8');
                adminHtml = adminHtml.replace('{{NAME}}', full_name)
                                    .replace('{{EMAIL}}', email)
                                    .replace('{{PHONE}}', phone)
                                    .replace('{{SOURCE}}', source);

                await sendEmail({
                    to: adminEmail,
                    subject: 'Alerte Admin : Nouveau Étudiant Inscrit',
                    html: adminHtml,
                });
            }

        } catch (notifError) {
            console.error('[Profile API] Notification system error:', notifError);
            // We don't fail the whole registration if notifications fail
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Profile API] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
