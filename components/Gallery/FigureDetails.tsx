'use client';

import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import { clsx } from 'clsx';
import { ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface FigureDetailsProps {
    figure: FiguraDTO;
}

export function FigureDetails({ figure }: FigureDetailsProps) {
    const { addToCart, removeFromCart, isInCart } = useCart();

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/figura/${figure.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: figure.nome,
                    text: `Confira essa figura na Franga Toys: ${figure.nome}`,
                    url: shareUrl,
                });
            } catch (err) {
                // Silently fail if user cancels share
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copiado para a área de transferência!');
            } catch (err) {
                toast.error('Erro ao copiar link');
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto">
            {/* Main Image */}
            <div className="relative w-full h-full max-h-[75vh] flex items-center justify-center">
                <Image
                    loader={imageKitLoader}
                    src={getOptimizedImageUrl(figure.imagem_url)}
                    alt={figure.nome}
                    width={1200}
                    height={1200}
                    quality={90}
                    className="object-contain max-h-full max-w-full drop-shadow-2xl rounded-md"
                    priority
                />
            </div>

            {/* Details Footer/Panel */}
            <div className="mt-4 w-full max-w-2xl bg-zinc-900/90 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                        <h2 className="text-xl font-bold text-white mb-1">{figure.nome}</h2>
                        <div className="text-sm text-zinc-400 flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
                            <span>{figure.altura_cm ? `Alt: ${figure.altura_cm}cm` : ''}</span>
                            <span>{figure.largura_cm ? `Lrg: ${figure.largura_cm}cm` : ''}</span>
                            <span>{figure.profundidade_cm ? `Prof: ${figure.profundidade_cm}cm` : ''}</span>
                            {figure.studio && <span className="text-orange-400">{figure.studio}</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-white/5 transition-colors group"
                            title="Compartilhar"
                        >
                            <Share2 size={20} className="group-hover:scale-110 transition-transform" />
                        </button>

                        <button
                            className={clsx(
                                "flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-medium transition-transform active:scale-95 whitespace-nowrap",
                                isInCart(figure.id)
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-orange-600 hover:bg-orange-700"
                            )}
                            onClick={() => isInCart(figure.id) ? removeFromCart(figure.id) : addToCart(figure)}
                        >
                            <ExternalLink size={18} />
                            {isInCart(figure.id) ? "Adicionado ✓" : "Adicionar ao Orçamento"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
