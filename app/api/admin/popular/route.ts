import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { calculateFigurePrices } from '@/lib/pricing';

export async function GET() {
    try {
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
                slug, 
                imagem_url, 
                views, 
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
                    const basePrice = prices.estilizado || 0;
                    
                    if (basePrice < 100) priceBuckets['Abaixo de R$ 100'] += views;
                    else if (basePrice <= 200) priceBuckets['R$ 100 - R$ 200'] += views;
                    else if (basePrice <= 300) priceBuckets['R$ 200 - R$ 300'] += views;
                    else if (basePrice <= 500) priceBuckets['R$ 300 - R$ 500'] += views;
                    else priceBuckets['Acima de R$ 500'] += views;
                }
            }
        });

        const getTop = (record: Record<string, number>) => {
            return Object.entries(record).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
        };

        const insights = {
            topStudio: { name: getTop(studioViews)[0], views: getTop(studioViews)[1] },
            topSeries: { name: getTop(seriesViews)[0], views: getTop(seriesViews)[1] },
            topCategory: { name: getTop(categoryViews)[0], views: getTop(categoryViews)[1] },
            topPriceRange: { name: getTop(priceBuckets)[0], views: getTop(priceBuckets)[1] }
        };

        const top10 = (allFigures || []).slice(0, 10);

        return NextResponse.json({
            figures: top10,
            insights
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
