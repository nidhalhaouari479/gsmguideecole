import { createAdminClient } from '@/lib/supabase-server';

const WINSMS_ENDPOINT = 'https://www.winsmspro.com/sms/sms/api';
export const WINSMS_MAX_LENGTH = 157;

type SmsMetadata = Record<string, string | number | boolean | null | undefined>;

export type SmsResult = {
    success: boolean;
    message: string;
    reference?: string | null;
    balance?: string | number | null;
    code?: string | null;
};

export const normalizeSmsPhone = (value: string) => {
    let phone = value.replace(/\D/g, '');
    if (phone.startsWith('00')) phone = phone.slice(2);
    if (phone.length === 8) phone = `216${phone}`;
    return phone;
};

export const compactSms = (message: string) => {
    const clean = message.replace(/\s+/g, ' ').trim();
    return clean.length <= WINSMS_MAX_LENGTH
        ? clean
        : `${clean.slice(0, WINSMS_MAX_LENGTH - 1).trimEnd()}…`;
};

const parseProviderResponse = (raw: string) => {
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        const values = new URLSearchParams(raw.replace(/\r?\n/g, '&'));
        return Object.fromEntries(values.entries());
    }
};

export async function sendWinSms(phoneValue: string, messageValue: string): Promise<SmsResult> {
    const apiKey = process.env.WINSMS_API_KEY;
    const senderId = process.env.WINSMS_SENDER_ID?.trim();
    const phone = normalizeSmsPhone(phoneValue);
    const message = compactSms(messageValue);

    if (!apiKey) return { success: false, message: 'Clé API WinSMS non configurée.' };
    if (!senderId) return { success: false, message: 'Sender ID WinSMS non configuré.' };
    if (!/^[a-zA-Z0-9 ]{1,11}$/.test(senderId)) return { success: false, message: 'Sender ID WinSMS invalide.' };
    if (!/^\d{10,15}$/.test(phone)) return { success: false, message: 'Numéro de téléphone invalide.' };
    if (!message) return { success: false, message: 'Message SMS vide.' };

    try {
        const params = new URLSearchParams({
            action: 'send-sms', api_key: apiKey, to: phone, from: senderId,
            sms: message, response: 'json',
        });
        const response = await fetch(`${WINSMS_ENDPOINT}?${params.toString()}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(15_000),
        });
        const result = parseProviderResponse(await response.text());
        const code = String(result.code || '').toLowerCase();
        if (!response.ok || code !== 'ok') {
            return {
                success: false,
                message: typeof result.message === 'string' ? result.message : 'Envoi refusé par WinSMS.',
                code: result.code ? String(result.code) : null,
            };
        }
        return {
            success: true,
            message: 'SMS envoyé avec succès.',
            reference: result.reference ? String(result.reference) : null,
            balance: typeof result.balance === 'string' || typeof result.balance === 'number' ? result.balance : null,
            code: 'ok',
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error && error.name === 'TimeoutError'
                ? 'WinSMS ne répond pas.'
                : 'Connexion WinSMS impossible.',
        };
    }
}

export async function notifyUserBySms(options: {
    userId: string;
    eventType: string;
    eventKey: string;
    message: string;
    metadata?: SmsMetadata;
}): Promise<SmsResult> {
    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('phone')
        .eq('id', options.userId)
        .maybeSingle();

    const phone = typeof profile?.phone === 'string' ? profile.phone : '';
    if (!phone) return { success: false, message: 'Aucun numéro pour cet utilisateur.' };

    const { data: existing } = await admin
        .from('sms_notifications')
        .select('id')
        .eq('event_key', options.eventKey)
        .eq('status', 'sent')
        .maybeSingle();
    if (existing) return { success: true, message: 'SMS déjà envoyé.' };

    const sms = compactSms(options.message);
    const result = await sendWinSms(phone, sms);
    const { error } = await admin.from('sms_notifications').insert({
        user_id: options.userId,
        phone: normalizeSmsPhone(phone),
        event_type: options.eventType,
        event_key: options.eventKey,
        message: sms,
        status: result.success ? 'sent' : 'failed',
        provider_code: result.code || null,
        provider_reference: result.reference || null,
        error_message: result.success ? null : result.message,
        metadata: options.metadata || {},
        sent_at: result.success ? new Date().toISOString() : null,
    });
    if (error && !['42P01', 'PGRST205'].includes(error.code || '')) {
        console.error('[SMS] Journal error:', error.message);
    }
    if (!result.success) console.error(`[SMS] ${options.eventType}: ${result.message}`);
    return result;
}

/** Envoie une alerte SMS à l'administrateur configuré dans ADMIN_PHONE_NUMBER. */
export async function notifyAdminBySms(options: {
    eventType: string;
    eventKey: string;
    message: string;
    metadata?: SmsMetadata;
}): Promise<SmsResult> {
    const phone = process.env.ADMIN_PHONE_NUMBER?.trim();
    if (!phone) return { success: false, message: 'Numéro administrateur non configuré.' };

    const admin = createAdminClient();
    const { data: existing } = await admin
        .from('sms_notifications')
        .select('id')
        .eq('event_key', options.eventKey)
        .eq('status', 'sent')
        .maybeSingle();
    if (existing) return { success: true, message: 'SMS déjà envoyé.' };

    const sms = compactSms(options.message);
    const result = await sendWinSms(phone, sms);
    const { error } = await admin.from('sms_notifications').insert({
        user_id: null,
        phone: normalizeSmsPhone(phone),
        event_type: options.eventType,
        event_key: options.eventKey,
        message: sms,
        status: result.success ? 'sent' : 'failed',
        provider_code: result.code || null,
        provider_reference: result.reference || null,
        error_message: result.success ? null : result.message,
        metadata: { recipient: 'admin', ...(options.metadata || {}) },
        sent_at: result.success ? new Date().toISOString() : null,
    });
    if (error && !['42P01', 'PGRST205'].includes(error.code || '')) {
        console.error('[SMS] Journal error:', error.message);
    }
    if (!result.success) console.error(`[SMS] ${options.eventType}: ${result.message}`);
    return result;
}

export async function notifySessionStudents(options: {
    sessionId: string;
    eventType: string;
    eventKey: string;
    message: string;
    metadata?: SmsMetadata;
}) {
    const admin = createAdminClient();
    const { data: enrollments } = await admin
        .from('enrollments')
        .select('user_id')
        .eq('session_id', options.sessionId)
        .eq('status', 'approved');

    return Promise.allSettled((enrollments || []).map(({ user_id }) => notifyUserBySms({
        userId: user_id,
        eventType: options.eventType,
        eventKey: `${options.eventKey}:${user_id}`,
        message: options.message,
        metadata: options.metadata,
    })));
}
