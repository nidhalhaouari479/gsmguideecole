import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import { sanitizeCourseHtml } from '@/lib/rich-text';

const normalizeProgramItems = (value: unknown): string[] | null => {
    if (!Array.isArray(value) || value.length !== 4) return null;

    const items = value.map(item => String(item ?? '').trim());
    return items.every(Boolean) ? items : null;
};

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
                professeurs (id, nom, prenom),
                course_programs (id, content, position)
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
            base_price, sold_price, reservation_amount, duration, category, level,
            instructor_id, image_url, program_items
        } = body;

        const totalPrice = Number(sold_price || base_price || 0);
        const bookingAmount = Number(reservation_amount);
        const normalizedProgramItems = normalizeProgramItems(program_items);

        if (!title_fr || !base_price || !Number.isFinite(bookingAmount) || bookingAmount < 0 || !normalizedProgramItems) {
            return NextResponse.json({ error: 'Titre, prix, avance et quatre éléments de programme valides sont requis' }, { status: 400 });
        }
        if (bookingAmount > totalPrice) {
            return NextResponse.json({ error: 'L’avance de réservation ne peut pas dépasser le prix de la formation' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { data: createdCourse, error } = await supabaseAdmin
            .from('courses')
            .insert([{
                title_fr, title_en, description_fr: sanitizeCourseHtml(description_fr), description_en: sanitizeCourseHtml(description_en),
                base_price, sold_price, reservation_amount: bookingAmount, duration, category, level,
                instructor_id: instructor_id || null, image_url
            }])
            .select('id')
            .single();

        if (error) throw error;

        const { error: programError } = await supabaseAdmin
            .from('course_programs')
            .insert(normalizedProgramItems.map((content, index) => ({
                course_id: createdCourse.id,
                content,
                position: index + 1
            })));

        if (programError) {
            await supabaseAdmin.from('courses').delete().eq('id', createdCourse.id);
            throw programError;
        }

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
            base_price, sold_price, reservation_amount, duration, category, level,
            instructor_id, image_url, program_items
        } = body;

        const totalPrice = Number(sold_price || base_price || 0);
        const bookingAmount = Number(reservation_amount);
        const normalizedProgramItems = normalizeProgramItems(program_items);

        if (!id || !title_fr || !base_price || !Number.isFinite(bookingAmount) || bookingAmount < 0 || !normalizedProgramItems) {
            return NextResponse.json({ error: 'ID, titre, prix, avance et quatre éléments de programme valides sont requis' }, { status: 400 });
        }
        if (bookingAmount > totalPrice) {
            return NextResponse.json({ error: 'L’avance de réservation ne peut pas dépasser le prix de la formation' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('courses')
            .update({
                title_fr, title_en, description_fr: sanitizeCourseHtml(description_fr), description_en: sanitizeCourseHtml(description_en),
                base_price, sold_price, reservation_amount: bookingAmount, duration, category, level,
                instructor_id: instructor_id || null, image_url
            })
            .eq('id', id);

        if (error) throw error;

        const { error: programError } = await supabaseAdmin
            .from('course_programs')
            .upsert(
                normalizedProgramItems.map((content, index) => ({
                    course_id: id,
                    content,
                    position: index + 1
                })),
                { onConflict: 'course_id,position' }
            );

        if (programError) throw programError;

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
