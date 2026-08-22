import { createAdminClient } from './supabase-server';

export const canAccessSession = async (
    userId: string,
    role: 'admin' | 'professor',
    sessionId: string
) => {
    if (role === 'admin') return true;

    const supabaseAdmin = createAdminClient();
    const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('course_id, schedule')
        .eq('id', sessionId)
        .maybeSingle();

    if (!session) return false;

    try {
        const parsed = JSON.parse(session.schedule || '{}');
        if (parsed?.instructor_id) return parsed.instructor_id === userId;
    } catch {
        // Legacy sessions use the instructor assigned to the course.
    }

    const { data: course } = await supabaseAdmin
        .from('courses')
        .select('instructor_id')
        .eq('id', session.course_id)
        .maybeSingle();

    return course?.instructor_id === userId;
};
