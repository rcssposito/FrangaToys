
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user || !user.email) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        // Fetch roles from admin_users table using Service Role (bypass RLS)
        const { data: adminUser, error: dbError } = await supabaseAdmin
            .from('admin_users')
            .select('id, email, roles')
            .eq('email', user.email)
            .single();

        if (dbError || !adminUser) {
            // User authenticated in Supabase but not in admin_users table
            return NextResponse.json({ user: null }, { status: 403 });
        }

        return NextResponse.json({
            user: {
                id: adminUser.id, // Keep numeric ID for compatibility
                auth_id: user.id, // Supabase UUID
                email: adminUser.email,
                roles: adminUser.roles || []
            }
        });

    } catch (err) {
        console.error('Me API Error:', err);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}
