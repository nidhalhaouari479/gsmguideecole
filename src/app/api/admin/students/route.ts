import { NextResponse } from 'next/server';
import { verifyStaff } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Fetch all student profiles
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*');

        if (profileError) throw profileError;

        // 2. Fetch all enrollments
        const { data: enrollments, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .select('user_id, amount_paid, total_price, created_at, status, receipt_url');

        if (enrollError) throw enrollError;

        // 3. Fetch all auth users to get emails (profiles might not have them)
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        // 4. Aggregate data
        const studentProfiles = (profiles || []).filter(p => !p.role || p.role === 'student');

        const aggregated = studentProfiles.map(profile => {
            const studentEnrollments = (enrollments || []).filter(en => en.user_id === profile.id);
            const authUser = users.find(u => u.id === profile.id);

            const totalPaid = studentEnrollments.reduce((sum, en) => {
                let enrollmentPaid = 0;
                if (en.receipt_url && en.receipt_url.startsWith('[')) {
                    try {
                        const history = JSON.parse(en.receipt_url);
                        enrollmentPaid = history
                            .filter((h: any) => h.status === 'approved')
                            .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
                    } catch (e) {
                        enrollmentPaid = Number(en.amount_paid) || 0;
                    }
                } else {
                    enrollmentPaid = Number(en.amount_paid) || 0;
                }
                return sum + enrollmentPaid;
            }, 0);

            const totalPrice = studentEnrollments.reduce((sum, en) => sum + (Number(en.total_price) || 0), 0);

            const lastEnrollment = studentEnrollments.length > 0
                ? studentEnrollments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
                : null;

            return {
                id: profile.id,
                full_name: profile.full_name || 'Sans nom',
                email: profile.email || authUser?.email || 'N/A',
                phone: profile.phone || authUser?.phone || authUser?.user_metadata?.phone || 'N/A',
                age: profile.age,
                source: profile.source,
                gender: profile.gender,
                cin_number: profile.cin_number,
                is_blocked: !!authUser?.user_metadata?.is_blocked,
                enrollment_count: studentEnrollments.length,
                total_paid: auth.role === 'admin' ? totalPaid : 0,
                total_remaining: auth.role === 'admin' ? totalPrice - totalPaid : 0,
                last_enrollment: lastEnrollment,
                created_at: profile.created_at
            };
        });

        return NextResponse.json(aggregated);
    } catch (error: any) {
        console.error('Admin API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { email, password, full_name, phone, cin_number } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email et mot de passe sont requis pour l\'authentification.' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Create User in Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, phone }
        });

        if (authError) throw authError;

        // 2. Create or Update Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert([
                {
                    id: authUser.user.id,
                    full_name,
                    phone,
                    cin_number,
                    role: 'student'
                }
            ]);

        if (profileError) {
            // Cleanup auth user if profile creation fails (only if it was just created)
            // Note: In case of upsert, this might be tricky, but since createUser 
            // just succeeded, this is a new user.
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            throw profileError;
        }

        return NextResponse.json({ success: true, user: authUser.user });
    } catch (error: any) {
        console.error('Create Student Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
