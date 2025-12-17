'use client';

import { useFiguras } from '@/hooks/useFiguras';
import { FiltersSchema, FiguraDTO } from '@/lib/dto';
import { z } from 'zod';
import { DesktopCard } from '@/components/cards/DesktopCard';
import { MobileCard } from '@/components/cards/MobileCard';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

type Filters = z.infer<typeof FiltersSchema>;

interface GalleryGridProps {
    filters: Filters;
    onOpenModal: (f: FiguraDTO) => void;
    setFilteredFigures: (figures: FiguraDTO[]) => void;
}

export const GalleryGrid = ({ filters, onOpenModal, setFilteredFigures }: GalleryGridProps) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError
    } = useFiguras(filters);

    const observerTarget = useRef(null);

    // Update parent with flat list for Modal navigation
    useEffect(() => {
        if (data) {
            const allItems = data.pages.flatMap(p => p.items);
            setFilteredFigures(allItems);
        }
    }, [data, setFilteredFigures]);

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 animate-pulse">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="aspect-[4/5] bg-zinc-900 rounded-xl" />
                ))}
            </div>
        );
    }

    if (isError) {
        return <div className="text-center py-20 text-red-400">Erro ao carregar figuras. Tente novamente.</div>;
    }

    if (!data || data.pages[0].items.length === 0) {
        return <div className="text-center py-20 text-zinc-500">Nenhum item encontrado.</div>;
    }

    return (
        <div className="pb-20">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {data.pages.map((page, i) => (
                    page.items.map((figure) => (
                        <div key={figure.id}>
                            <MobileCard
                                figure={figure}
                                onOpenModal={onOpenModal}
                                className="block sm:hidden"
                            />
                            <div className="hidden sm:block">
                                <DesktopCard
                                    figure={figure}
                                    onOpenModal={onOpenModal}
                                />
                            </div>
                        </div>
                    ))
                ))}
            </div>

            {/* Sentinel for Infinite Scroll */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
                {isFetchingNextPage && <Loader2 className="animate-spin text-orange-500" />}
            </div>
        </div>
    );
};
