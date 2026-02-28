'use client';

import { useEffect } from 'react';
import { FiguraDTO } from '@/lib/dto';
import { X, ChevronLeft, ChevronRight, Share } from 'lucide-react';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import { clsx } from 'clsx';

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
    const { addToCart, removeFromCart, isInCart } = useCart();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !figure) return null;

    const buildBudgetLink = () => {
        const msg = `Olá! Quero orçamento da figura: ${figure.nome}${figure.categoria ? ` (${figure.categoria})` : ''}.`;
        return `https://wa.me/5511959737551?text=${encodeURIComponent(msg)}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col transition-all duration-300">

            {/* 1. Header Navigation */}
            <div className="flex items-center justify-between p-4 z-20 bg-gradient-to-b from-[var(--background)]/80 to-transparent">
                <button onClick={onClose} className="p-2 bg-[var(--card-bg)]/40 rounded-full text-[var(--foreground)] backdrop-blur border border-[var(--card-border)] shadow-lg">
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
            <div className="bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent pt-10 pb-6 px-4 z-20 border-t border-[var(--card-border)]/10">
                <h2 className="text-xl font-bold text-[var(--foreground)] mb-2 leading-tight tracking-tight">{figure.nome}</h2>

                <div className="grid grid-cols-2 gap-y-1 text-xs text-[var(--text-muted)] font-medium mb-6">
                    <div className="flex justify-between border-b border-[var(--card-border)]/50 pr-4 py-1">
                        <span>Altura</span> <span className="text-[var(--foreground)] font-bold">{figure.altura_cm || '-'} cm</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--card-border)]/50 pr-4 py-1">
                        <span>Largura</span> <span className="text-[var(--foreground)] font-bold">{figure.largura_cm || '-'} cm</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--card-border)]/50 pr-4 py-1">
                        <span>Profund.</span> <span className="text-[var(--foreground)] font-bold">{figure.profundidade_cm || '-'} cm</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--card-border)]/50 pr-4 py-1">
                        <span>Estúdio</span> <span className="text-orange-500 font-bold">{figure.studio || '-'}</span>
                    </div>
                </div>

                <button
                    className={clsx(
                        "w-full text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                        isInCart(figure.id)
                            ? "bg-green-600 hover:bg-green-700 shadow-green-500/20"
                            : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20"
                    )}
                    onClick={() => isInCart(figure.id) ? removeFromCart(figure.id) : addToCart(figure)}
                >
                    <Share size={18} />
                    {isInCart(figure.id) ? "Adicionado ✓" : "Adicionar ao Orçamento"}
                </button>
            </div>
        </div>
    );
};
