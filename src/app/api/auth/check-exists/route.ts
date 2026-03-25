import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { email, cinNumber } = await request.json();

        // 1. Check CIN in public.profiles (accessible via service_role)
        if (cinNumber) {
            const { data: cinData, error: cinError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('cin_number', cinNumber)
                .limit(1);
                
            if (cinError) {
                console.error('[Check Exists] Error checking CIN:', cinError);
            } else if (cinData && cinData.length > 0) {
                return NextResponse.json({ exists: true, reason: 'CIN_EXISTS' });
            }
        }

        // 2. Check Email in auth.users
        // We use listUsers() to fetch users and map over them.
        // This is safe and effective for < 1000 users. For more, an RPC check_email_exists is recommended.
        if (email) {
            const { data: emailExists, error: rpcError } = await supabaseAdmin.rpc('check_email_exists', { p_email: email });
            
            if (rpcError || emailExists === null || emailExists === undefined) {
                // Fallback string matching if RPC doesn't exist yet
                const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                if (usersError) {
                    console.error('[Check Exists] Error listing users:', usersError);
                } else if (usersData?.users) {
                    const exists = usersData.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
                    if (exists) {
                        return NextResponse.json({ exists: true, reason: 'EMAIL_EXISTS' });
                    }
                }
            } else if (emailExists) {
                return NextResponse.json({ exists: true, reason: 'EMAIL_EXISTS' });
            }
        }

        return NextResponse.json({ exists: false });

    } catch (error: any) {
        console.error('[Check Exists] GLOBAL ERROR:', error);
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
}
