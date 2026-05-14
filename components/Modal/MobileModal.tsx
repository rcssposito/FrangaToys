'use client';

import { useEffect, useState } from 'react';
import { FiguraDTO } from '@/lib/dto';
import { X, ChevronLeft, ChevronRight, Share, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

interface MobileModalProps {
    figure: FiguraDTO | null;
    isOpen: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    currentIndex: number;
    total: number;
}

export const MobileModal = ({ figure, isOpen, onClose, onNext, onPrev, currentIndex, total }: MobileModalProps) => {
    const { addToCart, removeFromCart, isInCart, setIsCartOpen } = useCart();
    const router = useRouter();

    const [quantity, setQuantity] = useState(1);
    const [finish, setFinish] = useState<'basic' | 'premium'>('basic');

    const handleSeeMoreStudio = (e: React.MouseEvent) => {
        e.preventDefault();
        if (figure?.studio_id) {
            router.push(`/?studioIds=${figure.studio_id}&incluirNaoVendaveis=true`);
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setQuantity(1);
            setFinish('basic');
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, figure?.id]);

    if (!isOpen || !figure) return null;

    const handleAddToCart = () => {
        addToCart({ ...figure, quantity, finish } as any);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col transition-all duration-300">

            {/* 1. Header Navigation */}
            <div className="flex items-center justify-between p-4 z-20 bg-gradient-to-b from-[var(--background)]/80 to-transparent">
                <button onClick={onClose} className="p-2 bg-[var(--card-bg)]/40 rounded-full text-[var(--foreground)] backdrop-blur border border-[var(--card-border)] shadow-lg active:scale-95 transition-transform">
                    <X size={20} />
                </button>
                <div className="px-3 py-1 rounded-full bg-[var(--card-bg)]/40 text-[10px] font-bold text-[var(--foreground)] backdrop-blur border border-[var(--card-border)] shadow-sm">
                    {currentIndex + 1} / {total}
                </div>
            </div>

            {/* 2. Fullscreen Image with Gestures (Simplified for now with buttons) */}
            <div className="flex-1 relative w-full h-full">
                <Image
                    loader={imageKitLoader}
                    src={getOptimizedImageUrl(figure.imagem_url)}
                    alt={figure.nome}
                    fill
                    className="object-contain"
                    sizes="100vw"
                    priority
                />

                {/* Overlay Navigation Zones */}
                <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={onPrev} />
                <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={onNext} />

                {/* Visual Chevrons for affordance */}
                <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 rounded-full text-white/50 pointer-events-none">
                    <ChevronLeft size={24} />
                </button>
                <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 rounded-full text-white/50 pointer-events-none">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* 3. Bottom Sheet Details */}
            <div className="bg-[var(--card-bg)] border-t border-[var(--card-border)] rounded-t-3xl pt-6 pb-6 px-5 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <h2 className="text-xl font-black text-[var(--foreground)] mb-3 leading-tight tracking-tight">{figure.nome}</h2>

                <div className="flex flex-col gap-6 mb-5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[var(--text-muted)] font-medium">
                        <div className="flex justify-between border-b border-[var(--card-border)]/50 pb-1">
                            <span>Altura</span> <span className="text-[var(--foreground)] font-bold">{figure.altura_cm || '-'} cm</span>
                        </div>
                        <div className="flex justify-between border-b border-[var(--card-border)]/50 pb-1">
                            <span>Largura</span> <span className="text-[var(--foreground)] font-bold">{figure.largura_cm || '-'} cm</span>
                        </div>
                        <div className="flex justify-between border-b border-[var(--card-border)]/50 pb-1">
                            <span>Profund.</span> <span className="text-[var(--foreground)] font-bold">{figure.profundidade_cm || '-'} cm</span>
                        </div>
                    </div>

                    {figure.studio && (
                        <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                                {figure.studio_logo ? (
                                    <img src={figure.studio_logo} alt={figure.studio} className="w-full h-full object-contain p-1" />
                                ) : (
                                    <span className="text-[10px] font-black text-zinc-700">{figure.studio.slice(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex flex-col flex-1 overflow-hidden text-left">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Escultor Parceiro</span>
                                <h4 className="text-sm font-bold text-[var(--foreground)] truncate">{figure.studio}</h4>
                            </div>
                            <button 
                                onClick={handleSeeMoreStudio}
                                className="p-3 bg-blue-500/10 text-blue-500 rounded-xl active:scale-95 transition-all"
                                title="Ver Acervo"
                            >
                                <ExternalLink size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {!isInCart(figure.id) && (
                    <div className="flex gap-3 mb-5">
                        <div className="flex items-center bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden flex-1 h-12">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-12 h-full flex items-center justify-center text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors active:bg-orange-500/20 font-black text-lg"
                            >
                                -
                            </button>
                            <span className="flex-1 flex items-center justify-center text-sm font-black text-[var(--foreground)] border-x border-[var(--card-border)] shadow-inner">
                                {quantity}
                            </span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-12 h-full flex items-center justify-center text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors active:bg-orange-500/20 font-black text-lg"
                            >
                                +
                            </button>
                        </div>
                        <select
                            value={finish}
                            onChange={(e) => setFinish(e.target.value as 'basic' | 'premium')}
                            className="flex-[1.5] text-sm font-bold bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3 outline-none focus:border-orange-500/50 shadow-sm cursor-pointer hover:border-orange-500/30 transition-colors h-12"
                        >
                            <option value="basic">Acabamento Básico</option>
                            <option value="premium">Acabamento Premium</option>
                        </select>
                    </div>
                )}

                <button
                    className={clsx(
                        "w-full text-white font-black uppercase tracking-wider text-sm py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg",
                        isInCart(figure.id)
                            ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                            : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                    )}
                    onClick={() => isInCart(figure.id) ? setIsCartOpen(true) : handleAddToCart()}
                >
                    <ExternalLink size={20} strokeWidth={2.5} />
                    {isInCart(figure.id) ? "Adicionado ✓" : "Adicionar ao Carrinho"}
                </button>
            </div>
        </div>
    );
};
