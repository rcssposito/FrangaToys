import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { calculateFigurePrices } from '@/lib/pricing';

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

        // 2. Buscar figuras com views > 0
        const { data: allFigures, error } = await supabase
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
                figuras_meta(resina_kg, horas_impressao, horas_pintura)
            `)
            .gt('views', 0)
            .order('views', { ascending: false });

        if (error) throw error;

        // 3. Buscar histórico de vendas dessas figuras
        const figureIds = (allFigures || []).map(f => f.id);
        const { data: salesData } = await supabase
            .from('vendas')
            .select('figura_id, quantidade, valor_venda_final')
            .in('figura_id', figureIds);

        const salesStats: Record<number, { units: number, revenue: number }> = {};
        (salesData || []).forEach(s => {
            if (!salesStats[s.figura_id]) salesStats[s.figura_id] = { units: 0, revenue: 0 };
            salesStats[s.figura_id].units += s.quantidade || 0;
            salesStats[s.figura_id].revenue += Number(s.valor_venda_final) || 0;
        });

        // 4. Agregar métricas de Séries e Estúdios
        const seriesMap: Record<number, { id: number; nome: string; totalViews: number; figureCount: number; vendas: number }> = {};
        const studioMap: Record<number, { id: number; nome: string; totalViews: number; figureCount: number; vendas: number }> = {};

        let totalViewsGeral = 0;
        let demandaReprimidaCount = 0;

        const enrichedFigures = (allFigures || []).map((fig: any) => {
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
                studioNome: studioObj?.nome || 'Desconhecido'
            };
        });

        // Top Séries ordenadas por views
        const topSeries = Object.values(seriesMap).sort((a, b) => b.totalViews - a.totalViews).slice(0, 10);
        // Top Estúdios ordenados por views
        const topStudios = Object.values(studioMap).sort((a, b) => b.totalViews - a.totalViews).slice(0, 10);

        return NextResponse.json({
            figures: enrichedFigures.slice(0, 40),
            topSeries,
            topStudios,
            summary: {
                totalAcessos: totalViewsGeral,
                totalFigurasComViews: enrichedFigures.length,
                demandaReprimidaCount,
                topSerie: topSeries[0] || null,
                topStudio: topStudios[0] || null
            }
        });
    } catch (error: any) {
        console.error('Erro ao buscar dados de demanda e popularidade:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
