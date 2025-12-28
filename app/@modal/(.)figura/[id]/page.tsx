
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { InterceptedModal } from './InterceptedModal';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function FigureModalPage({ params }: Props) {
    const { id } = await params;

    const { data: figure, error } = await supabase
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
        .single();

    if (error || !figure) {
        notFound();
    }

    const figureDto = {
        id: figure.id,
        nome: figure.nome,
        imagem_url: figure.imagem_url,
        disponivel: figure.disponivel,
        serie: figure.series?.nome,
        categoria: (figure.series as any)?.categorias?.nome,
        studio: (figure as any).studios?.nome,
        altura_cm: figure.figuras_meta?.altura_cm,
        largura_cm: figure.figuras_meta?.largura_cm,
        profundidade_cm: figure.figuras_meta?.profundidade_cm,
    };

    return <InterceptedModal figure={figureDto as any} />;
}
