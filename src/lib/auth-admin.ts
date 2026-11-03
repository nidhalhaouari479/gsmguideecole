import { headers } from 'next/headers';
import { createSSRClient } from './supabase-server';
import { STAFF_ROLE_HEADER, STAFF_TOKEN_HEADER, STAFF_USER_HEADER, internalStaffToken } from './internal-auth';

type StaffRole = 'admin' | 'professor';

/** Role already verified by the middleware for this request, if any. */
const getVerifiedStaff = async () => {
    const requestHeaders = await headers();
    const token = requestHeaders.get(STAFF_TOKEN_HEADER);
    const userId = requestHeaders.get(STAFF_USER_HEADER);
    const role = requestHeaders.get(STAFF_ROLE_HEADER);
    const expected = await internalStaffToken();

    if (!expected || token !== expected || !userId || (role !== 'admin' && role !== 'professor')) return null;
    return { user: { id: userId }, role: role as StaffRole };
};

const fetchStaff = async () => {
    const verified = await getVerifiedStaff();
    if (verified) return verified;

    const supabase = await createSSRClient();
    // Use getUser() for security as it re-validates the session on each call
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return { user: { id: user.id }, role: profile?.role as string | undefined };
};

export const verifyAdmin = async () => {
    const staff = await fetchStaff();
    if (!staff) return { error: 'Unauthorized', status: 401 };
    if (staff.role !== 'admin') {
        return { error: 'Forbidden', status: 403 };
    }
    return { user: staff.user };
};

export const verifyStaff = async () => {
    const staff = await fetchStaff();
    if (!staff) return { error: 'Unauthorized', status: 401 };
    if (staff.role !== 'admin' && staff.role !== 'professor') {
        return { error: 'Forbidden', status: 403 };
    }
    return { user: staff.user, role: staff.role as StaffRole };
};
