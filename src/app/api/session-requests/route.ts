import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient, createSSRClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const supabase = await createSSRClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 });

        const { courseId, requestType, phone, availability, message } = await req.json();
        if (!courseId || !requestType || !phone || !availability) {
            return NextResponse.json({ error: 'Veuillez remplir tous les champs obligatoires.' }, { status: 400 });
        }
        if (!['create_session', 'next_session'].includes(requestType)) {
            return NextResponse.json({ error: 'Type de demande invalide.' }, { status: 400 });
        }

        const admin = createAdminClient();
        const { data: existing } = await admin.from('session_requests').select('id').eq('user_id', user.id).eq('course_id', courseId).eq('status', 'pending').maybeSingle();
        if (existing) return NextResponse.json({ error: 'Vous avez déjà une demande en attente pour cette formation.' }, { status: 409 });

        const { data, error } = await admin.from('session_requests').insert({
            user_id: user.id,
            course_id: courseId,
            request_type: requestType,
            full_name: user.user_metadata?.full_name || user.email || 'Étudiant',
            email: user.email,
            phone: String(phone).trim(),
            availability: String(availability).trim(),
            message: message ? String(message).trim() : null,
            status: 'pending'
        }).select('id').single();
        if (error) throw error;
        return NextResponse.json({ success: true, request: data });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur lors de l’envoi.' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const auth = await verifyAdmin();
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { id, status } = await req.json();
        if (!id || !['pending', 'processed', 'rejected'].includes(status)) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
        const { error } = await createAdminClient().from('session_requests').update({ status, processed_at: status === 'pending' ? null : new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur de mise à jour.' }, { status: 500 });
    }
}
