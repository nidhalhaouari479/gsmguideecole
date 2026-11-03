/**
 * The middleware already verifies the user and role for /api/admin/*.
 * It forwards the result in these headers, signed with a token derived from the service role key,
 * so route handlers can skip a second round trip to Supabase. A client cannot forge the token.
 */
export const STAFF_USER_HEADER = 'x-gsm-staff-user';
export const STAFF_ROLE_HEADER = 'x-gsm-staff-role';
export const STAFF_TOKEN_HEADER = 'x-gsm-staff-token';

let cachedToken: Promise<string> | null = null;

export const internalStaffToken = () => {
    if (!cachedToken) {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        cachedToken = key
            ? crypto.subtle
                .digest('SHA-256', new TextEncoder().encode(`gsm-staff:${key}`))
                .then(buffer => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join(''))
            : Promise.resolve('');
    }
    return cachedToken;
};
