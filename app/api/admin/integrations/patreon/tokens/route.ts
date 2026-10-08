import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const auth = await requireRoles(['admin', 'franga_studio']);
        if (auth instanceof NextResponse) return auth;
        const { data, error } = await supabase
            .from('download_tokens')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
