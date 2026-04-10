import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
    let result = {};
    for (let t of ['figuras', 'figuras_sinonimos', 'figuras_meta']) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) result[t] = error.message;
        else result[t] = data && data.length > 0 ? Object.keys(data[0]) : 'Empty Table, cannot guess schema from select *';
    }
    return NextResponse.json(result);
}
