
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR VENDAS (Histórico)
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('vendas')
            .select(`
        *,
        figuras ( 
            nome, 
            imagem_url,
            studios ( nome )
        )
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
        const { figura_id, valor_venda_final, cliente_nome, canal_venda, quantidade = 1, observacao, data_venda } = body;

        console.log('Registering sale for figure ID:', figura_id, 'Qty:', quantidade);

        // 1. Buscar dados técnicos da figura e as configurações globais de preço
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

        const custo_unitario_real = Math.ceil(custo_resina_raw + custo_impressao_raw);
        const custo_total_real = custo_unitario_real * quantidade;

        const lucro_real = valor_venda_final - custo_total_real;

        console.log('--- LUCRO CALCULADO (API) ---');
        console.log('Figura ID:', figura_id);
        console.log('Custo Unitário:', custo_unitario_real);
        console.log('Quantidade:', quantidade);
        console.log('Custo Total:', custo_total_real);
        console.log('Venda Total:', valor_venda_final, 'Lucro Total:', lucro_real.toFixed(2));

        const saleData: any = {
            figura_id,
            cliente_nome,
            canal_venda,
            valor_venda_final, // Valor total da venda
            custo_producao_snapshot: custo_total_real, // Custo total da produção
            lucro_real,
            status: 'Concluída',
            quantidade,
            observacao
        };

        // Se data_venda for fornecida, usa ela. Senão o banco usa default now()
        if (data_venda) {
            saleData.data_venda = data_venda;
        }

        const { data, error } = await supabase
            .from('vendas')
            .insert([saleData])
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
