'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

const CATEGORIES = ['Anime', 'Games', 'Marvel', 'DC', 'Random', 'Outros'];

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const qParam = searchParams.get('q');
  const categoriaParam = searchParams.get('categoria');
  const studioParam = searchParams.get('studioIds');
  const showAllParam = searchParams.get('incluirNaoVendaveis');
  const sortParam = searchParams.get('sort');
  const priceRangeParam = searchParams.get('priceRange');
  const sizeRangeParam = searchParams.get('sizeRange');

  const [filters, setFilters] = useState<FilterState>({
    q: qParam || undefined,
    categoria: categoriaParam || undefined,
    studioIds: studioParam || undefined,
    incluirNaoVendaveis: showAllParam || undefined,
    sort: sortParam || 'newest',
    priceRange: priceRangeParam || undefined,
    sizeRange: sizeRangeParam || undefined
  });

  // Sync state changes to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.categoria) params.set('categoria', filters.categoria);
    if (filters.studioIds) params.set('studioIds', filters.studioIds);
    if (filters.incluirNaoVendaveis) params.set('incluirNaoVendaveis', filters.incluirNaoVendaveis);
    if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
    if (filters.priceRange) params.set('priceRange', filters.priceRange);
    if (filters.sizeRange) params.set('sizeRange', filters.sizeRange);

    const queryString = params.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(target, { scroll: false });
  }, [filters, pathname, router]);

  // Sync URL changes back to state (e.g. back/forward navigation)
  useEffect(() => {
    const q = searchParams.get('q') || undefined;
    const categoria = searchParams.get('categoria') || undefined;
    const studioIds = searchParams.get('studioIds') || undefined;
    const incluirNaoVendaveis = searchParams.get('incluirNaoVendaveis') || undefined;
    const sort = searchParams.get('sort') || 'newest';
    const priceRange = searchParams.get('priceRange') || undefined;
    const sizeRange = searchParams.get('sizeRange') || undefined;

    setFilters(prev => {
      if (
        prev.q === q &&
        prev.categoria === categoria &&
        prev.studioIds === studioIds &&
        prev.incluirNaoVendaveis === incluirNaoVendaveis &&
        prev.sort === sort &&
        prev.priceRange === priceRange &&
        prev.sizeRange === sizeRange
      ) {
        return prev;
      }
      return { q, categoria, studioIds, incluirNaoVendaveis, sort, priceRange, sizeRange };
    });
  }, [searchParams]);

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
            totalCount={totalCount}
            isLoading={isLoading}
          />
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
            onClearFilters={() => setFilters({ ...filters, q: undefined, categoria: undefined, studioIds: undefined, sort: 'newest', priceRange: undefined, sizeRange: undefined })}
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

