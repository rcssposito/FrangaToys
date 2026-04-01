import { supabaseAdmin as supabase } from '@/lib/supabase';
import { InterceptedModal } from './InterceptedModal';
import { notFound } from 'next/navigation';
import { calculateFigurePrices } from '@/lib/pricing';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function FigureModalPage({ params }: Props) {
    const { id } = await params;

    // Fetch figure and pricing params in parallel
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

    if (error || !figure) {
        notFound();
    }

    // Dynamic price calculation
    const metaData = Array.isArray(figure.figuras_meta) ? figure.figuras_meta[0] : figure.figuras_meta;
    const prices = settings && metaData ? calculateFigurePrices(metaData, settings) : undefined;

    const figureDto = {
        id: figure.id,
        nome: figure.nome,
        imagem_url: figure.imagem_url,
        disponivel: figure.disponivel,
        serie: figure.series?.nome,
        categoria: (figure.series as any)?.categorias?.nome,
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

    return <InterceptedModal figure={figureDto as any} />;
}
