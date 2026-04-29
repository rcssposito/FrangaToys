import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { FigureDetails } from '@/components/Gallery/FigureDetails';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { calculateFigurePrices } from '@/lib/pricing';

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const { data: figure } = await supabase
        .from('figuras')
        .select(`
            nome,
            imagem_url,
            series ( nome )
        `)
        .eq('id', id)
        .single();

    if (!figure) return { title: 'Figura não encontrada' };

    // Supabase joins can return an array even for 1-to-1 if not specified
    const series = Array.isArray(figure.series) ? figure.series[0] : (figure.series as any);
    const title = `${figure.nome} | Franga Toys`;
    const description = `Confira os detalhes de ${figure.nome} ${series?.nome ? `da série ${series.nome}` : ''}. Faça seu orçamento de figuras 3D!`;
    
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
    const { id } = await params;

    // Fetch figure and pricing params
    const [figureRes, settingsRes] = await Promise.all([
        supabase
            .from('figuras')
            .select(`
                *,
                series ( 
                    nome,
                    categorias ( nome )
                ),
                figuras_meta ( * ),
                studios ( nome )
            `)
            .eq('id', id)
            .single(),
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

    // Increment view counter (Fire and forget on server side)
    supabase
        .from('figuras')
        .update({ views: (figure.views || 0) + 1 })
        .eq('id', id)
        .then();

    const metaData = Array.isArray(figure.figuras_meta) ? figure.figuras_meta[0] : figure.figuras_meta;
    const prices = settings && metaData ? calculateFigurePrices(metaData, settings) : undefined;

    const seriesData = Array.isArray(figure.series) ? figure.series[0] : (figure.series as any);

    const figureDto = {
        id: figure.id,
        nome: figure.nome,
        imagem_url: figure.imagem_url,
        disponivel: figure.disponivel,
        serie: seriesData?.nome,
        categoria: seriesData?.categorias?.nome || (seriesData as any)?.categorias?.[0]?.nome,
        studio: (figure as any).studios?.nome,
        altura_cm: metaData?.altura_cm,
        largura_cm: metaData?.largura_cm,
        profundidade_cm: metaData?.profundidade_cm,
        codigo: figure.codigo,
        precos: prices ? {
            estilizado: prices.estilizado,
            colorido: prices.colorido,
            premium: prices.premium
        } : undefined
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Voltar para a Galeria
                </Link>

                <div className="bg-zinc-900/30 rounded-3xl p-4 sm:p-12 border border-white/5">
                    <FigureDetails figure={figureDto as any} />
                </div>
            </div>
        </div>
    );
}
