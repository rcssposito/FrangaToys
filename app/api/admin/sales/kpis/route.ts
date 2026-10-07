import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'mensal'; // 'mensal' | 'anual'
        const paramMonth = searchParams.get('month'); // '0'..'11'
        const paramYear = searchParams.get('year');   // '2024'..'2027'

        const now = new Date();
        const selectedYear = paramYear ? parseInt(paramYear, 10) : now.getFullYear();
        const selectedMonth = paramMonth !== null && paramMonth !== undefined ? parseInt(paramMonth, 10) : now.getMonth();

        let filterStartDate: Date | null = null;
        let filterEndDate: Date | null = null;
        let periodLabel = '';

        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        if (range === 'mensal') {
            // Primeiro e último dia do mês selecionado
            filterStartDate = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0, 0));
            filterEndDate = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999));
            periodLabel = `${monthNames[selectedMonth]} de ${selectedYear}`;
        } else {
            // Ano inteiro selecionado
            filterStartDate = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0, 0));
            filterEndDate = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));
            periodLabel = `Ano Completo de ${selectedYear}`;
        }

        const pageSize = 1000;

        // 1. Buscar todas as vendas não canceladas no período solicitado com paginação determinística
        let allSales: any[] = [];
        let sPage = 0;
        let sHasMore = true;

        while (sHasMore) {
            let salesQuery = supabase
                .from('vendas')
                .select(`
                    id,
                    data_venda,
                    valor_venda_final,
                    lucro_real,
                    quantidade,
                    figura_id,
                    status
                `)
                .neq('status', 'Cancelada')
                .order('id', { ascending: true })
                .range(sPage * pageSize, (sPage + 1) * pageSize - 1);

            if (filterStartDate) {
                salesQuery = salesQuery.gte('data_venda', filterStartDate.toISOString());
            }
            if (filterEndDate) {
                salesQuery = salesQuery.lte('data_venda', filterEndDate.toISOString());
            }

            const { data: sBatch, error: salesErr } = await salesQuery;
            if (salesErr) throw salesErr;

            if (sBatch && sBatch.length > 0) {
                allSales = allSales.concat(sBatch);
                if (sBatch.length < pageSize) {
                    sHasMore = false;
                } else {
                    sPage++;
                }
            } else {
                sHasMore = false;
            }
        }

        // 2. Metadados do catálogo: Séries, Estúdios e Categorias
        const [seriesRes, studiosRes, categoriesRes] = await Promise.all([
            supabase.from('series').select('id, nome, categoria_id').order('id', { ascending: true }),
            supabase.from('studios').select('id, nome, ativo, custo_mensal, logo_url').order('id', { ascending: true }),
            supabase.from('categorias').select('id, nome').order('id', { ascending: true })
        ]);

        if (seriesRes.error) throw seriesRes.error;
        if (studiosRes.error) throw studiosRes.error;
        if (categoriesRes.error) throw categoriesRes.error;

        const seriesList = seriesRes.data || [];
        const rawStudiosList = studiosRes.data || [];
        const categoriesList = categoriesRes.data || [];

        // Considerar exclusivamente estúdios ativos e Custom
        const isStudioActiveOrCustom = (st: any) => {
            if (!st) return false;
            if (st.ativo === true) return true;
            if (st.id === 0) return true;
            if (typeof st.nome === 'string' && st.nome.trim().toLowerCase() === 'custom') return true;
            return false;
        };

        const studiosList = rawStudiosList.filter(isStudioActiveOrCustom);
        let customStudio = studiosList.find(st => st.id === 0 || (typeof st.nome === 'string' && st.nome.trim().toLowerCase() === 'custom'));
        if (!customStudio) {
            customStudio = { id: 0, nome: 'Custom', ativo: true, custo_mensal: 0, logo_url: null };
            studiosList.push(customStudio);
        }
        const customStudioId = customStudio.id;

        const activeStudioIds = new Set<number>(studiosList.map(s => Number(s.id)));
        activeStudioIds.add(customStudioId);
        activeStudioIds.add(0);

        // 3. Buscar todas as figuras do catálogo via paginação determinística (elimina limite de 1000)
        let allFigures: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            const { data: batch, error: batchErr } = await supabase
                .from('figuras')
                .select('id, nome, imagem_url, views, studio_id, serie_id')
                .order('id', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (batchErr) throw batchErr;

            if (batch && batch.length > 0) {
                allFigures = allFigures.concat(batch);
                if (batch.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        // Criar mapas rápidos para lookup O(1)
        const categoriesMap = new Map<number, string>();
        categoriesList.forEach(c => categoriesMap.set(c.id, c.nome));

        const seriesMap = new Map<number, { id: number; nome: string; categoriaId: number | null; categoriaNome: string }>();
        seriesList.forEach(s => {
            const catNome = s.categoria_id ? (categoriesMap.get(s.categoria_id) || 'Outros') : 'Outros';
            seriesMap.set(s.id, { id: s.id, nome: s.nome, categoriaId: s.categoria_id, categoriaNome: catNome });
        });

        const studiosMap = new Map<number, any>();
        studiosList.forEach(st => studiosMap.set(Number(st.id), st));

        const figuresMap = new Map<number, any>();
        allFigures.forEach(f => figuresMap.set(f.id, f));

        // Buscar histórico de mensalidades do ano para cálculo exato de custos de estúdios
        const { data: mensalidadesData } = await supabase
            .from('studios_mensalidades')
            .select('studio_id, mes, ativo, valor_pago')
            .eq('ano', selectedYear);

        const mensalidadesMap = new Map<string, { ativo: boolean; valor: number }>();
        (mensalidadesData || []).forEach(m => {
            mensalidadesMap.set(`${m.studio_id}-${m.mes}`, {
                ativo: Boolean(m.ativo),
                valor: Number(m.valor_pago) || 0
            });
        });

        // 4. Totais Globais
        const totalFaturamentoGeral = allSales.reduce((acc, s) => acc + (Number(s.valor_venda_final) || 0), 0);
        const totalLucroGeral = allSales.reduce((acc, s) => acc + (Number(s.lucro_real) || 0), 0);
        const totalUnidadesGeral = allSales.reduce((acc, s) => acc + (Number(s.quantidade) || 1), 0);

        // Estruturas de agregação
        interface AggregateItem {
            id: number | string;
            nome: string;
            extra?: any;
            totalModelos: number;
            totalViews: number;
            unidadesVendidas: number;
            faturamentoTotal: number;
            lucroTotal: number;
            ticketMedio: number;
            shareReceita: number;
            taxaGiro: number;
            statusDecisao: 'manter' | 'observar' | 'descartar' | 'baixa_procura';
            statusLabel: string;
            motivo: string;
        }

        const aggSeries: Record<number, AggregateItem> = {};
        const aggStudios: Record<number, AggregateItem> = {};
        const aggCategorias: Record<number, AggregateItem> = {};
        const aggFiguras: Record<number, {
            id: number;
            nome: string;
            imagem_url: string;
            views: number;
            serieNome: string;
            studioNome: string;
            unidadesVendidas: number;
            faturamentoTotal: number;
            lucroTotal: number;
        }> = {};

        // Inicializar todas as séries do catálogo ("Séries não precisam ser apenas dos estúdios ativos")
        seriesList.forEach(s => {
            const catInfo = seriesMap.get(s.id);
            aggSeries[s.id] = {
                id: s.id,
                nome: s.nome,
                extra: { categoriaNome: catInfo?.categoriaNome || 'Outros' },
                totalModelos: 0,
                totalViews: 0,
                unidadesVendidas: 0,
                faturamentoTotal: 0,
                lucroTotal: 0,
                ticketMedio: 0,
                shareReceita: 0,
                taxaGiro: 0,
                statusDecisao: 'baixa_procura',
                statusLabel: 'SEM VENDAS',
                motivo: 'Zero vendas registradas no catálogo no período'
            };
        });

        // Inicializar apenas estúdios ativos e Custom com apuração real de mensalidades pagas
        studiosList.forEach(st => {
            const stId = Number(st.id);
            const custoBase = Number(st.custo_mensal) || 0;
            
            let custoPeriodo = 0;
            let mesesAtivosPeriodo = 0;

            if (range === 'mensal') {
                const mesNum = selectedMonth + 1;
                const reg = mensalidadesMap.get(`${stId}-${mesNum}`);
                if (reg) {
                    if (reg.ativo) {
                        custoPeriodo = reg.valor;
                        mesesAtivosPeriodo = 1;
                    } else {
                        custoPeriodo = 0;
                        mesesAtivosPeriodo = 0;
                    }
                } else {
                    custoPeriodo = st.ativo ? custoBase : 0;
                    mesesAtivosPeriodo = st.ativo ? 1 : 0;
                }
            } else {
                let hasAnyRecord = false;
                for (let m = 1; m <= 12; m++) {
                    const reg = mensalidadesMap.get(`${stId}-${m}`);
                    if (reg) {
                        hasAnyRecord = true;
                        if (reg.ativo) {
                            custoPeriodo += reg.valor;
                            mesesAtivosPeriodo += 1;
                        }
                    }
                }
                if (!hasAnyRecord) {
                    custoPeriodo = st.ativo ? (custoBase * 12) : 0;
                    mesesAtivosPeriodo = st.ativo ? 12 : 0;
                }
            }

            aggStudios[stId] = {
                id: stId,
                nome: st.nome,
                extra: { 
                    ativo: st.ativo, 
                    custoMensal: custoBase, 
                    custoPeriodo, 
                    mesesAtivosPeriodo,
                    logoUrl: st.logo_url 
                },
                totalModelos: 0,
                totalViews: 0,
                unidadesVendidas: 0,
                faturamentoTotal: 0,
                lucroTotal: 0,
                ticketMedio: 0,
                shareReceita: 0,
                taxaGiro: 0,
                statusDecisao: custoPeriodo <= 0 ? 'manter' : 'descartar',
                statusLabel: custoPeriodo <= 0 ? 'MANTER (SEM CUSTO)' : 'CANDIDATO A DESCARTE',
                motivo: custoPeriodo <= 0 ? 'Estúdio sem custo registrado no período.' : 'Zero vendas no período com custo fixo ativo.'
            };
        });

        // Inicializar todas as categorias
        categoriesList.forEach(c => {
            aggCategorias[c.id] = {
                id: c.id,
                nome: c.nome,
                totalModelos: 0,
                totalViews: 0,
                unidadesVendidas: 0,
                faturamentoTotal: 0,
                lucroTotal: 0,
                ticketMedio: 0,
                shareReceita: 0,
                taxaGiro: 0,
                statusDecisao: 'observar',
                statusLabel: 'NICHO SECUNDÁRIO',
                motivo: 'Sem vendas no período'
            };
        });

        // Contabilizar modelos e visualizações no acervo
        allFigures.forEach(f => {
            const views = Number(f.views) || 0;

            // Séries (todas as figuras do catálogo)
            if (f.serie_id != null && aggSeries[f.serie_id]) {
                aggSeries[f.serie_id].totalModelos += 1;
                aggSeries[f.serie_id].totalViews += views;
            }

            // Estúdios (apenas estúdios ativos e Custom)
            const studioId = (f.studio_id != null && f.studio_id !== undefined) ? Number(f.studio_id) : 0;
            if (aggStudios[studioId]) {
                aggStudios[studioId].totalModelos += 1;
                aggStudios[studioId].totalViews += views;
            }

            // Categorias
            const sInfo = f.serie_id != null ? seriesMap.get(f.serie_id) : null;
            if (sInfo?.categoriaId != null && aggCategorias[sInfo.categoriaId]) {
                aggCategorias[sInfo.categoriaId].totalModelos += 1;
                aggCategorias[sInfo.categoriaId].totalViews += views;
            }

            // Iniciar figura
            const stInfo = f.studio_id != null ? studiosMap.get(Number(f.studio_id)) : null;
            aggFiguras[f.id] = {
                id: f.id,
                nome: f.nome,
                imagem_url: f.imagem_url,
                views,
                serieNome: sInfo?.nome || 'Sem Série',
                studioNome: stInfo?.nome || (f.studio_id === 0 ? 'Custom' : 'Sem Estúdio'),
                unidadesVendidas: 0,
                faturamentoTotal: 0,
                lucroTotal: 0
            };
        });

        // Garantir entrada de Figura Personalizada (id: 0) se não existir no mapa
        if (!aggFiguras[0]) {
            aggFiguras[0] = {
                id: 0,
                nome: 'Figura Personalizada (Custom)',
                imagem_url: '',
                views: 0,
                serieNome: 'Personalizados',
                studioNome: 'Custom',
                unidadesVendidas: 0,
                faturamentoTotal: 0,
                lucroTotal: 0
            };
        }

        // 5. Processar cada venda real
        allSales.forEach(s => {
            const figId = s.figura_id;
            const fig = (figId != null && figuresMap.has(figId)) ? figuresMap.get(figId) : null;
            const qtd = Number(s.quantidade) || 1;
            const valor = Number(s.valor_venda_final) || 0;
            const lucro = Number(s.lucro_real) || 0;

            // Atribuição de Figura
            if (figId != null && aggFiguras[figId]) {
                aggFiguras[figId].unidadesVendidas += qtd;
                aggFiguras[figId].faturamentoTotal += valor;
                aggFiguras[figId].lucroTotal += lucro;
            } else if (figId == null || figId === 0) {
                // Venda avulsa ou customizada sem id específico
                aggFiguras[0].unidadesVendidas += qtd;
                aggFiguras[0].faturamentoTotal += valor;
                aggFiguras[0].lucroTotal += lucro;
            }

            // Atribuição de Série
            if (fig?.serie_id != null && aggSeries[fig.serie_id]) {
                aggSeries[fig.serie_id].unidadesVendidas += qtd;
                aggSeries[fig.serie_id].faturamentoTotal += valor;
                aggSeries[fig.serie_id].lucroTotal += lucro;
            }

            // Atribuição de Estúdio: se tiver studio_id ativo, atribui a ele. Se não (ou se for Custom/nulo), atribui a Custom (id 0)
            let targetStudioId = 0;
            if (fig && fig.studio_id != null && fig.studio_id !== undefined) {
                targetStudioId = Number(fig.studio_id);
            }
            if (aggStudios[targetStudioId]) {
                aggStudios[targetStudioId].unidadesVendidas += qtd;
                aggStudios[targetStudioId].faturamentoTotal += valor;
                aggStudios[targetStudioId].lucroTotal += lucro;
            } else if (aggStudios[0]) {
                // Se o estúdio da figura estiver inativo, não soma no estúdio ativo, a menos que seja peça custom
                if (figId == null || figId <= 0) {
                    aggStudios[0].unidadesVendidas += qtd;
                    aggStudios[0].faturamentoTotal += valor;
                    aggStudios[0].lucroTotal += lucro;
                }
            }

            // Atribuição de Categoria
            const sInfo = fig?.serie_id != null ? seriesMap.get(fig.serie_id) : null;
            if (sInfo?.categoriaId != null && aggCategorias[sInfo.categoriaId]) {
                aggCategorias[sInfo.categoriaId].unidadesVendidas += qtd;
                aggCategorias[sInfo.categoriaId].faturamentoTotal += valor;
                aggCategorias[sInfo.categoriaId].lucroTotal += lucro;
            }
        });

        // 6. Calcular KPIs derivados e Regras de Decisão Executiva

        // SÉRIES: apenas as franquias que efetivamente venderam no período solicitado
        const seriesResult = Object.values(aggSeries)
            .filter(item => item.unidadesVendidas > 0)
            .map(item => {
                const ticket = item.unidadesVendidas > 0 ? (item.faturamentoTotal / item.unidadesVendidas) : 0;
                const share = totalFaturamentoGeral > 0 ? ((item.faturamentoTotal / totalFaturamentoGeral) * 100) : 0;
                const giro = item.totalModelos > 0 ? (item.unidadesVendidas / item.totalModelos) : 0;

                let statusDecisao: 'manter' | 'observar' = 'observar';
                let statusLabel = 'EM OBSERVAÇÃO';
                let motivo = `Giro moderado (${item.unidadesVendidas} vendas, ${item.totalViews} views). Franquia ativa no período.`;

                if (item.faturamentoTotal >= 1000 || item.unidadesVendidas >= 3) {
                    statusDecisao = 'manter';
                    statusLabel = 'TOP SELLER / CARRO-CHEFE';
                    motivo = `Franquia de alta tração (R$ ${item.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, ${item.unidadesVendidas} vendas). Recomenda-se expandir variações.`;
                }

                return {
                    ...item,
                    ticketMedio: ticket,
                    shareReceita: share,
                    taxaGiro: giro,
                    statusDecisao,
                    statusLabel,
                    motivo
                };
            }).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);

        // ESTÚDIOS: "Estúdios quero ver só os ativos, os que não tem custo devem constar como manter"
        const studiosResult = Object.values(aggStudios).map(item => {
            const custo = item.extra?.custoPeriodo !== undefined ? item.extra.custoPeriodo : (item.extra?.custoMensal || 0);
            const ticket = item.unidadesVendidas > 0 ? (item.faturamentoTotal / item.unidadesVendidas) : 0;
            const share = totalFaturamentoGeral > 0 ? ((item.faturamentoTotal / totalFaturamentoGeral) * 100) : 0;
            const giro = item.totalModelos > 0 ? (item.unidadesVendidas / item.totalModelos) : 0;

            let statusDecisao: 'manter' | 'observar' | 'descartar' = 'descartar';
            let statusLabel = 'CANDIDATO A DESCARTE';
            const periodoDesc = range === 'mensal' ? 'mês' : `${item.extra?.mesesAtivosPeriodo || 0} meses ativos`;
            let motivo = `Custo de R$ ${custo.toFixed(2)} (${periodoDesc}) sem vendas no período (${item.totalModelos} modelos). Avaliar cancelamento da assinatura.`;

            // Regra crucial: Estúdios com custo zero ou negativo SEMPRE constam como "manter"
            if (custo <= 0) {
                statusDecisao = 'manter';
                statusLabel = 'MANTER (SEM CUSTO NO PERÍODO)';
                motivo = item.unidadesVendidas > 0
                    ? `Sob encomenda ou inativo. Forte tração (R$ ${item.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, ${item.unidadesVendidas} vendas) com custo fixo ZERO.`
                    : `Estúdio sem mensalidade ou inativo no período. Sem custo de manutenção da assinatura.`;
            } else if (item.faturamentoTotal >= 1000 || item.unidadesVendidas >= 3 || item.lucroTotal >= (custo * 1.5)) {
                statusDecisao = 'manter';
                statusLabel = 'MANTER & EXPANDIR';
                motivo = `Alta rentabilidade (R$ ${item.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Cobre o custo de R$ ${custo.toFixed(2)} com folga.`;
            } else if (item.unidadesVendidas >= 1 || item.totalViews >= 45) {
                statusDecisao = 'observar';
                statusLabel = 'EM OBSERVAÇÃO';
                motivo = `Giro intermediário (${item.unidadesVendidas} vendas, ${item.totalViews} views). Acompanhar se o lucro supera o custo apurado (R$ ${custo.toFixed(2)}).`;
            }

            return {
                ...item,
                ticketMedio: ticket,
                shareReceita: share,
                taxaGiro: giro,
                statusDecisao,
                statusLabel,
                motivo
            };
        }).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);

        // CATEGORIAS
        const categoriasResult = Object.values(aggCategorias)
            .filter(item => item.totalModelos > 0 || item.unidadesVendidas > 0)
            .map(item => {
                const ticket = item.unidadesVendidas > 0 ? (item.faturamentoTotal / item.unidadesVendidas) : 0;
                const share = totalFaturamentoGeral > 0 ? ((item.faturamentoTotal / totalFaturamentoGeral) * 100) : 0;

                let statusDecisao: 'manter' | 'observar' | 'descartar' = 'observar';
                let statusLabel = 'NICHO SECUNDÁRIO';
                let motivo = `Participação de ${share.toFixed(1)}% no faturamento total da loja.`;

                if (share >= 25 || item.faturamentoTotal >= 2000) {
                    statusDecisao = 'manter';
                    statusLabel = 'PILAR ESTRATÉGICO';
                    motivo = `Pilar central de receita (${share.toFixed(1)}% do faturamento da loja). Manter catálogo aquecido.`;
                } else if (share < 3 && item.unidadesVendidas <= 1) {
                    statusDecisao = 'descartar';
                    statusLabel = 'BAIXO INTERESSE';
                    motivo = `Baixa representatividade financeira (<3% da receita).`;
                }

                return {
                    ...item,
                    ticketMedio: ticket,
                    shareReceita: share,
                    statusDecisao,
                    statusLabel,
                    motivo
                };
            }).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);

        // FIGURAS QUE EFETIVAMENTE VENDERAM NO PERÍODO SOLICITADO
        const figurasVendidas = Object.values(aggFiguras)
            .filter(f => f.unidadesVendidas > 0)
            .sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);

        // 7. Sumário Executivo
        const seriesTopSellers = seriesResult.filter(s => s.statusDecisao === 'manter').length;
        const seriesObservar = seriesResult.filter(s => s.statusDecisao === 'observar').length;

        const studiosManter = studiosResult.filter(st => st.statusDecisao === 'manter').length;
        const studiosObservar = studiosResult.filter(st => st.statusDecisao === 'observar').length;
        const studiosDescartar = studiosResult.filter(st => st.statusDecisao === 'descartar').length;

        const summary = {
            periodLabel,
            range,
            selectedYear,
            selectedMonth,
            filterStartDate: filterStartDate?.toISOString() || null,
            filterEndDate: filterEndDate?.toISOString() || null,
            totalFaturamento: totalFaturamentoGeral,
            totalLucro: totalLucroGeral,
            totalUnidades: totalUnidadesGeral,
            ticketMedio: totalUnidadesGeral > 0 ? (totalFaturamentoGeral / totalUnidadesGeral) : 0,
            margemMediaPct: totalFaturamentoGeral > 0 ? ((totalLucroGeral / totalFaturamentoGeral) * 100) : 0,
            topStudio: studiosResult[0] || null,
            topSerie: seriesResult[0] || null,
            topCategoria: categoriasResult[0] || null,
            totalFigurasVendidas: figurasVendidas.length,
            totalFigurasCatalogo: allFigures.length,
            contadores: {
                series: { total: seriesResult.length, topSellers: seriesTopSellers, observar: seriesObservar },
                studios: { total: studiosResult.length, manter: studiosManter, observar: studiosObservar, descartar: studiosDescartar }
            }
        };

        return NextResponse.json({
            summary,
            series: seriesResult,
            studios: studiosResult,
            categorias: categoriasResult,
            figurasVendidas,
            topFiguras: figurasVendidas
        });

    } catch (error: any) {
        console.error('Erro na API de KPIs de Vendas:', error);
        return NextResponse.json({ error: error.message || 'Erro ao processar métricas de vendas' }, { status: 500 });
    }
}
