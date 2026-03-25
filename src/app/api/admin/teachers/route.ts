import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Service Role Key missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

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
        const body = await req.json();
        const { nom, prenom, specialite } = body;

        if (!nom || !prenom) {
            return NextResponse.json({ error: 'Nom et Prénom sont requis' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

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
        const body = await req.json();
        const { id, nom, prenom, specialite } = body;

        if (!id || !nom || !prenom) {
            return NextResponse.json({ error: 'ID, Nom et Prénom sont requis' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

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
