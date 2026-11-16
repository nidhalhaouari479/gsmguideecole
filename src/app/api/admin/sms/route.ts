import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import { logSms, normalizeSmsPhone, sendWinSms, WINSMS_MAX_LENGTH } from '@/lib/winsms';

const MAX_ROWS = 2000;

/** History of every SMS recorded in the journal, newest first, with the recipient's name. */
export async function GET() {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const admin = createAdminClient();
        const { data: rows, error } = await admin
            .from('sms_notifications')
            .select('id, user_id, phone, event_type, message, status, error_message, provider_reference, metadata, sent_at, created_at')
            .order('created_at', { ascending: false })
            .limit(MAX_ROWS);

        if (error) {
            if (['42P01', 'PGRST205'].includes(error.code || '')) {
                return NextResponse.json({
                    error: 'La table « sms_notifications » n’existe pas encore dans Supabase. Exécutez le fichier supabase-sms-notifications.sql dans le SQL Editor pour activer l’historique.',
                }, { status: 503 });
            }
            throw error;
        }

        const userIds = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))] as string[];
        const names = new Map<string, string>();
        for (let i = 0; i < userIds.length; i += 200) {
            const { data: profiles } = await admin
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds.slice(i, i + 200));
            (profiles || []).forEach(p => { if (p.full_name) names.set(p.id, p.full_name); });
        }

        return NextResponse.json((rows || []).map(row => {
            const metadata = (row.metadata || {}) as Record<string, unknown>;
            const recipientName = metadata.recipient === 'admin'
                ? 'Administrateur'
                : (row.user_id && names.get(row.user_id))
                    || (typeof metadata.recipientName === 'string' ? metadata.recipientName : null);
            return {
                id: row.id,
                phone: row.phone,
                recipient_name: recipientName,
                recipient_type: metadata.recipient === 'admin' ? 'admin' : 'student',
                event_type: row.event_type,
                message: row.message,
                status: row.status,
                error_message: row.error_message,
                provider_reference: row.provider_reference,
                created_at: row.sent_at || row.created_at,
            };
        }));
    } catch (error) {
        console.error('[SMS API] History:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Impossible de charger l’historique SMS.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { phone, message, userId, recipientName } = await req.json();
        if (typeof phone !== 'string' || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ error: 'Numéro et message requis.' }, { status: 400 });
        }
        if (message.trim().length > WINSMS_MAX_LENGTH) {
            return NextResponse.json({ error: `Maximum ${WINSMS_MAX_LENGTH} caractères.` }, { status: 400 });
        }

        const result = await sendWinSms(phone, message);
        await logSms({
            userId: typeof userId === 'string' && userId ? userId : null,
            phone: normalizeSmsPhone(phone),
            eventType: 'manual',
            eventKey: `manual:${crypto.randomUUID()}`,
            message,
            result,
            metadata: {
                sentBy: auth.user.id,
                recipientName: typeof recipientName === 'string' ? recipientName : null,
            },
        });
        return NextResponse.json(
            result.success ? result : { error: result.message, code: result.code || null },
            { status: result.success ? 200 : 502 }
        );
    } catch (error) {
        console.error('[SMS API]', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Impossible d’envoyer le SMS.' }, { status: 500 });
    }
}
