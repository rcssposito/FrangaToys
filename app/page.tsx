'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DesktopFilters } from '@/components/Filters/DesktopFilters';
import { MobileFilters } from '@/components/Filters/MobileFilters';
import { GalleryGrid } from '@/components/Gallery/GalleryGrid';
import { DesktopModal } from '@/components/Modal/DesktopModal';
import { MobileModal } from '@/components/Modal/MobileModal';
import { BackToTop } from '@/components/ui/BackToTop';
import { CartIndicator } from '@/components/Cart/CartIndicator';
import { CartDrawer } from '@/components/Cart/CartDrawer';
import { FiltersSchema, FiguraDTO } from '@/lib/dto';
import { z } from 'zod';
import Link from 'next/link';
import { Settings } from 'lucide-react';

import ThemeToggle from '@/components/common/ThemeToggle';

type FilterState = z.infer<typeof FiltersSchema>;

const CATEGORIES = ['Anime', 'Games', 'Marvel', 'DC', 'Random'];

export default function Home() {
  const searchParams = useSearchParams();
  const studioParam = searchParams.get('studioIds');
  const showAllParam = searchParams.get('incluirNaoVendaveis');

  const [filters, setFilters] = useState<FilterState>({
    studioIds: studioParam || undefined,
    incluirNaoVendaveis: showAllParam || undefined
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // State for Modal Navigation
  const [activeFigure, setActiveFigure] = useState<FiguraDTO | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentList, setCurrentList] = useState<FiguraDTO[]>([]);

  const handleOpenModal = (figure: FiguraDTO) => {
    setActiveFigure(figure);
    setIsModalOpen(true);
  };

  const activeIndex = activeFigure ? currentList.findIndex(f => f.id === activeFigure.id) : -1;

  const nextFigure = () => {
    if (activeIndex >= 0 && activeIndex < currentList.length - 1) {
      setActiveFigure(currentList[activeIndex + 1]);
    } else if (activeIndex === currentList.length - 1) {
      setActiveFigure(currentList[0]); // Loop
    }
  };

  const prevFigure = () => {
    if (activeIndex > 0) {
      setActiveFigure(currentList[activeIndex - 1]);
    } else if (activeIndex === 0) {
      setActiveFigure(currentList[currentList.length - 1]); // Loop
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-0 sm:px-4 py-4 sm:py-8 transition-colors duration-500">
      <div className="w-full sm:max-w-[95%] mx-auto">

        {/* Header - Desktop */}
        <div className="hidden sm:flex items-center justify-center relative mb-8 px-4 py-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img
              src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
              alt="Franga Toys Logo"
              className="h-32 object-contain"
            />
          </Link>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-6">
            <Link 
              href="/parceiros" 
              className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-blue-500 transition-all flex items-center gap-2 group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:animate-ping" />
              Parceiros
            </Link>
            <div className="h-4 w-px bg-[var(--card-border)]" />
            <ThemeToggle />
            <CartIndicator onClick={() => setIsDrawerOpen(true)} className="hover:bg-zinc-900/10 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg" />
            <Link
              href="/admin/figures"
              className="p-2 text-[var(--text-muted)] hover:text-orange-500 transition-colors"
              title="Acessar Admin"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>

        {/* Filters - Split */}
        <div className="block sm:hidden">
          <MobileFilters
            filters={filters}
            onChange={setFilters}
            categories={CATEGORIES}
            onOpenCart={() => setIsDrawerOpen(true)}
          />
        </div>
        <div className="hidden sm:block">
          <DesktopFilters
            filters={filters}
            onChange={setFilters}
            categories={CATEGORIES}
          />
        </div>

        {/* Grid */}
        <div className="px-2 sm:px-0">
          <GalleryGrid
            filters={filters}
          />
        </div>

      </div>

      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <BackToTop />
    </main>
  );
}
