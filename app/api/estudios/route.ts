import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EstudioSchema } from '@/lib/dto';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('studios')
            .select('*, figuras(count)')
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Validate output
        const parsed = data.map(d => EstudioSchema.parse(d));

        return NextResponse.json(parsed, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
