'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DesktopFilters } from '@/components/Filters/DesktopFilters';
import { MobileFilters } from '@/components/Filters/MobileFilters';
import { GalleryGrid } from '@/components/Gallery/GalleryGrid';
import { BackToTop } from '@/components/ui/BackToTop';
import { useCart } from '@/context/CartContext';
import Header from '@/components/common/Header';
import { FiltersSchema, FiguraDTO } from '@/lib/dto';
import { z } from 'zod';
import { Settings, ListFilter, MoveUp, MoveDown, Sparkles, Loader2, Truck, Flame } from 'lucide-react';
import Link from 'next/link';
import { useFiguras } from '@/hooks/useFiguras';
import { clsx } from 'clsx';

import ThemeToggle from '@/components/common/ThemeToggle';

type FilterState = z.infer<typeof FiltersSchema>;

const CATEGORIES = ['Anime', 'Games', 'Marvel', 'DC', 'Random'];

function HomeContent() {
  const searchParams = useSearchParams();
  const studioParam = searchParams.get('studioIds');
  const showAllParam = searchParams.get('incluirNaoVendaveis');

  const [filters, setFilters] = useState<FilterState>({
    studioIds: studioParam || undefined,
    incluirNaoVendaveis: showAllParam || undefined,
    sort: 'newest'
  });
  
  const { setIsCartOpen } = useCart();

  // Tanstack Query Hook
  const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      isError
  } = useFiguras(filters);

  // Extract stats from result
  const totalCount = data?.pages[0]?.total || 0;
  
  const handleSortChange = (newSort: string) => {
    setFilters(prev => ({ ...prev, sort: newSort }));
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-0 sm:px-4 py-4 sm:py-8 transition-colors duration-500">
      <div className="w-full sm:max-w-[95%] mx-auto">
        <Header />

        {/* Filters - Split */}
        <div className="block sm:hidden">
          <MobileFilters
            filters={filters}
            onChange={setFilters}
            categories={CATEGORIES}
            onOpenCart={() => setIsCartOpen(true)}
          />
        </div>
        <div className="hidden sm:block">
          <DesktopFilters
            filters={filters}
            onChange={setFilters}
            categories={CATEGORIES}
          />
        </div>

        {/* Stats & Sort Bar (Luxury Refinement) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="relative">
               <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse" />
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] leading-tight">
                  {isLoading ? 'Sintonizando...' : `${totalCount} Peças no Acervo`}
               </span>
               {!isLoading && totalCount > 0 && (
                 <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest hidden sm:block">
                    Manifestando a realidade digital
                 </span>
               )}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/40 backdrop-blur-md border border-white/5 p-1 rounded-full shadow-xl">
             <button 
                onClick={() => handleSortChange('newest')}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                  filters.sort === 'newest' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
             >
                <Sparkles size={12} /> Novidades
             </button>
             <button 
                onClick={() => handleSortChange('name_asc')}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                  filters.sort === 'name_asc' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
             >
                <MoveUp size={12} /> A-Z
             </button>
             <button 
                onClick={() => handleSortChange('name_desc')}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                  filters.sort === 'name_desc' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
             >
                <MoveDown size={12} /> Z-A
             </button>
          </div>
        </div>

        {/* Dynamic Grid Expansion */}
        <div className="px-2 sm:px-0">
          <GalleryGrid
            data={data}
            isLoading={isLoading}
            isError={isError}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            onClearFilters={() => setFilters({ ...filters, q: undefined, categoria: undefined, studioIds: undefined, sort: 'newest' })}
          />
        </div>

      </div>

      <BackToTop />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

