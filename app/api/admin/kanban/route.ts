import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LER TAREFAS DO KANBAN
// Retorna todas as vendas ativas (Não concluídas) com horas e remuneração de pintura
export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'production', 'painter']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        // Fetch pricing params to calculate painter remuneration
        const { data: pricing } = await supabase
            .from('pricing_params')
            .select('custo_h_pintura')
            .eq('id', 1)
            .single();
        const custoHPintura = Number(pricing?.custo_h_pintura) || 50;

        const { data: kanbanData, error } = await supabase
            .from('vendas')
            .select(`
                *,
                figuras ( 
                    nome, 
                    imagem_url, 
                    studios ( nome ),
                    figuras_meta ( horas_pintura, resina_kg )
                )
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

        const formatted = kanbanData.map(s => {
            const figure = Array.isArray(s.figuras) ? s.figuras[0] : s.figuras;
            const meta = Array.isArray(figure?.figuras_meta) ? figure?.figuras_meta[0] : figure?.figuras_meta;
            const horasPintura = Number(meta?.horas_pintura) || 0;
            const quantidade = Number(s.quantidade) || 1;
            const valorPinturaCalculado = Math.ceil(horasPintura * custoHPintura) * quantidade;

            return {
                ...s,
                checklist: Array.isArray(s.checklist) ? s.checklist : [],
                wip_fotos: Array.isArray(s.wip_fotos) ? s.wip_fotos : [],
                horas_pintura: horasPintura,
                valor_estimado_pintor: valorPinturaCalculado,
                valor_pago_pintor: Number(s.valor_pago_pintor) || (s.pintura_freelancer ? valorPinturaCalculado : 0),
                vendedor_nome: (() => {
                    const name = userMap[s.vendedor] || userMap[(s.vendedor || '').toLowerCase()] || 'Ateliê';
                    return name.toLowerCase().includes('rodrigo') ? '@frangatoys' : name;
                })()
            };
        });

        return NextResponse.json(formatted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR STATUS NO KANBAN COM AUTOMAÇÃO DE RESINA E ATRIBUIÇÃO DE PINTOR
export async function PATCH(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'production', 'painter']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
        const session = sessionOrResponse;

        const body = await req.json();
        const { 
            id, 
            status: newStatus, 
            status_pagamento: newStatusPagamento, 
            valor_pago_parcial: newValorPagoParcial,
            action,
            pintor_nome: customPintorNome,
            checklist: newChecklist
        } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
        }

        // 1. AÇÃO ESPECÍFICA: ASSUMIR OU LIBERAR PINTURA
        if (action === 'assign_painter' || action === 'release_painter') {
            const { data: sale, error: fetchError } = await supabase
                .from('vendas')
                .select(`
                    id,
                    quantidade,
                    valor_venda_final,
                    custo_producao_snapshot,
                    comissao_vendedor,
                    valor_pago_pintor,
                    pintor_nome,
                    figuras (
                        figuras_meta ( horas_pintura )
                    )
                `)
                .eq('id', id)
                .single();

            if (fetchError || !sale) throw new Error('Venda não encontrada');

            if (action === 'assign_painter') {
                const targetPintor = (customPintorNome || session.nome || session.email || 'Pintor').trim();
                
                // Buscar custo_h_pintura
                const { data: pricing } = await supabase
                    .from('pricing_params')
                    .select('custo_h_pintura')
                    .eq('id', 1)
                    .single();
                const custoHPintura = Number(pricing?.custo_h_pintura) || 50;

                const figure = Array.isArray(sale.figuras) ? sale.figuras[0] : sale.figuras;
                const meta = Array.isArray(figure?.figuras_meta) ? figure?.figuras_meta[0] : figure?.figuras_meta;
                const horasPintura = Number(meta?.horas_pintura) || 0;
                const quantidade = Number(sale.quantidade) || 1;
                const valorPagoPintor = Math.ceil(horasPintura * custoHPintura) * quantidade;

                const valorVendaFinal = Number(sale.valor_venda_final) || 0;
                const custoProducao = Number(sale.custo_producao_snapshot) || 0;
                const comissao = Number(sale.comissao_vendedor) || 0;
                const novoLucroReal = valorVendaFinal - custoProducao - valorPagoPintor - comissao;

                const { data: updatedSale, error: updateError } = await supabase
                    .from('vendas')
                    .update({
                        pintor_nome: targetPintor,
                        pintura_freelancer: true,
                        valor_pago_pintor: valorPagoPintor,
                        lucro_real: novoLucroReal
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return NextResponse.json({ success: true, sale: updatedSale });
            }

            if (action === 'release_painter') {
                const valorVendaFinal = Number(sale.valor_venda_final) || 0;
                const custoProducao = Number(sale.custo_producao_snapshot) || 0;
                const comissao = Number(sale.comissao_vendedor) || 0;
                const novoLucroReal = valorVendaFinal - custoProducao - comissao;

                const { data: updatedSale, error: updateError } = await supabase
                    .from('vendas')
                    .update({
                        pintor_nome: null,
                        pintura_freelancer: false,
                        valor_pago_pintor: 0,
                        lucro_real: novoLucroReal
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return NextResponse.json({ success: true, sale: updatedSale });
            }
        }

        if (newStatus === undefined && newStatusPagamento === undefined && newValorPagoParcial === undefined && newChecklist === undefined) {
            return NextResponse.json({ error: 'Status, Status de Pagamento, Valor Pago Parcial ou Checklist é obrigatório' }, { status: 400 });
        }

        // 2. Executar automação de resina se o status logístico mudou
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
            const meta = Array.isArray(figure?.figuras_meta) ? figure?.figuras_meta[0] : figure?.figuras_meta;
            const resinaWeight = Number(meta?.resina_kg) || 0;
            const totalUsed = resinaWeight * (sale.quantidade || 1);

            // Definir lógica de consumo (Pós-Impressão)
            const consumedStatuses = ['Lavagem e Cura', 'Pintura Secagem', 'Pronto p/ Entrega', 'Concluída'];
            const wasConsumed = consumedStatuses.includes(oldStatus);
            const isConsumedNow = consumedStatuses.includes(newStatus);

            // Executar Automação de Estoque
            if (totalUsed > 0 && wasConsumed !== isConsumedNow) {
                const { data: settings } = await supabase
                    .from('pricing_params')
                    .select('estoque_resina_kg')
                    .eq('id', 1)
                    .single();

                const currentStock = Number(settings?.estoque_resina_kg) || 0;
                let newStock = currentStock;

                if (!wasConsumed && isConsumedNow) {
                    newStock = Math.max(0, currentStock - totalUsed);
                } else if (wasConsumed && !isConsumedNow) {
                    newStock = currentStock + totalUsed;
                }

                await supabase
                    .from('pricing_params')
                    .update({ estoque_resina_kg: newStock })
                    .eq('id', 1);
            }
        }

        let calculatedStatusPagamento = newStatusPagamento;

        if (newValorPagoParcial !== undefined) {
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

        // 3. Salvar novas propriedades da venda
        const updateFields: any = {};
        if (newStatus !== undefined) updateFields.status = newStatus;
        if (calculatedStatusPagamento !== undefined) updateFields.status_pagamento = calculatedStatusPagamento;
        if (newValorPagoParcial !== undefined) updateFields.valor_pago_parcial = newValorPagoParcial;
        if (newChecklist !== undefined) updateFields.checklist = newChecklist;

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
