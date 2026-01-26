
import { Metadata } from 'next';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { FigureDetails } from '@/components/Gallery/FigureDetails';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
    params: Promise<{ id: string }>;
}

// 1. Gerar Metadata Dinâmico para WhatsApp/SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    const { data } = await supabase
        .from('figuras')
        .select(`
            nome,
            imagem_url,
            series ( nome )
        `)
        .eq('id', id)
        .single();

    const figure = data as any;
    if (!figure) return { title: 'Figura não encontrada' };

    const title = `${figure.nome} | Franga Toys`;
    const description = `Confira os detalhes de ${figure.nome} ${figure.series?.nome ? `da série ${figure.series.nome}` : ''}. Faça seu orçamento de figuras 3D!`;

    // URL direta do ImageKit (Custo Zero no Vercel)
    const imageUrl = figure.imagem_url;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: imageUrl ? [{ url: imageUrl, width: 1200, height: 1200 }] : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: imageUrl ? [imageUrl] : [],
        },
    };
}

// 2. Componente da Página (Server Side)
export default async function FiguraPage({ params }: Props) {
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
        console.error("Figure fetch error:", error, "ID:", id);
        notFound();
    }

    // Adaptar dados para o DTO esperado pelo FigureDetails
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

    // JSON-LD Structured Data (Product)
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: figure.nome,
        image: figure.imagem_url ? [figure.imagem_url] : [],
        description: `Figura ${figure.nome} da série ${figure.series?.nome}. Produzida em resina 4k.`,
        brand: {
            '@type': 'Brand',
            name: 'Franga Toys',
        },
        offers: {
            '@type': 'Offer',
            url: `https://frangatoys.com.br/figura/${figure.id}`,
            priceCurrency: 'BRL',
            availability: 'https://schema.org/PreOrder', // Most are made to order? Or InStock?
        },
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

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
