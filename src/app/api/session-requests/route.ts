import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-admin';
import { createAdminClient, createSSRClient } from '@/lib/supabase-server';
import { notifyUserBySms } from '@/lib/winsms';

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
        const admin = createAdminClient();
        const { data: sessionRequest } = await admin
            .from('session_requests')
            .select('user_id, phone, request_type, course_id')
            .eq('id', id)
            .maybeSingle();
        const { error } = await admin.from('session_requests').update({ status, processed_at: status === 'pending' ? null : new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        let sms: { sent: boolean; message: string } | null = null;
        if (status !== 'pending' && sessionRequest?.user_id) {
            const { data: course } = await admin.from('courses').select('title_fr').eq('id', sessionRequest.course_id).maybeSingle();
            const courseTitle = course?.title_fr || 'la formation demandée';
            let message: string;
            if (status === 'processed') {
                // Tell the student the session is open, with the next start date when one is planned.
                const today = new Date().toISOString().slice(0, 10);
                const { data: nextSession } = await admin
                    .from('sessions')
                    .select('start_date')
                    .eq('course_id', sessionRequest.course_id)
                    .gte('start_date', today)
                    .order('start_date', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                const startLabel = nextSession?.start_date
                    ? `, début le ${new Date(nextSession.start_date).toLocaleDateString('fr-FR')}`
                    : '';
                message = `GSM Guide Academy: session ${courseTitle} ouverte${startLabel}. Réservez votre place sur notre site.`;
            } else {
                message = `GSM Guide Academy: votre demande pour ${courseTitle} a été refusée. Contactez l'administration pour plus d'informations.`;
            }
            const result = await notifyUserBySms({
                userId: sessionRequest.user_id,
                fallbackPhone: sessionRequest.phone,
                eventType: status === 'processed' ? 'session_request_processed' : 'session_request_rejected',
                eventKey: `session-request:${id}:${status}`,
                message,
                metadata: { requestId: id, status },
            });
            if (!result.success) console.error('[Session request SMS]', result.message);
            sms = { sent: result.success, message: result.message };
        }
        return NextResponse.json({ success: true, sms });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur de mise à jour.' }, { status: 500 });
    }
}
