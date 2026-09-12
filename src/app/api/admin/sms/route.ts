import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { sendWinSms, WINSMS_MAX_LENGTH } from '@/lib/winsms';

export async function POST(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { phone, message } = await req.json();
        if (typeof phone !== 'string' || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ error: 'Numéro et message requis.' }, { status: 400 });
        }
        if (message.trim().length > WINSMS_MAX_LENGTH) {
            return NextResponse.json({ error: `Maximum ${WINSMS_MAX_LENGTH} caractères.` }, { status: 400 });
        }

        const result = await sendWinSms(phone, message);
        return NextResponse.json(
            result.success ? result : { error: result.message, code: result.code || null },
            { status: result.success ? 200 : 502 }
        );
    } catch (error) {
        console.error('[SMS API]', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Impossible d’envoyer le SMS.' }, { status: 500 });
    }
}
