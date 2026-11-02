'use client';

import { useState, useMemo, Suspense, useEffect, useRef } from 'react';
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

const CATEGORIES = ['Anime', 'Games', 'Marvel', 'DC', 'Random', 'Outros'];

function HomeContent() {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => ({
    q: searchParams.get('q') || undefined,
    categoria: searchParams.get('categoria') || undefined,
    studioIds: searchParams.get('studioIds') || undefined,
    incluirNaoVendaveis: searchParams.get('incluirNaoVendaveis') || undefined,
    sort: searchParams.get('sort') || 'newest',
    priceRange: searchParams.get('priceRange') || undefined,
    sizeRange: searchParams.get('sizeRange') || undefined,
    prontaEntrega: searchParams.get('prontaEntrega') || undefined
  }));

  const isInitialMount = useRef(true);

  // Sync state changes to browser URL via replaceState (0 network roundtrips, no Next.js router loop)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('franga_last_gallery_url', window.location.pathname + window.location.search);
      }
      return;
    }

    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.categoria) params.set('categoria', filters.categoria);
    if (filters.studioIds) params.set('studioIds', filters.studioIds);
    if (filters.incluirNaoVendaveis) params.set('incluirNaoVendaveis', filters.incluirNaoVendaveis);
    if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
    if (filters.priceRange) params.set('priceRange', filters.priceRange);
    if (filters.sizeRange) params.set('sizeRange', filters.sizeRange);
    if (filters.prontaEntrega) params.set('prontaEntrega', filters.prontaEntrega);

    const queryString = params.toString();
    const currentQuery = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '';
    if (queryString !== currentQuery) {
      const target = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.replaceState(window.history.state, '', target);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('franga_last_gallery_url', target);
      }
    }
  }, [filters]);

  // Sync filters state when navigating back/forward in browser history
  useEffect(() => {
    const newFilters: FilterState = {
      q: searchParams.get('q') || undefined,
      categoria: searchParams.get('categoria') || undefined,
      studioIds: searchParams.get('studioIds') || undefined,
      incluirNaoVendaveis: searchParams.get('incluirNaoVendaveis') || undefined,
      sort: searchParams.get('sort') || 'newest',
      priceRange: searchParams.get('priceRange') || undefined,
      sizeRange: searchParams.get('sizeRange') || undefined,
      prontaEntrega: searchParams.get('prontaEntrega') || undefined
    };

    setFilters(prev => {
      const isSame =
        prev.q === newFilters.q &&
        prev.categoria === newFilters.categoria &&
        prev.studioIds === newFilters.studioIds &&
        prev.incluirNaoVendaveis === newFilters.incluirNaoVendaveis &&
        prev.sort === newFilters.sort &&
        prev.priceRange === newFilters.priceRange &&
        prev.sizeRange === newFilters.sizeRange &&
        prev.prontaEntrega === newFilters.prontaEntrega;

      return isSame ? prev : newFilters;
    });

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('franga_last_gallery_url', window.location.pathname + window.location.search);
    }
  }, [searchParams]);

  // Reset all filters to initial clean state
  const resetFiltersToClean = () => {
    setFilters({
      q: undefined,
      categoria: undefined,
      studioIds: undefined,
      incluirNaoVendaveis: undefined,
      sort: 'newest',
      priceRange: undefined,
      sizeRange: undefined,
      prontaEntrega: undefined
    });
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', window.location.pathname);
      sessionStorage.setItem('franga_last_gallery_url', window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Listen to reset-home-filters event (triggered by clicking Franga Toys logo or Home button)
  useEffect(() => {
    const handleResetEvent = () => {
      resetFiltersToClean();
    };

    window.addEventListener('reset-home-filters', handleResetEvent);
    return () => window.removeEventListener('reset-home-filters', handleResetEvent);
  }, []);

  // Sync changes from URL searchParams back to filter state (e.g. Next.js navigation)
  useEffect(() => {
    const q = searchParams.get('q') || undefined;
    const categoria = searchParams.get('categoria') || undefined;
    const studioIds = searchParams.get('studioIds') || undefined;
    const incluirNaoVendaveis = searchParams.get('incluirNaoVendaveis') || undefined;
    const sort = searchParams.get('sort') || 'newest';
    const priceRange = searchParams.get('priceRange') || undefined;
    const sizeRange = searchParams.get('sizeRange') || undefined;
    const prontaEntrega = searchParams.get('prontaEntrega') || undefined;

    setFilters(prev => {
      if (
        prev.q === q &&
        prev.categoria === categoria &&
        prev.studioIds === studioIds &&
        prev.incluirNaoVendaveis === incluirNaoVendaveis &&
        prev.sort === sort &&
        prev.priceRange === priceRange &&
        prev.sizeRange === sizeRange &&
        prev.prontaEntrega === prontaEntrega
      ) {
        return prev;
      }
      return { q, categoria, studioIds, incluirNaoVendaveis, sort, priceRange, sizeRange, prontaEntrega };
    });
  }, [searchParams]);

  // Sync browser Back/Forward (popstate) navigation back to filter state
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      setFilters({
        q: sp.get('q') || undefined,
        categoria: sp.get('categoria') || undefined,
        studioIds: sp.get('studioIds') || undefined,
        incluirNaoVendaveis: sp.get('incluirNaoVendaveis') || undefined,
        sort: sp.get('sort') || 'newest',
        priceRange: sp.get('priceRange') || undefined,
        sizeRange: sp.get('sizeRange') || undefined,
        prontaEntrega: sp.get('prontaEntrega') || undefined,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-0 sm:px-4 pt-4 pb-24 sm:py-8 transition-colors duration-500">
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
            onClearFilters={() => setFilters({ ...filters, q: undefined, categoria: undefined, studioIds: undefined, sort: 'newest', priceRange: undefined, sizeRange: undefined, prontaEntrega: undefined })}
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

