'use client';

import { useEffect, useCallback, useState } from 'react';
import { FiguraDTO } from '@/lib/dto';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

interface ImageModalProps {
    figure: FiguraDTO | null;
    isOpen: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    currentIndex: number;
    total: number;
}

export const DesktopModal = ({ figure, isOpen, onClose, onNext, onPrev, currentIndex, total }: ImageModalProps) => {
    const { addToCart, removeFromCart, isInCart } = useCart();
    const router = useRouter();

    const [quantity, setQuantity] = useState(1);
    const [finish, setFinish] = useState<'basic' | 'premium'>('basic');

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') onNext();
        if (e.key === 'ArrowLeft') onPrev();
    }, [isOpen, onClose, onNext, onPrev]);

    const handleSeeMoreStudio = (e: React.MouseEvent) => {
        e.preventDefault();
        if (figure?.studio_id) {
            router.push(`/?studioIds=${figure.studio_id}&incluirNaoVendaveis=true`);
            onClose();
        }
    };

    // Reset state when figure changes
    useEffect(() => {
        setQuantity(1);
        setFinish('basic');
    }, [figure?.id]);

    // Hook 1: Event Listener
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Hook 2: Body Scroll Lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !figure) return null;

    const handleAddToCart = () => {
        addToCart({ ...figure, quantity, finish } as any);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-5xl h-[90vh] flex flex-col items-center justify-center p-2"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Navigation Buttons */}
                <button
                    onClick={onPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-sm transition-colors z-40"
                    aria-label="Anterior"
                >
                    <ChevronLeft size={32} />
                </button>
                <button
                    onClick={onNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-sm transition-colors z-40"
                    aria-label="Próximo"
                >
                    <ChevronRight size={32} />
                </button>

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

                {/* Details Footer */}
                <div className="mt-4 w-full max-w-4xl bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 backdrop-blur-md shadow-2xl transition-all">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left flex-1">
                            <h2 className="text-2xl font-black text-[var(--foreground)] mb-1 tracking-tight">{figure.nome}</h2>
                            <div className="text-xs text-[var(--text-muted)] font-bold flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 uppercase tracking-widest">
                                <span>{figure.altura_cm ? `Alt: ${figure.altura_cm}cm` : ''}</span>
                                <span>{figure.largura_cm ? `Lrg: ${figure.largura_cm}cm` : ''}</span>
                                <span>{figure.profundidade_cm ? `Prof: ${figure.profundidade_cm}cm` : ''}</span>
                            </div>
                            
                            {figure.studio && (
                                <div className="mt-4 flex items-center justify-center md:justify-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-inner">
                                        {figure.studio_logo ? (
                                            <img src={figure.studio_logo} alt={figure.studio} className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <span className="text-[10px] font-black text-zinc-700">{figure.studio.slice(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Esculpido por</span>
                                        <button 
                                            onClick={handleSeeMoreStudio}
                                            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest flex items-center gap-1.5 group/link"
                                        >
                                            {figure.studio}
                                            <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isInCart(figure.id) && (
                            <div className="flex items-center gap-4 bg-[var(--input-bg)] p-2 rounded-xl border border-[var(--card-border)] shadow-inner">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider px-2">QTD</span>
                                    <div className="flex items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors active:bg-orange-500/20 font-black"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 h-8 flex items-center justify-center text-sm font-black text-[var(--foreground)] border-x border-[var(--card-border)]">
                                            {quantity}
                                        </span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors active:bg-orange-500/20 font-black"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-[var(--card-border)]" />
                                <div className="flex items-center gap-2 pr-2">
                                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">TIPO</span>
                                    <select
                                        value={finish}
                                        onChange={(e) => setFinish(e.target.value as 'basic' | 'premium')}
                                        className="text-sm font-bold bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-lg py-1.5 px-3 outline-none focus:border-orange-500/50 shadow-sm cursor-pointer hover:border-orange-500/30 transition-colors"
                                    >
                                        <option value="basic">Básico</option>
                                        <option value="premium">Premium</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            className={clsx(
                                "flex items-center gap-2 text-white px-6 py-3.5 rounded-xl font-black transition-all active:scale-95 whitespace-nowrap uppercase tracking-wider text-sm shadow-lg",
                                isInCart(figure.id)
                                    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 w-full md:w-auto justify-center"
                                    : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                            )}
                            onClick={() => isInCart(figure.id) ? removeFromCart(figure.id) : handleAddToCart()}
                        >
                            <ExternalLink size={18} strokeWidth={2.5} />
                            {isInCart(figure.id) ? "Adicionado ✓" : "Adicionar"}
                        </button>
                    </div>
                    <div className="absolute -top-3 right-5 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-[var(--card-bg)] tracking-widest">
                        {currentIndex + 1} / {total}
                    </div>
                </div>

            </div>
        </div>
    );
};
