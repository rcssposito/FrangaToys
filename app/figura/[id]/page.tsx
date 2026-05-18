import { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { FigureDetails } from '@/components/Gallery/FigureDetails';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { calculateFigurePrices } from '@/lib/pricing';

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: identifier } = await params;
    const isNumeric = /^\d+$/.test(identifier);

    let query = supabase
        .from('figuras')
        .select(`
            nome,
            imagem_url,
            series ( nome )
        `);
    
    if (isNumeric) {
        query = query.eq('id', parseInt(identifier));
    } else {
        query = query.eq('slug', identifier);
    }

    const { data: figure } = await query.single();

    if (!figure) return { title: 'Figura não encontrada' };

    // Supabase joins can return an array even for 1-to-1 if not specified
    const series = Array.isArray(figure.series) ? figure.series[0] : (figure.series as any);
    const title = `${figure.nome} | Franga Toys`;
    const description = `Confira os detalhes de ${figure.nome} ${series?.nome ? `da série ${series.nome}` : ''}. Compre figuras 3D exclusivas!`;
    
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: figure.imagem_url ? [{ url: figure.imagem_url }] : [],
        },
    };
}

export default async function FiguraPage({ params }: Props) {
    const { id: identifier } = await params;
    const isNumeric = /^\d+$/.test(identifier);

    // Fetch figure and pricing params
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

    if (error && error.code !== 'PGRST116') {
        // Log or handle database error (PGRST116 is "not found")
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
            // Redundância absoluta para garantir que o client veja a campanha
            is_campanha: metaData?.is_campanha_active || !!metaData?.preco_fixo_campanha || !!metaData?.desconto_campanha
        } : undefined,
        is_campanha: metaData?.is_campanha_active || !!metaData?.preco_fixo_campanha || !!metaData?.desconto_campanha,
        is_campanha_active: metaData?.is_campanha_active,
        desconto_campanha: metaData?.desconto_campanha,
        preco_fixo_campanha: metaData?.preco_fixo_campanha,
        tem_pintura_real: figure.tem_pintura_real,
        is_merchant: studioData?.merchant ?? false
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 group text-sm font-black uppercase tracking-widest"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Voltar para a Galeria
                </Link>

                <div className="bg-zinc-900/30 rounded-3xl p-4 sm:p-10 border border-white/5 relative overflow-hidden">
                    <FigureDetails key={figureDto.id} figure={figureDto as any} crossSell={crossSellFigure} />
                </div>
            </div>
        </div>
    );
}
