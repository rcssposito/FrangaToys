'use client';

import { useEstudios } from '@/hooks/useEstudios';
import { FiltersSchema } from '@/lib/dto';
import { SlidersHorizontal, ArrowLeft, X, Search, Settings } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type FilterState = z.infer<typeof FiltersSchema>;

import { CartIndicator } from '@/components/Cart/CartIndicator';
import ThemeToggle from '@/components/common/ThemeToggle';

interface MobileFiltersProps {
    filters: FilterState;
    onChange: (newFilters: FilterState) => void;
    categories: string[];
    onOpenCart: () => void;
}

export const MobileFilters = ({ filters, onChange, categories, onOpenCart }: MobileFiltersProps) => {
    const { data: estudios } = useEstudios(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState(filters.q || '');
    const [debouncedSearch, setDebouncedSearch] = useState(filters.q || '');
    const isUserInteraction = useRef(false);
    const isFocused = useRef(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 1. Sync local state FROM props (External updates)
    // 1. Sync local state FROM props (External updates)
    useEffect(() => {
        const remoteQ = filters.q || '';
        if (remoteQ !== localSearch) {
            // If user is focused on input, DO NOT overwrite with external prop (which acts as an "echo")
            // unless the user interaction flag is explicitly false (meaning we just loaded or cleared).
            if (isFocused.current) return;

            // If we are not focused, it's safe to sync (e.g. "Clear All" clicked, or URL navigation)
            setLocalSearch(remoteQ);
            setDebouncedSearch(remoteQ); // Keep debounce in sync to avoid accidental revert
            isUserInteraction.current = false;
        }
    }, [filters.q]); // Removed localSearch from dependency array to prevent infinite loop

    // 2. Debounce localSearch
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(localSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearch]);

    // 3. Sync debouncedSearch TO parent (User interaction)
    useEffect(() => {
        const currentQ = filters.q || '';
        const debouncedQ = debouncedSearch || '';

        // Critical: Only update parent if local debounce is settled
        if (debouncedQ === localSearch && debouncedQ !== currentQ) {
            if (isUserInteraction.current) {
                onChange({ ...filters, q: debouncedQ || undefined });
            }
        }
    }, [debouncedSearch, localSearch, filters, onChange]);

    // Handlers
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSearch(e.target.value);
        isUserInteraction.current = true;
    };

    // Close sheet when resizing to desktop? Not strictly necessary if CSS hides it.

    const toggleStudio = (id: number) => {
        const current = filters.studioIds ? filters.studioIds.split(',').filter(Boolean) : [];
        const idStr = id.toString();
        const newIds = current.includes(idStr)
            ? current.filter(x => x !== idStr)
            : [...current, idStr];
        onChange({ ...filters, studioIds: newIds.join(',') });
    };

    const countActiveFilters = () => {
        let count = 0;
        if (filters.studioIds) count += filters.studioIds.split(',').filter(Boolean).length;
        if (filters.incluirNaoVendaveis === 'true') count++;
        if (filters.novidades === 'true') count++;
        return count;
    };

    const activeCount = countActiveFilters();

    return (
        <div className="w-full flex flex-col mb-4 sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--card-border)] pb-2 pt-2 transition-all">

            {/* 0. Mobile Brand Header */}
            <div className="px-4 py-2 flex items-center justify-between relative">
                <div className="w-12 flex justify-start items-center gap-2">
                    <CartIndicator onClick={onOpenCart} />
                </div>
                <div className="flex-1 flex justify-center">
                    <img
                        src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                        alt="Logo"
                        className="h-16 object-contain"
                    />
                </div>
                <div className="w-12 flex justify-end items-center gap-2">
                    <ThemeToggle />
                    <Link href="/admin" className="p-1 text-[var(--text-muted)] hover:text-orange-500 transition-colors">
                        <Settings size={18} />
                    </Link>
                </div>
            </div>

            {/* 1. Search Row */}
            <div className="flex gap-3 px-4 mb-3">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-orange-500 transition-colors" />
                    <input
                        value={localSearch}
                        onChange={handleSearchChange}
                        onFocus={() => isFocused.current = true}
                        onBlur={() => isFocused.current = false}
                        placeholder="Buscar..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--foreground)] text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-[var(--text-muted)] shadow-[var(--shadow-sm)]"
                    />
                </div>
                <button
                    onClick={() => setIsSheetOpen(true)}
                    className={clsx(
                        "relative flex items-center justify-center w-11 h-11 rounded-xl border transition-all active:scale-95 shadow-[var(--shadow-sm)]",
                        activeCount > 0
                            ? "bg-orange-500/10 border-orange-500/50 text-orange-500"
                            : "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-muted)]"
                    )}
                >
                    <SlidersHorizontal size={20} />
                    {activeCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 animate-pulse ring-2 ring-black" />
                    )}
                </button>
            </div>

            {/* 2. Horizontal Scroll Categories */}
            <div className="w-full overflow-x-auto no-scrollbar px-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => onChange({ ...filters, categoria: undefined })}
                        className={clsx(
                            "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                            (!filters.categoria || filters.categoria === 'Todos')
                                ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                                : "bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--card-border)] shadow-[var(--shadow-sm)]"
                        )}
                    >
                        Todos
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => onChange({ ...filters, categoria: filters.categoria === cat ? undefined : cat })}
                            className={clsx(
                                "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                                filters.categoria === cat
                                    ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                                    : "bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--card-border)] shadow-[var(--shadow-sm)]"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. Bottom Sheet (Portal to Body) */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isSheetOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsSheetOpen(false)}
                                className="fixed inset-0 bg-black/80 z-[9999] backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="fixed bottom-0 left-0 right-0 z-[10000] bg-[var(--background)] border-t border-[var(--card-border)] rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl"
                            >
                                {/* Sheet Header */}
                                <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
                                    <h3 className="font-bold text-lg text-[var(--foreground)]">Filtros</h3>
                                    <button onClick={() => setIsSheetOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-orange-500 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Sheet Content (Scrollable) */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                                    {/* Toggles */}
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
                                            <span className="font-bold text-sm text-[var(--foreground)]">Apenas Novidades</span>
                                            <input
                                                type="checkbox"
                                                className="accent-orange-500 w-5 h-5"
                                                checked={filters.novidades === 'true'}
                                                onChange={(e) => onChange({ ...filters, novidades: e.target.checked ? 'true' : 'false' })}
                                            />
                                        </label>
                                        <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
                                            <span className="font-bold text-sm text-[var(--foreground)]">Exibir Indisponíveis</span>
                                            <input
                                                type="checkbox"
                                                className="accent-orange-500 w-5 h-5"
                                                checked={filters.incluirNaoVendaveis === 'true'}
                                                onChange={(e) => onChange({ ...filters, incluirNaoVendaveis: e.target.checked ? 'true' : 'false' })}
                                            />
                                        </label>
                                    </div>



                                    {/* Studios */}
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-muted)] mb-3 uppercase tracking-wider">Estúdios</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {estudios?.map(studio => {
                                                const isSelected = filters.studioIds?.split(',').includes(String(studio.id));
                                                return (
                                                    <label key={studio.id} className={clsx(
                                                        "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all shadow-sm",
                                                        isSelected
                                                            ? "bg-orange-500 text-white border-orange-500 font-bold"
                                                            : "bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-muted)]"
                                                    )}>
                                                        <input
                                                            type="checkbox"
                                                            className={clsx("w-4 h-4", isSelected ? "accent-white" : "accent-orange-500")}
                                                            checked={!!isSelected}
                                                            onChange={() => toggleStudio(studio.id)}
                                                        />
                                                        <span className="text-xs truncate">{studio.nome}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Sheet Footer */}
                                <div className="p-4 border-t border-[var(--card-border)] bg-[var(--background)] pb-8">
                                    <button
                                        onClick={() => setIsSheetOpen(false)}
                                        className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg active:scale-95 transition-all shadow-lg shadow-orange-500/20"
                                    >
                                        Ver Resultados
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
