import { sendEmail } from '@/lib/mail';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret-key';

function sign(data: string): string {
    return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email requis" }, { status: 400 });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Sign the payload and return it as a token to the client
        const payload = `${email}|${code}|${expiresAt}`;
        const signature = sign(payload);
        // Token format: base64(email|code|expiresAt|signature)
        const verifyToken = Buffer.from(`${payload}|${signature}`).toString('base64');

        // Load HTML template
        const templatePath = path.join(process.cwd(), 'src/app/api/auth/verify-email/template.html');
        let html = fs.readFileSync(templatePath, 'utf8');
        html = html.replace('{{CODE}}', code);

        // Send Email via Nodemailer
        try {
            await sendEmail({
                to: email,
                subject: 'Votre code de vérification - GSM Guide Academy',
                html: html,
            });
        } catch (mailError: any) {
            console.error("Mail Error:", mailError);
            return NextResponse.json({ error: `Erreur d'envoi email: ${mailError.message || 'Problème de connexion SMTP'}` }, { status: 500 });
        }

        // Return the verify token in the response body (stored in client state, NOT cookies)
        // Also still set cookie for backward compat with registration confirm-code flow
        const response = NextResponse.json({ success: true, message: "Code envoyé", verifyToken });
        response.cookies.set('email_verify', `${payload}|${signature}`, {
            httpOnly: true,
            path: '/',
            maxAge: 600,
            sameSite: 'lax',
        });

        return response;
    } catch (error: any) {
        console.error("Verify Email Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
