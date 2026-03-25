import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userId, action } = await req.json();

        if (!userId || !action) {
            return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        if (action === 'delete') {
            // 1. Attempt to delete from enrollments (to avoid FK issues)
            await supabaseAdmin.from('enrollments').delete().eq('user_id', userId);

            // 2. Attempt to delete from professeurs (if teacher)
            await supabaseAdmin.from('professeurs').delete().eq('id', userId);
            
            // 3. Attempt to delete from profiles (for students)
            await supabaseAdmin.from('profiles').delete().eq('id', userId);

            // 4. Delete from Supabase Auth (The master account)
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authDeleteError) {
                console.error('Auth Delete Error:', authDeleteError);
                return NextResponse.json({ 
                    error: "Échec de la suppression du compte d'accès.", 
                    details: authDeleteError.message 
                }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Utilisateur et compte supprimés avec succès pour ID: ' + userId });
        }

        if (action === 'block' || action === 'unblock') {
            const isBlocked = action === 'block';

            // Store block status in Auth user metadata instead of profiles table 
            // because the column might not exist and it's more standard for simple flags.
            const { error: blockError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { user_metadata: { is_blocked: isBlocked } }
            );

            if (blockError) {
                console.error('Block Error:', blockError);
                return NextResponse.json({
                    error: "Le blocage a échoué.",
                    details: blockError.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: isBlocked ? 'Utilisateur bloqué' : 'Utilisateur débloqué'
            });
        }

        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });

    } catch (error: any) {
        console.error('Admin Action Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
