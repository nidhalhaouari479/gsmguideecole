import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabaseAdmin = createAdminClient();

        const { data: professeurs, error } = await supabaseAdmin
            .from('professeurs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
        if (authUsersError) throw authUsersError;

        const teachersWithEmails = (professeurs || []).map(professeur => ({
            ...professeur,
            email: authUsersData.users.find(user => user.id === professeur.id)?.email || ''
        }));

        return NextResponse.json(teachersWithEmails);
    } catch (error: any) {
        console.error('Teachers API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { nom, prenom, specialite, email, password } = body;

        if (!nom || !prenom || !email || !password) {
            return NextResponse.json({ error: 'Nom et Prénom sont requis' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        if (password.length < 8) return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
        const normalizedEmail = email.trim().toLowerCase();
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail, password, email_confirm: true,
            user_metadata: { full_name: `${prenom} ${nom}` }
        });
        if (authError || !authData.user) throw authError || new Error('Compte professeur non créé');

        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: authData.user.id, full_name: `${prenom} ${nom}`, role: 'professor'
        });
        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        const { error } = await supabaseAdmin
            .from('professeurs')
            .insert([{ id: authData.user.id, nom, prenom, specialite }]);

        if (error) {
            await supabaseAdmin.from('profiles').delete().eq('id', authData.user.id);
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw error;
        }

        return NextResponse.json({ success: true, message: 'Professeur ajouté avec succès' });
    } catch (error: any) {
        console.error('Create Teacher Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function createAndLinkLegacyTeacher(
    legacyId: string,
    data: { nom: string; prenom: string; specialite?: string; email: string; password?: string }
) {
    if (!data.password) throw new Error('Ce professeur ne possède pas encore de compte. Saisissez un nouveau mot de passe pour le créer.');

    const supabaseAdmin = createAdminClient();
    const fullName = `${data.prenom} ${data.nom}`;
    const normalizedEmail = data.email.trim().toLowerCase();
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const existingUser = usersData.users.find(user => user.email?.toLowerCase() === normalizedEmail);
    let authUserId: string;
    let createdUser = false;

    if (existingUser) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', existingUser.id).maybeSingle();
        if (profile?.role !== 'professor') throw new Error('Cette adresse email appartient déjà à un autre compte.');
        authUserId = existingUser.id;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            password: data.password,
            user_metadata: { full_name: fullName }
        });
        if (error) throw error;
    } else {
        const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password: data.password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });
        if (error || !authData.user) throw error || new Error('Impossible de créer le compte professeur.');
        authUserId = authData.user.id;
        createdUser = true;
    }

    const { data: targetTeacher } = await supabaseAdmin.from('professeurs').select('id').eq('id', authUserId).maybeSingle();
    if (targetTeacher && authUserId !== legacyId) {
        if (createdUser) await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error('Ce compte est déjà lié à un autre professeur.');
    }

    const { error: teacherError } = await supabaseAdmin.from('professeurs').insert({
        id: authUserId,
        nom: data.nom,
        prenom: data.prenom,
        specialite: data.specialite
    });
    if (teacherError) {
        if (createdUser) await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw teacherError;
    }

    const { error: coursesError } = await supabaseAdmin.from('courses').update({ instructor_id: authUserId }).eq('instructor_id', legacyId);
    if (coursesError) throw coursesError;

    const { data: sessions, error: sessionsError } = await supabaseAdmin.from('sessions').select('id, schedule');
    if (sessionsError) throw sessionsError;
    for (const session of sessions || []) {
        try {
            const schedule = JSON.parse(session.schedule || '{}');
            if (schedule.instructor_id !== legacyId) continue;
            schedule.instructor_id = authUserId;
            const { error } = await supabaseAdmin.from('sessions').update({ schedule: JSON.stringify(schedule) }).eq('id', session.id);
            if (error) throw error;
        } catch (error) {
            if (error instanceof SyntaxError) continue;
            throw error;
        }
    }

    const { error: deleteError } = await supabaseAdmin.from('professeurs').delete().eq('id', legacyId);
    if (deleteError) throw deleteError;
    return authUserId;
}

export async function PUT(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { id, nom, prenom, specialite, email, password } = body;

        if (!id || !nom || !prenom || !email) {
            return NextResponse.json({ error: 'ID, Nom et Prénom sont requis' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        if (password && password.length < 8) {
            return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
        }

        const authUpdates: { email: string; email_confirm: boolean; password?: string; user_metadata: { full_name: string } } = {
            email: email.trim().toLowerCase(),
            email_confirm: true,
            user_metadata: { full_name: `${prenom} ${nom}` }
        };
        if (password) authUpdates.password = password;

        let targetId = id;
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
        if (authError) {
            if (!authError.message.toLowerCase().includes('user not found')) throw authError;
            targetId = await createAndLinkLegacyTeacher(id, { nom, prenom, specialite, email, password });
        }

        const { error } = await supabaseAdmin
            .from('professeurs')
            .update({ nom, prenom, specialite })
            .eq('id', targetId);

        if (error) throw error;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: targetId, full_name: `${prenom} ${nom}`, role: 'professor' });
        if (profileError) throw profileError;

        return NextResponse.json({ success: true, message: 'Professeur modifié avec succès' });
    } catch (error: any) {
        console.error('Update Teacher Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
