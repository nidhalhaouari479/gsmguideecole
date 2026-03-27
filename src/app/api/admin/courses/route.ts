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

        const { data: courses, error } = await supabaseAdmin
            .from('courses')
            .select(`
                *,
                professeurs (id, nom, prenom)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(courses);
    } catch (error: any) {
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
        const {
            title_fr, title_en, description_fr, description_en,
            base_price, sold_price, duration, category, level,
            instructor_id, image_url
        } = body;

        if (!title_fr || !base_price) {
            return NextResponse.json({ error: 'Titre et prix de base sont requis' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('courses')
            .insert([{
                title_fr, title_en, description_fr, description_en,
                base_price, sold_price, duration, category, level,
                instructor_id: instructor_id || null, image_url
            }]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Formation ajoutée avec succès' });
    } catch (error: any) {
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
        const {
            id, title_fr, title_en, description_fr, description_en,
            base_price, sold_price, duration, category, level,
            instructor_id, image_url
        } = body;

        if (!id || !title_fr || !base_price) {
            return NextResponse.json({ error: 'ID, Titre et prix sont requis' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('courses')
            .update({
                title_fr, title_en, description_fr, description_en,
                base_price, sold_price, duration, category, level,
                instructor_id: instructor_id || null, image_url
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Formation modifiée avec succès' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID requis' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('courses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Formation supprimée' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
