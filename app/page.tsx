'use client';

import { useState } from 'react';
import { DesktopFilters } from '@/components/Filters/DesktopFilters';
import { MobileFilters } from '@/components/Filters/MobileFilters';
import { GalleryGrid } from '@/components/Gallery/GalleryGrid';
import { DesktopModal } from '@/components/Modal/DesktopModal';
import { MobileModal } from '@/components/Modal/MobileModal';
import { BackToTop } from '@/components/ui/BackToTop';
import { FiltersSchema, FiguraDTO } from '@/lib/dto';
import { z } from 'zod';

type FilterState = z.infer<typeof FiltersSchema>;

const CATEGORIES = ['Anime', 'Games', 'Marvel', 'DC'];

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({});

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

        {/* Header */}
        <div className="text-center mb-6 sm:mb-10 px-4 hidden sm:block">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Galeria <span className="text-orange-500">Franga Toys</span>
          </h1>
        </div>

        {/* Filters - Split */}
        <div className="block sm:hidden">
          <MobileFilters
            filters={filters}
            onChange={setFilters}
            categories={CATEGORIES}
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
            onOpenModal={handleOpenModal}
            setFilteredFigures={setCurrentList}
          />
        </div>

      </div>

      {/* Modal - Split */}
      <div className="block sm:hidden">
        <MobileModal
          figure={activeFigure}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onNext={nextFigure}
          onPrev={prevFigure}
          currentIndex={activeIndex}
          total={currentList.length}
        />
      </div>
      <div className="hidden sm:block">
        <DesktopModal
          figure={activeFigure}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onNext={nextFigure}
          onPrev={prevFigure}
          currentIndex={activeIndex}
          total={currentList.length}
        />
      </div>

      <BackToTop />
    </main>
  );
}
