'use client';

import { useState } from 'react';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import { clsx } from 'clsx';
import { ExternalLink, Share2, Paintbrush, Palette, Crown, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface FigureDetailsProps {
    figure: FiguraDTO;
}

export function FigureDetails({ figure }: FigureDetailsProps) {
    const { addToCart, removeFromCart, isInCart } = useCart();
    const [selectedFinish, setSelectedFinish] = useState<'estilizado' | 'colorido' | 'premium'>('estilizado');

    const formatPrice = (val?: number) => {
        if (!val) return 'Sob consulta';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

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

    const finishOptions = [
        { id: 'estilizado', label: 'Estilizado', icon: Paintbrush, description: 'Base/Sombra', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', price: figure.precos?.estilizado },
        { id: 'colorido', label: 'Colorido', icon: Palette, description: 'Standard/Full', color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20', price: figure.precos?.colorido },
        { id: 'premium', label: 'Premium', icon: Crown, description: 'Premium/Manual', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', price: figure.precos?.premium },
    ] as const;

    return (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex flex-col lg:flex-row w-full gap-8 items-start lg:items-center">
                
                {/* Main Image Container */}
                <div className="relative w-full lg:w-1/2 aspect-square flex items-center justify-center p-4 bg-zinc-900/20 rounded-3xl overflow-hidden shadow-inner order-1">
                    <Image
                        loader={imageKitLoader}
                        src={getOptimizedImageUrl(figure.imagem_url)}
                        alt={figure.nome}
                        width={1200}
                        height={1200}
                        quality={90}
                        className="object-contain max-h-full max-w-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 hover:scale-105"
                        priority
                    />
                </div>

                {/* Info & Pricing Panel */}
                <div className="w-full lg:w-1/2 flex flex-col gap-6 order-2">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <h3 className="text-sm font-black text-blue-500 uppercase tracking-[0.3em]">{figure.studio || 'Studio Indiferente'}</h3>
                             {figure.codigo && (
                                <span className="text-[10px] bg-zinc-800 text-zinc-500 font-black px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">
                                    #{figure.codigo}
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-[0.9]">{figure.nome}</h2>
                        
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">
                             <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
                                <span className="text-zinc-600">H</span> {figure.altura_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                             </div>
                             <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
                                <span className="text-zinc-600">W</span> {figure.largura_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                             </div>
                             <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
                                <span className="text-zinc-600">D</span> {figure.profundidade_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                             </div>
                        </div>
                    </div>

                    {/* Finish Selector */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-1">Escolha seu acabamento</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {finishOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedFinish(opt.id)}
                                    className={clsx(
                                        "relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 text-left group",
                                        selectedFinish === opt.id 
                                            ? `${opt.border} bg-zinc-900/80 ring-1 ring-white/10` 
                                            : "border-transparent bg-zinc-900/40 opacity-60 hover:opacity-100 hover:bg-zinc-900/60"
                                    )}
                                >
                                    <div className={clsx("mb-4 w-10 h-10 rounded-xl flex items-center justify-center", opt.bg, opt.color)}>
                                        <opt.icon size={20} />
                                    </div>
                                    <span className={clsx("text-xs font-black uppercase tracking-widest block mb-1", selectedFinish === opt.id ? "text-white" : "text-zinc-400")}>{opt.label}</span>
                                    <span className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter mb-3">{opt.description}</span>
                                    <span className={clsx("text-sm font-black mt-auto", selectedFinish === opt.id ? opt.color : "text-zinc-500")}>{formatPrice(opt.price)}</span>
                                    
                                    {selectedFinish === opt.id && (
                                        <div className="absolute top-3 right-3 text-white">
                                            <CheckCircle2 size={16} className="fill-blue-500 text-black border-none" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                        <button
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-3 w-full px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.3)] active:scale-[0.98]",
                                isInCart(figure.id)
                                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                                    : "bg-white text-black hover:bg-blue-500 hover:text-white"
                            )}
                            onClick={() => isInCart(figure.id) ? removeFromCart(figure.id) : addToCart(figure, selectedFinish)}
                        >
                            {isInCart(figure.id) ? "No Orçamento ✓" : (
                                <>
                                    <ExternalLink size={18} />
                                    Adicionar ao Orçamento
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleShare}
                            className="p-5 bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white rounded-2xl transition-all duration-300 group"
                            title="Compartilhar"
                        >
                            <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
