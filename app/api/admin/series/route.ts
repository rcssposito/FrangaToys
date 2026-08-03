import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { data, error } = await supabase
            .from('series')
            .select('id, nome')
            .order('nome', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
