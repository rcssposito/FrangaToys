import { Metadata } from 'next';
import { cache } from 'react';
export const dynamic = 'force-dynamic';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { FigureDetails } from '@/components/Gallery/FigureDetails';
import { notFound } from 'next/navigation';
import { calculateFigurePrices } from '@/lib/pricing';
import { BackNavigationButton } from '@/components/ui/BackNavigationButton';

interface Props {
    params: Promise<{ id: string }>;
}

/**
 * Deduplica a consulta de figura + parâmetros de preço entre generateMetadata e FiguraPage
 * dentro do mesmo ciclo de renderização do React Server Component.
 */
const getFigureWithPricing = cache(async (identifier: string) => {
    const isNumeric = /^\d+$/.test(identifier);

    let figureQuery = supabase
        .from('figuras')
        .select(`
            *,
            series ( 
                nome,
                categorias ( id, nome )
            ),
            figuras_meta ( * ),
            studios ( nome, merchant, ativo )
        `);

    if (isNumeric) {
        figureQuery = figureQuery.eq('id', parseInt(identifier, 10));
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

    return {
        figure: figureRes.data,
        error: figureRes.error,
        settings: settingsRes.data,
    };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: identifier } = await params;
    const { figure, settings } = await getFigureWithPricing(identifier);

    if (!figure) return { title: 'Figura não encontrada | Franga Toys' };

    const series = Array.isArray(figure.series) ? figure.series[0] : (figure.series as any);
    const metaData = Array.isArray(figure.figuras_meta) ? figure.figuras_meta[0] : figure.figuras_meta;
    const metaWithBundle = metaData ? {
        ...metaData,
        is_bundle: figure.is_bundle,
        desconto_bundle_pct: figure.desconto_bundle_pct,
        preco_fixo_bundle: figure.preco_fixo_bundle,
    } : null;
    const prices = settings && metaWithBundle ? calculateFigurePrices(metaWithBundle, settings) : undefined;
    const minPixPrice = prices?.pix_estilizado || prices?.pix_colorido || 0;

    const title = `${figure.nome} | Franga Toys`;
    const priceSnippet = minPixPrice > 0 ? ` A partir de R$ ${minPixPrice} no PIX.` : '';
    const description = `Confira ${figure.nome}${series?.nome ? ` da série ${series.nome}` : ''}.${priceSnippet} Colecionáveis em resina 3D de alta definição na Franga Toys!`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: figure.imagem_url ? [{ url: figure.imagem_url }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: figure.imagem_url ? [figure.imagem_url] : [],
        },
    };
}

export default async function FiguraPage({ params }: Props) {
    const { id: identifier } = await params;
    const { figure, error, settings } = await getFigureWithPricing(identifier);

    if (error && error.code !== 'PGRST116') {
        console.error("Database Error:", error);
    }

    if (!figure) {
        notFound();
    }

    let crossSellFigure = null;
    if (figure.serie_id) {
        const { data: crossSellData } = await supabase
            .from('figuras')
            .select(`
                id, nome, imagem_url, slug, disponivel,
                figuras_meta ( is_campanha_active, preco_fixo_campanha, desconto_campanha )
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
                is_campanha: Boolean(csMeta?.is_campanha_active || csMeta?.preco_fixo_campanha || csMeta?.desconto_campanha)
            };
        }
    }

    const seriesData = Array.isArray(figure.series) ? figure.series[0] : (figure.series as any);
    const studioData = Array.isArray((figure as any).studios) ? (figure as any).studios[0] : (figure as any).studios;
    const catObj = Array.isArray(seriesData?.categorias) ? seriesData.categorias[0] : seriesData?.categorias;
    const categoriaNome = catObj?.nome || 'Outros';

    const metaData = Array.isArray(figure.figuras_meta) ? figure.figuras_meta[0] : figure.figuras_meta;
    const metaWithBundle = metaData ? {
        ...metaData,
        is_bundle: figure.is_bundle,
        desconto_bundle_pct: figure.desconto_bundle_pct,
        preco_fixo_bundle: figure.preco_fixo_bundle,
    } : null;
    const prices = settings && metaWithBundle ? calculateFigurePrices(metaWithBundle, settings) : undefined;

    const figureDto = {
        id: figure.id,
        nome: figure.nome,
        imagem_url: figure.imagem_url,
        disponivel: figure.disponivel,
        serie: seriesData?.nome,
        serie_id: figure.serie_id,
        categoria: categoriaNome,
        studio: studioData?.nome,
        altura_cm: metaData?.altura_cm,
        largura_cm: metaData?.largura_cm,
        profundidade_cm: metaData?.profundidade_cm,
        codigo: figure.codigo,
        is_bundle: figure.is_bundle || false,
        desconto_bundle_pct: figure.desconto_bundle_pct || null,
        precos: prices ? {
            estilizado: prices.estilizado,
            colorido: prices.colorido,
            premium: prices.premium,
            pix_estilizado: prices.pix_estilizado,
            pix_colorido: prices.pix_colorido,
            pix_premium: prices.pix_premium,
            original_estilizado: prices.original_estilizado,
            original_colorido: prices.original_colorido,
            original_pix_estilizado: prices.original_pix_estilizado,
            original_pix_colorido: prices.original_pix_colorido,
            desconto_bundle_pct: prices.desconto_bundle_pct,
            is_campanha: metaData?.is_campanha_active || !!metaData?.preco_fixo_campanha || !!metaData?.desconto_campanha
        } : undefined,
        is_campanha: metaData?.is_campanha_active || !!metaData?.preco_fixo_campanha || !!metaData?.desconto_campanha,
        is_campanha_active: metaData?.is_campanha_active,
        desconto_campanha: metaData?.desconto_campanha,
        preco_fixo_campanha: metaData?.preco_fixo_campanha,
        tem_pintura_real: figure.tem_pintura_real,
        pronta_entrega: figure.pronta_entrega || false,
        estoque_pronta_entrega: Number(figure.estoque_pronta_entrega) || 0,
        imagem_secundaria: figure.imagem_secundaria || null,
        fotos_extras: Array.isArray(figure.fotos_extras) ? figure.fotos_extras : [],
        is_merchant: Boolean(studioData?.merchant && studioData?.ativo !== false)
    };

    const jsonLdPrice = prices?.pix_colorido || prices?.pix_estilizado || prices?.colorido || 0;
    const productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: figureDto.nome,
        image: [
            figureDto.imagem_url,
            ...(figureDto.imagem_secundaria ? [figureDto.imagem_secundaria] : []),
            ...figureDto.fotos_extras,
        ].filter(Boolean),
        description: `Action Figure 3D em resina ${figureDto.nome}${figureDto.serie ? ` (${figureDto.serie})` : ''}.`,
        sku: figureDto.codigo || String(figureDto.id),
        brand: {
            '@type': 'Brand',
            name: figureDto.studio || 'Franga Toys',
        },
        category: figureDto.categoria || 'Action Figures',
        offers: jsonLdPrice > 0 ? {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: jsonLdPrice,
            availability: figureDto.disponivel && figureDto.is_merchant
                ? (figureDto.pronta_entrega ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder')
                : 'https://schema.org/OutOfStock',
        } : undefined,
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-28 sm:p-8">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
            />
            <div className="max-w-5xl mx-auto">
                {/* Back Navigation preserving previous page/filters */}
                <BackNavigationButton fallbackHref="/" label="Voltar para a Galeria" />

                <div className="bg-zinc-900/30 rounded-3xl p-4 sm:p-10 border border-white/5 relative overflow-hidden">
                    <FigureDetails key={figureDto.id} figure={figureDto as any} crossSell={crossSellFigure} />
                </div>
            </div>
        </div>
    );
}
