
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR VENDAS (Histórico)
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('vendas')
            .select(`
        *,
        figuras ( nome, imagem_url )
      `)
            .order('data_venda', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// REGISTRAR VENDA
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { figura_id, valor_venda_final, cliente_nome, canal_venda } = body;

        console.log('Registering sale for figure ID:', figura_id);

        // 1. Buscar dados técnicos da figura e as configurações globais de preço
        // Isso garante que o cálculo é feito com dados frescos, sem depender da View
        const [metaRes, settingsRes] = await Promise.all([
            supabase.from('figuras_meta').select('*').eq('figura_id', figura_id).single(),
            supabase.from('pricing_params').select('*').eq('id', 1).single()
        ]);

        if (metaRes.error || settingsRes.error) {
            console.error('Error fetching data for calc:', { metaError: metaRes.error, setError: settingsRes.error });
            throw new Error('Falha ao obter dados para cálculo de lucro');
        }

        const meta = metaRes.data;
        const settings = settingsRes.data;

        // O custo de produção real é apenas o material e a máquina (conforme solicitado)
        // Aplicando a regra de arredondamento para cima
        const custo_resina_raw = (meta.resina_kg || 0) * (settings.custo_resina_kg || 0);
        const custo_impressao_raw = (meta.horas_impressao || 0) * (settings.custo_h_impressao || 0);

        const custo_producao_real = Math.ceil(custo_resina_raw + custo_impressao_raw);
        const lucro_real = valor_venda_final - custo_producao_real;

        console.log('--- LUCRO CALCULADO (API) ---');
        console.log('Figura ID:', figura_id);
        console.log('Produção Raw:', (custo_resina_raw + custo_impressao_raw).toFixed(2));
        console.log('Produção (Math.ceil):', custo_producao_real);
        console.log('Venda:', valor_venda_final, 'Lucro:', lucro_real.toFixed(2));

        const { data, error } = await supabase
            .from('vendas')
            .insert([{
                figura_id,
                cliente_nome,
                canal_venda,
                valor_venda_final,
                custo_producao_snapshot: custo_producao_real,
                lucro_real,
                status: 'Concluída'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error inserting sale:', error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Sales POST API Crash:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETAR VENDA
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const { error } = await supabase.from('vendas').delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
