const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('Checking profiles for M GSMGUIDEACADEMY...');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%GSMGUIDEACADEMY%');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('Found profiles:', JSON.stringify(profiles, null, 2));

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error fetching auth users:', authError);
    } else {
        const adminUser = authUsers.users.find(u => u.email === 'gsmguideacademy@gmail.com');
        if (adminUser) {
            console.log('Admin Auth User found:', adminUser.id);
            const matchingProfile = profiles.find(p => p.id === adminUser.id);
            if (matchingProfile) {
                console.log('MATCH FOUND! Role is:', matchingProfile.role);
            } else {
                console.log('NO MATCH found in profiles table for this Auth ID.');
            }
        } else {
            console.log('Admin Auth User NOT FOUND in Supabase Auth.');
        }
    }
}

check();
