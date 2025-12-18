'use client';

import { useEffect, useCallback } from 'react';
import { FiguraDTO } from '@/lib/dto';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';

interface ImageModalProps {
    figure: FiguraDTO | null;
    isOpen: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    currentIndex: number;
    total: number;
}

export const ImageModal = ({ figure, isOpen, onClose, onNext, onPrev, currentIndex, total }: ImageModalProps) => {

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') onNext();
        if (e.key === 'ArrowLeft') onPrev();
    }, [isOpen, onClose, onNext, onPrev]);

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

    // Safe return after all hooks
    if (!isOpen || !figure) return null;

    const buildBudgetLink = () => {
        const msg = `Olá! Quero orçamento da figura: ${figure.nome}${figure.categoria ? ` (${figure.categoria})` : ''}.`;
        return `https://wa.me/5511959737551?text=${encodeURIComponent(msg)}`;
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

                        <a
                            href={buildBudgetLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-transform active:scale-95 whitespace-nowrap"
                        >
                            <ExternalLink size={18} />
                            Pedir Orçamento
                        </a>
                    </div>
                    <div className="absolute -top-3 right-4 bg-zinc-800 text-xs px-2 py-0.5 rounded text-zinc-400">
                        {currentIndex + 1} / {total}
                    </div>
                </div>

            </div>
        </div>
    );
};
