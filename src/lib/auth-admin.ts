import { createSSRClient } from './supabase-server';

export const verifyAdmin = async () => {
    const supabase = await createSSRClient();
    
    // Use getUser() for security as it re-validates the session on each call
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { error: 'Unauthorized', status: 401 };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { error: 'Forbidden', status: 403 };
    }

    return { user };
};
