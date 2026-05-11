'use client';

import { useRouter } from 'next/navigation';
import { FiguraDTO } from '@/lib/dto';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { FigureDetails } from '@/components/Gallery/FigureDetails';
import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface InterceptedModalProps {
    figure: FiguraDTO;
}

export function InterceptedModal({ figure }: InterceptedModalProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onClose = () => {
        router.back();
    };

    // Calculate Next/Prev from Query Cache
    const getCachedFigures = useCallback(() => {
        // We look for any query starting with 'figuras'
        const queries = queryClient.getQueriesData<any>({ queryKey: ['figuras'] });
        if (!queries || queries.length === 0) return [];

        // Assuming the main storefront query is the active one, extract internal items array
        const allFigures: FiguraDTO[] = [];
        queries.forEach(([_, data]) => {
            if (data && data.pages) {
                data.pages.forEach((p: any) => allFigures.push(...p.items));
            }
        });

        // Remove duplicates if any (by ID)
        return Array.from(new Map(allFigures.map(f => [f.id, f])).values());
    }, [queryClient]);

    const handleNavigation = useCallback((direction: 'next' | 'prev') => {
        const figures = getCachedFigures();
        if (figures.length <= 1) return;

        const currentIndex = figures.findIndex(f => f.id === figure.id);
        if (currentIndex === -1) return;

        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % figures.length;
        } else {
            nextIndex = (currentIndex - 1 + figures.length) % figures.length;
        }

        const nextFigureSlug = figures[nextIndex].slug || figures[nextIndex].id;
        // Replace routing keeps the modal 'intercepted' overlay state clean 
        router.replace(`/figura/${nextFigureSlug}`, { scroll: false });
    }, [figure.id, getCachedFigures, router]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') handleNavigation('next');
        if (e.key === 'ArrowLeft') handleNavigation('prev');
    }, [handleNavigation]);

    // Keyboard Listener
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Body Scroll Lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const figuresCount = isMounted ? getCachedFigures().length : 0;
    const hasNavigation = figuresCount > 1;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-5xl h-full md:h-[90vh] flex flex-col items-center justify-start md:justify-center p-2 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[110] p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Left Arrow */}
                {hasNavigation && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNavigation('prev'); }}
                        className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-sm transition-colors z-[110]"
                        aria-label="Anterior"
                    >
                        <ChevronLeft size={32} />
                    </button>
                )}

                {/* Right Arrow */}
                {hasNavigation && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNavigation('next'); }}
                        className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-sm transition-colors z-[110]"
                        aria-label="Próximo"
                    >
                        <ChevronRight size={32} />
                    </button>
                )}

                <FigureDetails figure={figure} />
            </div>
        </div>
    );
}
