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

        return NextResponse.json(professeurs);
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
        const { nom, prenom, specialite } = body;

        if (!nom || !prenom) {
            return NextResponse.json({ error: 'Nom et Prénom sont requis' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('professeurs')
            .insert([{ nom, prenom, specialite }]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Professeur ajouté avec succès' });
    } catch (error: any) {
        console.error('Create Teacher Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { id, nom, prenom, specialite } = body;

        if (!id || !nom || !prenom) {
            return NextResponse.json({ error: 'ID, Nom et Prénom sont requis' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('professeurs')
            .update({ nom, prenom, specialite })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Professeur modifié avec succès' });
    } catch (error: any) {
        console.error('Update Teacher Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
