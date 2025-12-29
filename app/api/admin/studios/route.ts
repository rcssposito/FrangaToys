
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// UPDATE STUDIO
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, custo_mensal, qtd_display, qualidade, observacao } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const { data, error } = await supabase
            .from('studios')
            .update({ custo_mensal, qtd_display, qualidade, observacao })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
