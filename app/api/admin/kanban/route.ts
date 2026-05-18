import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LER TAREFAS DO KANBAN
// Retorna todas as vendas ativas (Não concluídas)
export async function GET() {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'production']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { data: kanbanData, error } = await supabase
            .from('vendas')
            .select(`
                *,
                figuras ( nome, imagem_url, studios ( nome ) )
            `)
            .neq('status', 'Concluída') // Esconde as já finalizadas
            .order('data_venda', { ascending: true }); // Mais antigas primeiro

        if (error) throw error;

        // Fetch display names for vendors
        const { data: users } = await supabase
            .from('admin_users')
            .select('id, email, nome');

        const userMap = (users || []).reduce((acc: any, u) => {
            acc[u.id] = u.nome;
            acc[u.email.toLowerCase()] = u.nome;
            return acc;
        }, {});

        const formatted = kanbanData.map(s => ({
            ...s,
            vendedor_nome: userMap[s.vendedor] || userMap[(s.vendedor || '').toLowerCase()] || 'Ateliê'
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR STATUS NO KANBAN COM AUTOMAÇÃO DE RESINA
export async function PATCH(req: Request) {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'production']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { id, status: newStatus } = await req.json();

        if (!id || !newStatus) {
            return NextResponse.json({ error: 'ID e Status são obrigatórios' }, { status: 400 });
        }

        // 1. Buscar status atual e peso de resina para calcular automação
        const { data: sale, error: fetchError } = await supabase
            .from('vendas')
            .select('status, quantidade, figuras(figuras_meta(resina_kg))')
            .eq('id', id)
            .single();

        if (fetchError || !sale) throw new Error('Venda não encontrada');

        const oldStatus = sale.status;
        const figure = Array.isArray(sale.figuras) ? sale.figuras[0] : sale.figuras;
        const meta = Array.isArray(figure?.figuras_meta) ? figure.figuras_meta[0] : figure?.figuras_meta;
        const resinaWeight = Number(meta?.resina_kg) || 0;
        const totalUsed = resinaWeight * (sale.quantidade || 1);

        // 2. Definir lógica de consumo
        // Status que indicam que a resina já foi gasta (Pós-Impressão)
        const consumedStatuses = ['Lavagem e Cura', 'Pintura Secagem', 'Pronto p/ Entrega', 'Concluída'];
        const wasConsumed = consumedStatuses.includes(oldStatus);
        const isConsumedNow = consumedStatuses.includes(newStatus);

        // 3. Executar Automação de Estoque
        if (totalUsed > 0 && wasConsumed !== isConsumedNow) {
            // Buscar estoque atual
            const { data: settings } = await supabase
                .from('pricing_params')
                .select('estoque_resina_kg')
                .eq('id', 1)
                .single();

            const currentStock = Number(settings?.estoque_resina_kg) || 0;
            let newStock = currentStock;

            if (!wasConsumed && isConsumedNow) {
                // MOVEU PARA FRENTE: Gasta resina
                newStock = Math.max(0, currentStock - totalUsed);
            } else if (wasConsumed && !isConsumedNow) {
                // MOVEU PARA TRÁS: Estorna resina
                newStock = currentStock + totalUsed;
            }

            // Atualizar estoque
            await supabase
                .from('pricing_params')
                .update({ estoque_resina_kg: newStock })
                .eq('id', 1);
        }

        // 4. Salvar novo status da venda
        const { data, error } = await supabase
            .from('vendas')
            .update({ status: newStatus })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Kanban Update Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
