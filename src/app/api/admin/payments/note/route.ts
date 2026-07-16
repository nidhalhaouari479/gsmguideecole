import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';

export async function PATCH(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { enrollmentId, note } = await req.json();
        if (!enrollmentId || typeof note !== 'string') {
            return NextResponse.json({ error: 'Inscription et remarque requises.' }, { status: 400 });
        }

        const cleanNote = note.trim();
        if (cleanNote.length > 2000) {
            return NextResponse.json(
                { error: 'La remarque ne peut pas dépasser 2000 caractères.' },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('enrollments')
            .update({
                finance_note: cleanNote || null,
                finance_note_updated_at: new Date().toISOString(),
                finance_note_updated_by: auth.user.id,
            })
            .eq('id', enrollmentId)
            .select('id, finance_note, finance_note_updated_at')
            .single();

        if (error) {
            if (error.message.includes('finance_note')) {
                return NextResponse.json(
                    { error: 'Exécutez le fichier supabase-finance-comments.sql dans Supabase.' },
                    { status: 500 }
                );
            }
            throw new Error(error.message);
        }

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.';
        console.error('[Finance Note API] Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
