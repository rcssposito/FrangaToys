import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { calculateFigurePrices } from '@/lib/pricing';

export async function GET() {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'pricing', 'orcamento']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        // 1. Fetch settings for pricing calculation
        const { data: settings } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        // 2. Fetch all figures that have views > 0
        const { data: allFigures, error } = await supabase
            .from('figuras')
            .select(`
                id, 
                nome, 
                imagem_url, 
                views, 
                slug,
                studios(nome), 
                series(nome, categorias(nome)),
                figuras_meta(resina_kg, horas_impressao, horas_pintura)
            `)
            .gt('views', 0)
            .order('views', { ascending: false });

        if (error) throw error;

        // Process insights
        const studioViews: Record<string, number> = {};
        const seriesViews: Record<string, number> = {};
        const categoryViews: Record<string, number> = {};
        const priceBuckets: Record<string, number> = {
            'Abaixo de R$ 100': 0,
            'R$ 100 - R$ 200': 0,
            'R$ 200 - R$ 300': 0,
            'R$ 300 - R$ 500': 0,
            'Acima de R$ 500': 0
        };

        (allFigures || []).forEach((fig: any) => {
            const views = fig.views || 0;
            if (views === 0) return;

            // Aggregate Studio
            const studioName = fig.studios?.nome || 'Desconhecido';
            studioViews[studioName] = (studioViews[studioName] || 0) + views;

            // Aggregate Series
            const seriesObj = Array.isArray(fig.series) ? fig.series[0] : fig.series;
            const seriesName = seriesObj?.nome;
            if (seriesName) {
                seriesViews[seriesName] = (seriesViews[seriesName] || 0) + views;
                
                // Aggregate Category
                const catObj = Array.isArray(seriesObj.categorias) ? seriesObj.categorias[0] : seriesObj.categorias;
                const categoryName = catObj?.nome;
                if (categoryName) {
                    categoryViews[categoryName] = (categoryViews[categoryName] || 0) + views;
                }
            }

            // Aggregate Price
            if (settings && fig.figuras_meta) {
                // Determine the base price (estilizado)
                const metaData = Array.isArray(fig.figuras_meta) ? fig.figuras_meta[0] : fig.figuras_meta;
                if (metaData) {
                    const prices = calculateFigurePrices(metaData, settings);
                    const basePrice = prices.colorido || 0;
                    
                    if (basePrice < 100) priceBuckets['Abaixo de R$ 100'] += views;
                    else if (basePrice <= 200) priceBuckets['R$ 100 - R$ 200'] += views;
                    else if (basePrice <= 300) priceBuckets['R$ 200 - R$ 300'] += views;
                    else if (basePrice <= 500) priceBuckets['R$ 300 - R$ 500'] += views;
                    else priceBuckets['Acima de R$ 500'] += views;
                }
            }
        });

        // 3. Fetch sales for these figures to calculate performance
        const figureIds = allFigures.map(f => f.id);
        const { data: salesData } = await supabase
            .from('vendas')
            .select('figura_id, quantidade, valor_venda_final')
            .in('figura_id', figureIds);

        const salesStats: Record<number, { units: number, revenue: number }> = {};
        (salesData || []).forEach(s => {
            if (!salesStats[s.figura_id]) salesStats[s.figura_id] = { units: 0, revenue: 0 };
            salesStats[s.figura_id].units += s.quantidade || 0;
            salesStats[s.figura_id].revenue += s.valor_venda_final || 0;
        });

        const getTop = (record: Record<string, number>) => {
            return Object.entries(record).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
        };

        // 3. Fetch Analytics Data (Geo, Device, Source)
        const { data: analyticsData } = await supabase
            .from('figuras_analytics')
            .select('*')
            .order('created_at', { ascending: false });

        const deviceStats: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
        const platformStats: Record<string, number> = { site: 0, app: 0 };
        const sourceStats: Record<string, number> = {};
        const stateStats: Record<string, number> = {};
        const cityStats: Record<string, number> = {};

        (analyticsData || []).forEach(hit => {
            if (hit.estado === 'DEV') return; // Skip development activity
            if (hit.dispositivo) deviceStats[hit.dispositivo] = (deviceStats[hit.dispositivo] || 0) + 1;
            if (hit.plataforma) platformStats[hit.plataforma] = (platformStats[hit.plataforma] || 0) + 1;
            if (hit.origem) sourceStats[hit.origem] = (sourceStats[hit.origem] || 0) + 1;
            if (hit.estado) stateStats[hit.estado] = (stateStats[hit.estado] || 0) + 1;
            if (hit.cidade) cityStats[hit.cidade] = (cityStats[hit.cidade] || 0) + 1;
        });

        const insights = {
            topStudio: { name: getTop(studioViews)[0], views: getTop(studioViews)[1] },
            topSeries: { name: getTop(seriesViews)[0], views: getTop(seriesViews)[1] },
            topCategory: { name: getTop(categoryViews)[0], views: getTop(categoryViews)[1] },
            topPriceRange: { name: getTop(priceBuckets)[0], views: getTop(priceBuckets)[1] },
            analytics: {
                devices: Object.entries(deviceStats).map(([name, value]) => ({ name, value })),
                platforms: Object.entries(platformStats).map(([name, value]) => ({ name, value })),
                sources: Object.entries(sourceStats).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5),
                locations: Object.entries(stateStats).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5)
            }
        };

        const top10 = (allFigures || []).slice(0, 10).map(fig => ({
            ...fig,
            vendas: salesStats[fig.id]?.units || 0,
            faturamento: salesStats[fig.id]?.revenue || 0
        }));

        return NextResponse.json({
            figures: top10,
            insights
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
