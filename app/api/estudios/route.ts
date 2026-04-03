import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EstudioSchema } from '@/lib/dto';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const incluirInativos = searchParams.get('incluirInativos') === 'true';

        let query = supabase
            .from('studios')
            .select('*, figuras(count)');
        
        if (!incluirInativos) {
            query = query.eq('merchant', true);
        }

        const { data, error } = await query.order('nome', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Validate output
        const parsed = data.map(d => EstudioSchema.parse(d));

        return NextResponse.json(parsed, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=86400',
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
