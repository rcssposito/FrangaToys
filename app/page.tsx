'use client';

import { useState } from 'react';
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

type FilterState = z.infer<typeof FiltersSchema>;

const CATEGORIES = ['Anime', 'Games', 'Marvel', 'DC'];

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({});
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
    <main className="min-h-screen bg-black text-white px-0 sm:px-4 py-4 sm:py-8">
      <div className="w-full sm:max-w-[95%] mx-auto">

        {/* Header - Desktop */}
        <div className="hidden sm:flex items-center justify-center relative mb-8 px-4 py-4">
          <Link href="/" className="text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity">
            Galeria <span className="text-orange-500">Franga Toys</span>
          </Link>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <CartIndicator onClick={() => setIsDrawerOpen(true)} className="hover:bg-zinc-900 px-3 py-2 rounded-lg" />
            <Link
              href="/api/auth/logout"
              className="p-2 text-zinc-500 hover:text-white transition-colors"
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
