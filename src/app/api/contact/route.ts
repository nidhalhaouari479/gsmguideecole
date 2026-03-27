import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

export async function POST(req: Request) {
    try {
        const { name, email, subject, message } = await req.json();

        if (!name || !email || !subject || !message) {
            return NextResponse.json({ error: 'Tous les champs sont obligatoires.' }, { status: 400 });
        }

        // 1. Send email to Admin
        const adminEmailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #3b82f6;">Nouveau message de contact</h2>
                <p><strong>Nom:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Sujet:</strong> ${subject}</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p style="margin: 0;">${message}</p>
                </div>
            </div>
        `;

        await sendEmail({
            to: process.env.SMTP_USER || 'Gsmguideacademy@gmail.com',
            subject: `Contact: ${subject}`,
            html: adminEmailHtml
        });

        // 2. Send confirmation to User
        const userEmailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; text-align: center;">
                <img src="https://www.gsm-guide-academy.tn/wp-content/uploads/2024/09/Sans-titre-5-copy-1024x966.png" alt="Logo" style="width: 80px; margin-bottom: 20px;">
                <h2 style="color: #a1b83e;">Merci pour votre message !</h2>
                <p style="font-size: 16px; color: #4b5563;">Bonjour <strong>${name}</strong>,</p>
                <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">Nous avons bien reçu votre message concernant <strong>"${subject}"</strong>.</p>
                <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 1px solid #dcfce7;">
                    <p style="font-size: 18px; color: #166534; font-weight: bold; margin: 0;">
                        ⏳ Nous vous recontacterons sous un délai maximum de 2 jours ouvrables.
                    </p>
                </div>
                <p style="font-size: 14px; color: #9ca3af;">L'équipe GSM Guide Academy</p>
            </div>
        `;

        await sendEmail({
            to: email,
            subject: 'Nous avons reçu votre message - GSM Guide Academy',
            html: userEmailHtml
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Contact API Error:', error);
        return NextResponse.json({ error: 'Une erreur est survenue lors de l\'envoi du message.' }, { status: 500 });
    }
}
