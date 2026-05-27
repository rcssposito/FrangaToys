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

        const { id, status: newStatus, status_pagamento: newStatusPagamento, valor_pago_parcial: newValorPagoParcial } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
        }

        if (newStatus === undefined && newStatusPagamento === undefined && newValorPagoParcial === undefined) {
            return NextResponse.json({ error: 'Status, Status de Pagamento ou Valor Pago Parcial é obrigatório' }, { status: 400 });
        }

        // 1. Executar automação de resina se o status logístico mudou
        if (newStatus) {
            // Buscar status atual e peso de resina para calcular automação
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
        }

        let calculatedStatusPagamento = newStatusPagamento;

        if (newValorPagoParcial !== undefined) {
            // Buscar valor total da venda para calcular o status de pagamento
            const { data: saleData, error: saleError } = await supabase
                .from('vendas')
                .select('valor_venda_final')
                .eq('id', id)
                .single();

            if (saleError || !saleData) throw new Error('Venda não encontrada para cálculo de pagamento');

            const total = Number(saleData.valor_venda_final) || 0;
            const paid = Number(newValorPagoParcial) || 0;

            if (paid >= total) {
                calculatedStatusPagamento = 'Pago';
            } else if (paid > 0) {
                calculatedStatusPagamento = 'Parcial';
            } else {
                calculatedStatusPagamento = 'Pendente/Incompleto';
            }
        }

        // 4. Salvar novas propriedades da venda
        const updateFields: any = {};
        if (newStatus !== undefined) updateFields.status = newStatus;
        if (calculatedStatusPagamento !== undefined) updateFields.status_pagamento = calculatedStatusPagamento;
        if (newValorPagoParcial !== undefined) updateFields.valor_pago_parcial = newValorPagoParcial;

        const { data, error } = await supabase
            .from('vendas')
            .update(updateFields)
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
