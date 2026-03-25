import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret-key';

function sign(data: string): string {
    return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
        }

        // Read cookie from request headers
        const cookieHeader = req.headers.get('cookie') || '';
        const cookieMatch = cookieHeader.match(/email_verify=([^;]+)/);
        if (!cookieMatch) {
            return NextResponse.json({ error: "Session expirée. Veuillez renvoyer le code." }, { status: 400 });
        }

        const cookieValue = decodeURIComponent(cookieMatch[1]);
        const parts = cookieValue.split('|');

        if (parts.length !== 4) {
            return NextResponse.json({ error: "Données de vérification invalides." }, { status: 400 });
        }

        const [storedEmail, storedCode, expiresAt, storedSig] = parts;

        // Verify signature
        const payload = `${storedEmail}|${storedCode}|${expiresAt}`;
        const expectedSig = sign(payload);

        if (expectedSig !== storedSig) {
            return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
        }

        // Check expiry
        if (Date.now() > parseInt(expiresAt)) {
            return NextResponse.json({ error: "Le code a expiré. Veuillez en demander un nouveau." }, { status: 400 });
        }

        // Check email and code match
        if (storedEmail !== email || storedCode !== code) {
            return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
        }

        // Success
        const response = NextResponse.json({ success: true, message: "Email vérifié" });
        // We don't clear the cookie here because it might be needed for a subsequent step (like reset-password)
        // or the client might need to prove verification to another endpoint.
        // It will expire naturally in 10 minutes.

        return response;
    } catch (error: any) {
        console.error("Confirm Code Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
