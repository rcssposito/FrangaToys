import { supabaseAdmin as supabase } from '@/lib/supabase';
import { InterceptedModal } from './InterceptedModal';
import { notFound } from 'next/navigation';
import { calculateFigurePrices } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function FigureModalPage({ params }: Props) {
    const { id: identifier } = await params;
    const isNumeric = /^\d+$/.test(identifier);

    // Fetch figure and pricing params in parallel
    let figureQuery = supabase
        .from('figuras')
        .select(`
            *,
            series ( 
                nome,
                categorias ( nome )
            ),
            figuras_meta ( * ),
            studios ( nome, merchant )
        `);

    if (isNumeric) {
        figureQuery = figureQuery.eq('id', parseInt(identifier));
    } else {
        figureQuery = figureQuery.eq('slug', identifier);
    }

    const [figureRes, settingsRes] = await Promise.all([
        figureQuery.single(),
        supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single()
    ]);

    const { data: figure, error } = figureRes;
    const { data: settings } = settingsRes;

    if (error || !figure) {
        notFound();
    }

    let crossSellFigure = null;
    if (figure.serie_id) {
        const { data: crossSellData } = await supabase
            .from('figuras')
            .select(`
                id, nome, imagem_url, slug, disponivel,
                figuras_meta ( is_campanha_active, preco_fixo_campanha )
            `)
            .eq('serie_id', figure.serie_id)
            .neq('id', figure.id)
            .eq('disponivel', true)
            .limit(20);
            
        if (crossSellData && crossSellData.length > 0) {
            const randomIndex = Math.floor(Math.random() * crossSellData.length);
            const selectedCrossSell = crossSellData[randomIndex];
            const csMeta = Array.isArray(selectedCrossSell.figuras_meta) ? selectedCrossSell.figuras_meta[0] : selectedCrossSell.figuras_meta;
            crossSellFigure = {
                id: selectedCrossSell.id,
                nome: selectedCrossSell.nome,
                imagem_url: selectedCrossSell.imagem_url,
                slug: selectedCrossSell.slug || selectedCrossSell.id.toString(),
                is_campanha: csMeta?.is_campanha_active || !!csMeta?.preco_fixo_campanha
            };
        }
    }

    // Dynamic price calculation
    const metaData = Array.isArray(figure.figuras_meta) ? figure.figuras_meta[0] : figure.figuras_meta;
    const prices = settings && metaData ? calculateFigurePrices(metaData, settings) : undefined;
    
    const seriesData = Array.isArray(figure.series) ? figure.series[0] : (figure.series as any);
    const studioData = Array.isArray((figure as any).studios) ? (figure as any).studios[0] : (figure as any).studios;

    const figureDto = {
        id: figure.id,
        nome: figure.nome,
        imagem_url: figure.imagem_url,
        disponivel: figure.disponivel,
        serie: seriesData?.nome,
        serie_id: figure.serie_id,
        categoria: seriesData?.categorias?.nome || (seriesData as any)?.categorias?.[0]?.nome,
        studio: studioData?.nome,
        altura_cm: metaData?.altura_cm,
        largura_cm: metaData?.largura_cm,
        profundidade_cm: metaData?.profundidade_cm,
        codigo: figure.codigo,
        precos: prices ? {
            estilizado: prices.estilizado,
            colorido: prices.colorido,
            premium: prices.premium,
            pix_estilizado: prices.pix_estilizado,
            pix_colorido: prices.pix_colorido,
            pix_premium: prices.pix_premium,
            is_campanha: metaData?.is_campanha_active || !!metaData?.preco_fixo_campanha || !!metaData?.desconto_campanha
        } : undefined,
        is_campanha: metaData?.is_campanha_active || !!metaData?.preco_fixo_campanha || !!metaData?.desconto_campanha,
        is_campanha_active: metaData?.is_campanha_active,
        desconto_campanha: metaData?.desconto_campanha,
        preco_fixo_campanha: metaData?.preco_fixo_campanha,
        tem_pintura_real: figure.tem_pintura_real,
        is_merchant: studioData?.merchant ?? false
    };

    return <InterceptedModal figure={figureDto as any} crossSell={crossSellFigure} />;
}
