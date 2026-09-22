import { NextResponse } from 'next/server';
import { verifyStaff } from '@/lib/auth-admin';
import { createAdminClient } from '@/lib/supabase-server';
import { canAccessSession } from '@/lib/staff-session-access';
import { notifyUserBySms } from '@/lib/winsms';

export async function POST(req: Request) {
    let createdUserId: string | null = null;
    let enrollmentSaved = false;
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId: existingUserId, sessionId, newStudent, amountPaid = 0 } = await req.json();
        let userId = existingUserId;
        const paid = Number(amountPaid);
        if (!Number.isFinite(paid) || paid < 0 || amountPaid === '' || amountPaid === null) {
            return NextResponse.json({ error: 'Le montant payé doit être un nombre positif ou zéro.' }, { status: 400 });
        }
        if ((newStudent || paid > 0) && auth.role !== 'admin') {
            return NextResponse.json({ error: 'Action réservée aux administrateurs.' }, { status: 403 });
        }
        if (newStudent && (userId || typeof newStudent.email !== 'string' || !newStudent.email.trim() || typeof newStudent.password !== 'string' || newStudent.password.length < 6 || typeof newStudent.full_name !== 'string' || !newStudent.full_name.trim())) {
            return NextResponse.json({ error: 'Nom, e-mail et mot de passe (6 caractères minimum) requis.' }, { status: 400 });
        }

        if ((!userId && !newStudent) || !sessionId) {
            return NextResponse.json({ error: 'Étudiant et session requis.' }, { status: 400 });
        }

        if (!await canAccessSession(auth.user.id, auth.role, sessionId)) {
            return NextResponse.json({ error: 'Cette session ne vous est pas attribuée.' }, { status: 403 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Check if enrollment already exists
        const { data: existingEnrollment, error: existingError } = userId ? await supabaseAdmin
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .maybeSingle() : { data: null, error: null };

        if (existingError) throw existingError;

        if (existingEnrollment) {
            return NextResponse.json({ error: 'Cet étudiant est déjà inscrit à cette session.' }, { status: 400 });
        }

        // 2. Fetch session and course price
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('sessions')
            .select('course_id, seats_available, start_date')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 });
        }

        const { count: enrollmentCount, error: countError } = await supabaseAdmin
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .in('status', ['pending', 'approved']);

        if (countError) throw countError;
        if ((enrollmentCount || 0) >= Number(session.seats_available || 0)) {
            return NextResponse.json({ error: 'Cette session est complète.' }, { status: 409 });
        }

        const { data: course, error: courseError } = await supabaseAdmin
            .from('courses')
            .select('base_price, sold_price, title_fr')
            .eq('id', session.course_id)
            .single();

        if (courseError || !course) {
            return NextResponse.json({ error: 'Formation introuvable.' }, { status: 404 });
        }

        const totalPrice = course.sold_price || course.base_price;
        if (paid > Number(totalPrice)) {
            return NextResponse.json({ error: `Le montant payé dépasse le prix de la session (${totalPrice} DT).` }, { status: 400 });
        }

        if (newStudent) {
            const { email, password, full_name, phone, cin_number } = newStudent;
            const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email.trim(), password, email_confirm: true,
                user_metadata: { full_name: full_name.trim(), phone },
            });
            if (createError) throw createError;
            createdUserId = created.user.id;
            userId = createdUserId;
            const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                id: userId, full_name: full_name.trim(), phone, cin_number, role: 'student',
            });
            if (profileError) throw profileError;
        }

        // 3. Create enrollment
        const { data, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .insert([{
                user_id: userId,
                session_id: sessionId,
                status: 'approved',
                amount_paid: paid,
                receipt_url: paid > 0 ? JSON.stringify([{
                    url: null, amount: paid, status: 'approved', source: 'admin', date: new Date().toISOString(),
                }]) : null,
                total_price: totalPrice,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (enrollError) throw enrollError;
        enrollmentSaved = true;

        if (newStudent) {
            await notifyUserBySms({
                userId,
                eventType: 'student_account_created',
                eventKey: `student-account-created:${userId}`,
                message: `Bienvenue ${newStudent.full_name.trim() || ''} chez GSM Guide Academy. Votre compte étudiant a été créé. Identifiant: ${newStudent.email.trim()}`,
                metadata: { source: 'admin-session' },
            });
        }

        await notifyUserBySms({
            userId,
            eventType: 'enrollment_created',
            eventKey: `enrollment-created:${data.id}`,
            message: `GSM Guide: inscription confirmée à ${course.title_fr}. Début: ${new Date(session.start_date).toLocaleDateString('fr-FR')}. Montant: ${totalPrice} DT.`,
            metadata: { enrollmentId: data.id, sessionId, totalPrice },
        });

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        if (createdUserId && !enrollmentSaved) {
            const { error: cleanupError } = await createAdminClient().auth.admin.deleteUser(createdUserId);
            if (cleanupError) console.error('New student cleanup failed:', cleanupError);
        }
        console.error('Manual Enrollment Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur lors de l’inscription.' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const auth = await verifyStaff();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId, sessionId } = await req.json();
        if (!userId || !sessionId) {
            return NextResponse.json({ error: 'Étudiant et session requis.' }, { status: 400 });
        }

        if (!await canAccessSession(auth.user.id, auth.role, sessionId)) {
            return NextResponse.json({ error: 'Cette session ne vous est pas attribuée.' }, { status: 403 });
        }

        const supabaseAdmin = createAdminClient();

        const { data: enrollment, error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .select('id, amount_paid, receipt_url')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .maybeSingle();

        if (enrollmentError) throw enrollmentError;
        if (!enrollment) {
            return NextResponse.json({ error: 'Cette inscription est introuvable.' }, { status: 404 });
        }
        if (Number(enrollment.amount_paid || 0) > 0 || Boolean(enrollment.receipt_url)) {
            return NextResponse.json(
                { error: 'Impossible de retirer cet étudiant : son inscription contient déjà un paiement ou un justificatif.' },
                { status: 409 }
            );
        }

        const { data: sessionInfo } = await supabaseAdmin
            .from('sessions')
            .select('course_id')
            .eq('id', sessionId)
            .maybeSingle();
        const { data: courseInfo } = sessionInfo?.course_id
            ? await supabaseAdmin.from('courses').select('title_fr').eq('id', sessionInfo.course_id).maybeSingle()
            : { data: null };

        const { error: deleteError } = await supabaseAdmin
            .from('enrollments')
            .delete()
            .eq('id', enrollment.id);

        if (deleteError) throw deleteError;

        const { error: attendanceError } = await supabaseAdmin
            .from('attendance_records')
            .delete()
            .eq('user_id', userId)
            .eq('session_id', sessionId);

        if (
            attendanceError
            && attendanceError.code !== '42P01'
            && attendanceError.code !== 'PGRST205'
        ) {
            console.error('Attendance cleanup after enrollment removal failed:', attendanceError);
        }

        await notifyUserBySms({
            userId,
            eventType: 'enrollment_removed',
            eventKey: `enrollment-removed:${enrollment.id}`,
            message: `GSM Guide: votre inscription à ${courseInfo?.title_fr || 'la session'} a été annulée. Contactez l'administration si nécessaire.`,
            metadata: { enrollmentId: enrollment.id, sessionId },
        });

        return NextResponse.json({
            success: true,
            message: 'Étudiant retiré de la session.'
        });
    } catch (error: any) {
        console.error('Remove Enrollment Error:', error);
        return NextResponse.json(
            { error: error.message || 'Impossible de retirer cet étudiant de la session.' },
            { status: 500 }
        );
    }
}
