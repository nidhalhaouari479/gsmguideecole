import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Use RPC to bypass potential schema cache issues with direct table access
        const { data, error } = await supabase.rpc('get_course_reviews', { p_course_id: id });

        if (error) {
            console.error('[GET Ratings] RPC error:', error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[GET Ratings] GLOBAL ERROR:', error);
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const body = await request.json();
        const { rating, comment, userId } = body;

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // Use RPC to submit the review. 
        // This RPC also handles the enrollment check internally for maximum security and speed.
        const { data, error } = await supabase.rpc('submit_course_review', {
            p_course_id: id,
            p_user_id: userId,
            p_rating: rating,
            p_comment: comment || ''
        });

        if (error) {
            console.error('[POST Rating] RPC error:', error);
            // If the error is our custom exception from PL/pgSQL
            if (error.message.includes('Vous devez être inscrit')) {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[POST Rating] GLOBAL ERROR:', error);
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
}
