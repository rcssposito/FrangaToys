
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// UPDATE STUDIO
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, custo_mensal, qtd_display, qualidade, observacao, logo_url, instagram_handle, social_url, ativo, merchant } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const { data, error } = await supabase
            .from('studios')
            .update({ custo_mensal, qtd_display, qualidade, observacao, logo_url, instagram_handle, social_url, ativo, merchant })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CREATE STUDIO
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { nome, custo_mensal, qtd_display, qualidade, observacao, logo_url, instagram_handle, social_url, ativo, merchant } = body;

        if (!nome) return NextResponse.json({ error: 'Nome required' }, { status: 400 });

        const payload: any = { 
            nome, 
            ativo: ativo ?? true,
            merchant: merchant ?? false
        };

        // Only include fields if they are explicitly provided in the request
        if (custo_mensal !== undefined && custo_mensal !== '') payload.custo_mensal = custo_mensal;
        if (qtd_display !== undefined && qtd_display !== '') payload.qtd_display = qtd_display;
        if (qualidade !== undefined && qualidade !== '') payload.qualidade = qualidade;
        if (observacao !== undefined && observacao !== '') payload.observacao = observacao;
        if (logo_url !== undefined && logo_url !== '') payload.logo_url = logo_url;
        if (instagram_handle !== undefined && instagram_handle !== '') payload.instagram_handle = instagram_handle;
        if (social_url !== undefined && social_url !== '') payload.social_url = social_url;
        if (ativo !== undefined) payload.ativo = ativo;
        if (merchant !== undefined) payload.merchant = merchant;

        const { data, error } = await supabase
            .from('studios')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error("SUPABASE ERROR ON INSERT:", JSON.stringify(error, null, 2));
            throw error;
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("POST Studio error", error);
        return NextResponse.json({ error: error.message, fullError: error }, { status: 500 });
    }
}

// DELETE STUDIO
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // First check if there are figures bound to this studio
        const { count, error: countError } = await supabase
            .from('figuras')
            .select('*', { count: 'exact', head: true })
            .eq('studio_id', id);

        if (countError) throw countError;

        if (count && count > 0) {
            return NextResponse.json({ error: `Cannot delete studio because it has ${count} figures associated. Please reassign them first.` }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('studios')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
