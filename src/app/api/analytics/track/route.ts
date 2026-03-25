import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { session_id, event_type, path, element_id, duration } = await req.json();

        if (!session_id || !event_type || !path) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Use the anon key since RLS policy allows anonymous inserts
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error } = await supabase.from('analytics_events').insert({
            session_id,
            event_type,
            path,
            element_id: element_id || null,
            duration: duration || null
        });

        if (error) {
            // Don't fail loudly—analytics errors should never break the user experience
            return NextResponse.json({ ok: false }, { status: 200 });
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 200 });
    }
}
