
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR VENDAS (Histórico)
export async function GET() {
    try {
        const { data: sales, error } = await supabase
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

        // Fetch display names for vendors
        const { data: users } = await supabase
            .from('admin_users')
            .select('email, nome');

        const userMap = (users || []).reduce((acc: any, u) => {
            acc[u.email.toLowerCase()] = u.nome;
            return acc;
        }, {});

        const formatted = sales.map(s => ({
            ...s,
            vendedor_nome: userMap[(s.vendedor || '').toLowerCase()] || s.vendedor || 'Ateliê'
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// REGISTRAR VENDA (SUPORTA CARRINHO / MÚLTIPLOS ITENS)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            carrinho, // Array de { id, nome, quantidade, valor_final, resina_kg }
            cliente_nome,
            canal_venda,
            vendedor, // Email do usuário na sessão
            pintura_freelancer, // Booleano do checkbox
            data_venda,
            observacao
        } = body;

        if (!carrinho || !Array.isArray(carrinho) || carrinho.length === 0) {
            throw new Error('Carrinho vazio ou inválido');
        }

        console.log(`Registering ${carrinho.length} items for client ${cliente_nome}`);
        if (vendedor) {
            console.log(`Sale made by vendor: ${vendedor}`);
        }

        // 1. Buscar configurações globais de preço (para saber custo de resina/h_impressao atual)
        const { data: settings, error: settingsError } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) throw new Error('Falha ao obter parâmetros de precificação');

        let totalResinaConsumida = 0;
        const salesToInsert = [];

        // 2. Processar cada item do carrinho para calcular lucros individuais (snapshot)
        for (const item of carrinho) {
            // Buscar metadados técnicos da figura (escala, horas, etc)
            const { data: meta, error: metaError } = await supabase
                .from('figuras_meta')
                .select('*')
                .eq('figura_id', item.id)
                .single();

            if (metaError) {
                console.error(`Error fetching meta for figure ${item.id}:`, metaError);
                continue; // Pular item se houver erro ou usar valores default
            }

            // Cálculo do custo (apenas resina + horas de impressão conforme regra de negócio)
            const custo_resina_raw = (meta.resina_kg || 0) * (settings.custo_resina_kg || 0);
            const custo_impressao_raw = (meta.horas_impressao || 0) * (settings.custo_h_impressao || 0);

            const custo_unitario_real = Math.ceil(custo_resina_raw + custo_impressao_raw);
            const custo_total_real = custo_unitario_real * item.quantidade;

            // Deduções
            let comissao_vendedor = 0;
            const OWNER_EMAIL = 'rcssposito@gmail.com';

            if (vendedor && vendedor.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
                // 15% de comissão sobre o valor final do item (apenas se não for o dono)
                comissao_vendedor = Math.round(item.valor_final * 0.15);
            }

            let custo_pintura_freelancer = 0;
            if (pintura_freelancer) {
                // Custo do freelancer = horas de pintura * R$ 50
                custo_pintura_freelancer = Math.ceil((meta.horas_pintura || 0) * 50) * item.quantidade;
            }

            // Lucro Real = Valor Final - Custos da Impressora - Custo Terceiro - Comissão
            const lucro_real = item.valor_final - custo_total_real - custo_pintura_freelancer - comissao_vendedor;

            totalResinaConsumida += (meta.resina_kg || 0) * item.quantidade;

            salesToInsert.push({
                figura_id: item.id,
                cliente_nome,
                canal_venda,
                vendedor,
                comissao_vendedor,
                pintura_freelancer,
                valor_venda_final: item.valor_final,
                custo_producao_snapshot: custo_total_real,
                lucro_real,
                status: 'Fila de Impressão', // Atualizado para fluxo Kanban
                quantidade: item.quantidade,
                observacao: observacao || '',
                data_venda: data_venda || new Date().toISOString()
            });
        }

        // 3. Inserir vendas em lote
        const { data: insertedData, error: insertError } = await supabase
            .from('vendas')
            .insert(salesToInsert)
            .select();

        if (insertError) throw insertError;

        // 4. DEDUZIR ESTOQUE DE RESINA
        if (totalResinaConsumida > 0) {
            const novoEstoque = Math.max(0, (settings.estoque_resina_kg || 0) - totalResinaConsumida);

            const { error: stockError } = await supabase
                .from('pricing_params')
                .update({ estoque_resina_kg: novoEstoque })
                .eq('id', 1);

            if (stockError) console.error('Falha ao deduzir estoque de resina:', stockError);
            else console.log(`Estoque de resina atualizado: -${totalResinaConsumida.toFixed(3)}kg. Novo saldo: ${novoEstoque.toFixed(3)}kg`);
        }

        return NextResponse.json(insertedData);
    } catch (error: any) {
        console.error('Sales POST Batch API Crash:', error);
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
