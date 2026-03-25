import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret-key';

function sign(data: string): string {
    return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

export async function POST(req: Request) {
    try {
        const { email, code, cinNumber, newPassword, verifyToken } = await req.json();

        if (!email || !code || !cinNumber || !newPassword || !verifyToken) {
            return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
        }

        // 1. Decode and verify the signed token (passed from the client state)
        let parts: string[];
        try {
            const decoded = Buffer.from(verifyToken, 'base64').toString('utf8');
            parts = decoded.split('|');
        } catch {
            return NextResponse.json({ error: "Token de vérification invalide." }, { status: 400 });
        }

        if (parts.length !== 4) {
            return NextResponse.json({ error: "Données de vérification invalides." }, { status: 400 });
        }

        const [storedEmail, storedCode, expiresAt, storedSig] = parts;

        // Verify HMAC signature
        const payload = `${storedEmail}|${storedCode}|${expiresAt}`;
        const expectedSig = sign(payload);

        if (expectedSig !== storedSig) {
            return NextResponse.json({ error: "Signature invalide. Veuillez recommencer." }, { status: 400 });
        }

        // Check expiry (10 min)
        if (Date.now() > parseInt(expiresAt)) {
            return NextResponse.json({ error: "Le code a expiré. Veuillez recommencer." }, { status: 400 });
        }

        // Check email and code match
        if (storedEmail !== email || storedCode !== code) {
            return NextResponse.json({ error: "Code de vérification incorrect." }, { status: 400 });
        }

        // 2. Initialize Supabase Admin
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 3. Find profile by email and verify CIN
        // Look up user by email using auth.admin.listUsers
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
            return NextResponse.json({ error: "Erreur serveur lors de la recherche du compte." }, { status: 500 });
        }

        const authUser = users.find(u => u.email === email);
        if (!authUser) {
            return NextResponse.json({ error: "Aucun compte trouvé avec cet email." }, { status: 404 });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, cin_number')
            .eq('id', authUser.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profil introuvable pour ce compte." }, { status: 404 });
        }

        if (profile.cin_number !== cinNumber) {
            return NextResponse.json({ error: "Numéro de CIN incorrect pour ce compte." }, { status: 403 });
        }

        // 4. Update Password
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            profile.id,
            { password: newPassword }
        );

        if (authError) {
            return NextResponse.json({ error: `Erreur lors de la réinitialisation: ${authError.message}` }, { status: 500 });
        }

        // Clear the cookie (best effort) and return success
        const response = NextResponse.json({ success: true, message: "Mot de passe réinitialisé avec succès." });
        response.cookies.set('email_verify', '', { maxAge: 0, path: '/' });
        return response;

    } catch (error: any) {
        console.error("Reset Password API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
