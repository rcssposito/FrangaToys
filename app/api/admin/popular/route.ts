import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { calculateFigurePrices } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'pricing', 'orcamento']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        // 1. Configurações de precificação
        const { data: settings } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        // 2. Buscar TODAS as figuras com views > 0 paginando em blocos de 1000
        const allFigures: any[] = [];
        const pageSize = 1000;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            const { data: batch, error } = await supabase
                .from('figuras')
                .select(`
                    id, 
                    nome, 
                    imagem_url, 
                    views, 
                    slug,
                    studio_id,
                    serie_id,
                    studios(id, nome), 
                    series(id, nome, categorias(nome)),
                    figuras_meta(resina_kg, horas_impressao, horas_pintura, is_campanha_active, desconto_campanha, preco_fixo_campanha)
                `)
                .gt('views', 0)
                .order('views', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (batch && batch.length > 0) {
                allFigures.push(...batch);
                if (batch.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        // 3. Buscar histórico de vendas válidas diretamente (evita URL 414 Too Long com .in() gigante)
        const { data: salesData } = await supabase
            .from('vendas')
            .select('figura_id, quantidade, valor_venda_final')
            .neq('status', 'Cancelado');

        const salesStats: Record<number, { units: number, revenue: number }> = {};
        (salesData || []).forEach(s => {
            if (!s.figura_id) return;
            if (!salesStats[s.figura_id]) salesStats[s.figura_id] = { units: 0, revenue: 0 };
            salesStats[s.figura_id].units += s.quantidade || 0;
            salesStats[s.figura_id].revenue += Number(s.valor_venda_final) || 0;
        });

        // 4. Agregar métricas de Séries e Estúdios
        const seriesMap: Record<number, { id: number; nome: string; totalViews: number; figureCount: number; vendas: number }> = {};
        const studioMap: Record<number, { id: number; nome: string; totalViews: number; figureCount: number; vendas: number }> = {};

        let totalViewsGeral = 0;
        let demandaReprimidaCount = 0;

        const enrichedFigures = allFigures.map((fig: any) => {
            const views = Number(fig.views) || 0;
            totalViewsGeral += views;

            const vendas = salesStats[fig.id]?.units || 0;
            const faturamento = salesStats[fig.id]?.revenue || 0;
            const conversaoPct = views > 0 ? Number(((vendas / views) * 100).toFixed(1)) : 0;

            // Classificação de oportunidade
            let oportunidade: 'demanda_reprimida' | 'alta_conversao' | 'em_observacao' = 'em_observacao';
            if (views >= 10 && vendas === 0) {
                oportunidade = 'demanda_reprimida';
                demandaReprimidaCount++;
            } else if (vendas >= 2 && conversaoPct >= 2.0) {
                oportunidade = 'alta_conversao';
            }

            // Preço base estimado
            let precoBase = 0;
            if (settings && fig.figuras_meta) {
                const metaData = Array.isArray(fig.figuras_meta) ? fig.figuras_meta[0] : fig.figuras_meta;
                if (metaData) {
                    const prices = calculateFigurePrices(metaData, settings);
                    precoBase = prices.pix_colorido || prices.pix_estilizado || 0;
                }
            }

            // Agregação por Série
            const seriesObj = Array.isArray(fig.series) ? fig.series[0] : fig.series;
            if (seriesObj?.id) {
                if (!seriesMap[seriesObj.id]) {
                    seriesMap[seriesObj.id] = { id: seriesObj.id, nome: seriesObj.nome, totalViews: 0, figureCount: 0, vendas: 0 };
                }
                seriesMap[seriesObj.id].totalViews += views;
                seriesMap[seriesObj.id].figureCount += 1;
                seriesMap[seriesObj.id].vendas += vendas;
            }

            // Agregação por Estúdio
            const studioObj = Array.isArray(fig.studios) ? fig.studios[0] : fig.studios;
            if (studioObj?.id) {
                if (!studioMap[studioObj.id]) {
                    studioMap[studioObj.id] = { id: studioObj.id, nome: studioObj.nome, totalViews: 0, figureCount: 0, vendas: 0 };
                }
                studioMap[studioObj.id].totalViews += views;
                studioMap[studioObj.id].figureCount += 1;
                studioMap[studioObj.id].vendas += vendas;
            }

            return {
                id: fig.id,
                nome: fig.nome,
                imagem_url: fig.imagem_url,
                views,
                vendas,
                faturamento,
                conversaoPct,
                oportunidade,
                precoBase,
                serieId: seriesObj?.id || null,
                serieNome: seriesObj?.nome || 'Sem Série',
                studioId: studioObj?.id || null,
                studioNome: studioObj?.nome || 'Sem Estúdio',
                categoriaNome: seriesObj?.categorias?.nome || 'Outros'
            };
        });

        const topSeries = Object.values(seriesMap)
            .sort((a, b) => b.totalViews - a.totalViews)
            .slice(0, 15);

        const topStudios = Object.values(studioMap)
            .sort((a, b) => b.totalViews - a.totalViews)
            .slice(0, 15);

        return NextResponse.json({
            summary: {
                totalViews: totalViewsGeral,
                trackedFiguresCount: enrichedFigures.length,
                demandaReprimidaCount,
                topFigure: enrichedFigures[0] || null
            },
            figures: enrichedFigures,
            topSeries,
            topStudios
        });
    } catch (err: any) {
        console.error('Erro na API Popular:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
