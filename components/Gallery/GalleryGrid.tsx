'use client';

import { FiguraDTO } from '@/lib/dto';
import { FigureCard } from '@/components/Gallery/FigureCard';
import { EmptyState } from '@/components/Gallery/EmptyState';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryGridProps {
    data: any;
    isLoading: boolean;
    isError: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean | undefined;
    fetchNextPage: () => void;
    onClearFilters?: () => void;
}

export const GalleryGrid = ({ 
    data, 
    isLoading, 
    isError, 
    isFetchingNextPage, 
    hasNextPage, 
    fetchNextPage,
    onClearFilters 
}: GalleryGridProps) => {
    const observerTarget = useRef(null);

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {[...Array(10)].map((_, i) => (
                    <div 
                        key={i} 
                        className="relative aspect-[4/5] bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        {/* Noir Blue Shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-zinc-900/80 backdrop-blur-md" />
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="text-red-500 font-black uppercase tracking-[0.3em] text-xs mb-4">Erro ao invocar o acervo</div>
                <button 
                    onClick={() => window.location.reload()}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    const allItems = data?.pages.flatMap((page: any) => page.items) || [];

    if (allItems.length === 0) {
        return <EmptyState onClearFilters={onClearFilters || (() => window.location.href = '/')} />;
    }

    return (
        <div className="pb-20">
            <motion.div 
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
            >
                <AnimatePresence mode="popLayout">
                    {allItems.map((figure: FiguraDTO, index: number) => (
                        <motion.div
                            key={figure.id}
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
                            transition={{ 
                                duration: 0.6, 
                                delay: (index % 15) * 0.03,
                                ease: [0.16, 1, 0.3, 1] 
                            }}
                        >
                            <FigureCard figure={figure} priority={index < 4} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Sentinel for Infinite Scroll */}
            <div ref={observerTarget} className="h-40 flex items-center justify-center mt-12 bg-gradient-to-t from-black/20 to-transparent rounded-3xl">
                {isFetchingNextPage ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] animate-pulse">Sondando o Vazio...</span>
                    </div>
                ) : !hasNextPage && allItems.length > 0 && (
                    <div className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em] opacity-40">Fim do Acervo Conhecido</div>
                )}
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};
