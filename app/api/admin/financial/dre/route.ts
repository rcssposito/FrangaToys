import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const now = new Date();
        const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);
        const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10); // 1-12

        // Datas de início e fim do mês selecionado (UTC)
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        // Mês anterior para cálculo comparativo
        const prevMonthDate = new Date(Date.UTC(year, month - 2, 1));
        const prevYear = prevMonthDate.getUTCFullYear();
        const prevMonth = prevMonthDate.getUTCMonth() + 1;
        const prevStartDate = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0));
        const prevEndDate = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999));

        // 1. Carrega parâmetros de precificação globais
        const { data: pricingParams } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        const custoResinaKg = Number(pricingParams?.custo_resina_kg) || 200;
        const custoHImpressao = Number(pricingParams?.custo_h_impressao) || 2;
        const taxaCartao = Number(pricingParams?.taxa_cartao) || 1.15; // Ex: 1.15 = 15% de taxa aproximada de cartão/gateway

        // 2. Busca vendas do mês selecionado
        const { data: currentSales, error: salesError } = await supabase
            .from('vendas')
            .select(`
                id,
                data_venda,
                cliente_nome,
                cliente_contato,
                canal_venda,
                status,
                status_pagamento,
                valor_venda_final,
                valor_frete,
                custo_producao_snapshot,
                lucro_real,
                quantidade,
                comissao_vendedor,
                valor_pago_pintor,
                pintor_nome,
                vendedor,
                figura_id,
                figuras: figuras (
                    id,
                    nome,
                    codigo,
                    imagem_url,
                    studios: studios ( id, nome ),
                    figuras_meta (
                        resina_kg,
                        horas_impressao,
                        horas_pintura
                    )
                )
            `)
            .gte('data_venda', startDate.toISOString())
            .lte('data_venda', endDate.toISOString())
            .neq('status', 'Cancelado')
            .order('data_venda', { ascending: false });

        if (salesError) throw salesError;

        // 3. Busca vendas do mês anterior para comparativo
        const { data: prevSales } = await supabase
            .from('vendas')
            .select('id, valor_venda_final, valor_frete, custo_producao_snapshot, lucro_real, status, status_pagamento')
            .gte('data_venda', prevStartDate.toISOString())
            .lte('data_venda', prevEndDate.toISOString())
            .neq('status', 'Cancelado');

        // 4. Busca mensalidades de estúdios (Patreon) para o mês
        const { data: studiosData } = await supabase
            .from('studios_mensalidades')
            .select(`
                id,
                ano,
                mes,
                ativo,
                valor_pago,
                tier_tipo,
                observacao,
                studio: studios ( id, nome, custo_mensal, ativo, logo_url )
            `)
            .eq('ano', year)
            .eq('mes', month);

        // Se não houver mensalidades lançadas para o mês específico, busca na tabela de estúdios os que estão ativos
        let totalAssinaturasEstudios = 0;
        let listaEstudios: any[] = [];

        if (studiosData && studiosData.length > 0) {
            listaEstudios = studiosData.map((item: any) => {
                const studioObj = Array.isArray(item.studio) ? item.studio[0] : item.studio;
                return {
                    id: studioObj?.id || item.id,
                    nome: studioObj?.nome || 'Estúdio',
                    valor: Number(item.valor_pago) || 0,
                    tier: item.tier_tipo,
                    ativo: item.ativo,
                    observacao: item.observacao,
                    origem: 'mensalidade_registrada'
                };
            });
            totalAssinaturasEstudios = listaEstudios.reduce((acc, curr) => acc + curr.valor, 0);
        } else {
            const { data: activeStudios } = await supabase
                .from('studios')
                .select('id, nome, custo_mensal, ativo, logo_url')
                .eq('ativo', true);

            listaEstudios = (activeStudios || []).map(s => ({
                id: s.id,
                nome: s.nome,
                valor: Number(s.custo_mensal) || 0,
                tier: 'Mensalidade Fixa',
                ativo: s.ativo,
                origem: 'custo_mensal_cadastrado'
            }));
            totalAssinaturasEstudios = listaEstudios.reduce((acc, curr) => acc + curr.valor, 0);
        }

        const regime = searchParams.get('regime') || 'competencia'; // 'competencia' (padrão contábil DRE) ou 'caixa' (apenas pagos)

        // 5. Cálculos DRE do Mês Atual baseados diretamente na tabela VENDAS
        let faturamentoProdutos = 0;
        let faturamentoFrete = 0;
        let faturamentoRecebido = 0;
        let faturamentoPendente = 0;
        let faturamentoTotal = 0;
        let somaLucroRealVendas = 0;

        let totalCustoProducaoSnapshot = 0;
        let totalCustoPintores = 0;
        let totalComissaoVendedores = 0;

        const pedidosDetalhados: any[] = [];

        (currentSales || []).forEach((sale: any) => {
            const valVenda = Number(sale.valor_venda_final) || 0;
            const valFrete = Number(sale.valor_frete) || 0;
            const custoProd = Number(sale.custo_producao_snapshot) || 0;
            const valPintor = Number(sale.valor_pago_pintor) || 0;
            const comissao = Number(sale.comissao_vendedor) || 0;
            const lucroReal = Number(sale.lucro_real) || (valVenda - custoProd - valPintor - comissao);
            
            const isPago = sale.status_pagamento === 'Pago' || sale.status === 'Concluída';

            if (isPago) {
                faturamentoRecebido += (valVenda + valFrete);
            } else {
                faturamentoPendente += (valVenda + valFrete);
            }

            // No regime de competência (oficial DRE), todas as vendas confirmadas entram no faturamento
            // No regime de caixa, apenas as vendas pagas entram
            const entraNoCalculo = regime === 'competencia' || isPago;

            if (entraNoCalculo) {
                faturamentoProdutos += valVenda;
                faturamentoFrete += valFrete;
                totalCustoProducaoSnapshot += custoProd;
                totalCustoPintores += valPintor;
                totalComissaoVendedores += comissao;
                somaLucroRealVendas += lucroReal;
            }

            // Metadados da figura (apenas para exibição visual do nome/studio)
            const figura = Array.isArray(sale.figuras) ? sale.figuras[0] : sale.figuras;
            const studioName = figura?.studios?.nome || (Array.isArray(figura?.studios) ? figura.studios[0]?.nome : 'Ateliê');

            pedidosDetalhados.push({
                id: sale.id,
                data_venda: sale.data_venda,
                cliente_nome: sale.cliente_nome,
                cliente_contato: sale.cliente_contato,
                canal_venda: sale.canal_venda,
                status: sale.status,
                status_pagamento: sale.status_pagamento,
                valor_total: valVenda + valFrete,
                valor_venda: valVenda,
                valor_frete: valFrete,
                figura_nome: figura?.nome || 'Figura',
                studio_nome: studioName,
                custo_producao: custoProd,
                valor_pintor: valPintor,
                pintor_nome: sale.pintor_nome,
                comissao_vendedor: comissao,
                vendedor: sale.vendedor,
                lucro_real: lucroReal
            });
        });

        faturamentoTotal = faturamentoProdutos + faturamentoFrete;

        // Custos Variáveis dos Produtos Vendidos (CPV Direto)
        const totalCustoProducaoVariavel = totalCustoProducaoSnapshot + totalCustoPintores + totalComissaoVendedores;

        // Margem de Contribuição / Lucro Bruto das Peças (soma direta do lucro real das vendas)
        const lucroBruto = somaLucroRealVendas;

        // Lucro Líquido Real (Lucro das Peças abatendo as assinaturas fixas de estúdios)
        const lucroLiquidoReal = lucroBruto - totalAssinaturasEstudios;
        const margemLiquidaPct = faturamentoTotal > 0 ? (lucroLiquidoReal / faturamentoTotal) * 100 : 0;
        const margemBrutaPct = faturamentoProdutos > 0 ? (lucroBruto / faturamentoProdutos) * 100 : 0;

        // 6. Cálculos do Mês Anterior para Comparativo
        let prevFaturamento = 0;
        let prevLucroReal = 0;
        (prevSales || []).forEach((s: any) => {
            const val = Number(s.valor_venda_final) || 0;
            const frete = Number(s.valor_frete) || 0;
            const lucro = Number(s.lucro_real) || 0;
            const isPrevPago = s.status_pagamento === 'Pago' || s.status === 'Concluída';
            const entraPrev = regime === 'competencia' || isPrevPago;
            if (entraPrev) {
                prevFaturamento += (val + frete);
                prevLucroReal += lucro;
            }
        });

        const diffFaturamentoPct = prevFaturamento > 0
            ? ((faturamentoTotal - prevFaturamento) / prevFaturamento) * 100
            : 0;

        const diffLucroPct = prevLucroReal > 0
            ? ((lucroLiquidoReal - (prevLucroReal - totalAssinaturasEstudios)) / Math.abs(prevLucroReal - totalAssinaturasEstudios || 1)) * 100
            : 0;

        return NextResponse.json({
            periodo: {
                ano: year,
                mes: month,
                regime,
                data_inicio: startDate.toISOString(),
                data_fim: endDate.toISOString(),
                ano_anterior: prevYear,
                mes_anterior: prevMonth
            },
            parametros_utilizados: {
                custo_resina_kg: custoResinaKg,
                custo_h_impressao: custoHImpressao,
                taxa_cartao: taxaCartao
            },
            kpis: {
                faturamento_total: faturamentoTotal,
                faturamento_produtos: faturamentoProdutos,
                faturamento_frete: faturamentoFrete,
                faturamento_recebido: faturamentoRecebido,
                faturamento_pendente: faturamentoPendente,
                soma_lucro_real_vendas: somaLucroRealVendas,
                total_pedidos: pedidosDetalhados.length,
                pedidos_pagos: pedidosDetalhados.filter(p => p.status_pagamento === 'Pago' || p.status === 'Concluída').length,
                pedidos_pendentes: pedidosDetalhados.filter(p => p.status_pagamento !== 'Pago' && p.status !== 'Concluída').length,
                total_custos_producao: totalCustoProducaoVariavel,
                total_custo_impressao_resina: totalCustoProducaoSnapshot,
                total_custo_pintores: totalCustoPintores,
                total_comissoes_vendedores: totalComissaoVendedores,
                total_assinaturas_estudios: totalAssinaturasEstudios,
                lucro_bruto: lucroBruto,
                margem_bruta_pct: Number(margemBrutaPct.toFixed(1)),
                lucro_liquido_real: lucroLiquidoReal,
                margem_liquida_pct: Number(margemLiquidaPct.toFixed(1)),
                comparativo: {
                    prev_faturamento: prevFaturamento,
                    diff_faturamento_pct: Number(diffFaturamentoPct.toFixed(1)),
                    prev_lucro: prevLucroReal,
                    diff_lucro_pct: Number(diffLucroPct.toFixed(1))
                }
            },
            dre: {
                receita_bruta: {
                    total: faturamentoTotal,
                    vendas_produtos: faturamentoProdutos,
                    fretes: faturamentoFrete
                },
                custos_variaveis_cpv: {
                    total: totalCustoProducaoVariavel,
                    impressao_e_resina: totalCustoProducaoSnapshot,
                    pintores_freelancers: totalCustoPintores,
                    comissoes_vendedores: totalComissaoVendedores
                },
                lucro_bruto: lucroBruto,
                despesas_fixas: {
                    total: totalAssinaturasEstudios,
                    assinaturas_patreon: totalAssinaturasEstudios,
                    qtd_estudios: listaEstudios.length
                },
                lucro_liquido_real: lucroLiquidoReal,
                margem_liquida_pct: Number(margemLiquidaPct.toFixed(1)),
                margem_bruta_pct: Number(margemBrutaPct.toFixed(1))
            },
            estudios: listaEstudios,
            pedidos: pedidosDetalhados
        });

    } catch (error: any) {
        console.error('DRE API Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao consolidar DRE' }, { status: 500 });
    }
}
