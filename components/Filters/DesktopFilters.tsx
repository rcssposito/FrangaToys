'use client';

import { useEstudios } from '@/hooks/useEstudios';
import { FiltersSchema } from '@/lib/dto';
import { Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { clsx } from 'clsx';

type FilterState = z.infer<typeof FiltersSchema>;

interface FiltersProps {
    filters: FilterState;
    onChange: (newFilters: FilterState) => void;
    categories: string[];
}

export const DesktopFilters = ({ filters, onChange, categories }: FiltersProps) => {
    const { data: estudios } = useEstudios();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [localSearch, setLocalSearch] = useState(filters.q || '');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== filters.q) {
                onChange({ ...filters, q: localSearch });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [localSearch, filters, onChange]);

    const toggleCategory = (cat: string) => {
        onChange({ ...filters, categoria: filters.categoria === cat ? undefined : cat });
    };

    const toggleStudio = (id: number) => {
        const current = filters.studioIds ? filters.studioIds.split(',').filter(Boolean) : [];
        const idStr = id.toString();
        const newIds = current.includes(idStr)
            ? current.filter(x => x !== idStr)
            : [...current, idStr];
        onChange({ ...filters, studioIds: newIds.join(',') });
    };

    const handleApply = () => {
        setShowAdvanced(false);
    };

    const handleClear = () => {
        onChange({
            q: filters.q,
            novidades: filters.novidades,
            categoria: filters.categoria
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 mb-8">

            {/* 1. Search Bar + Novidades */}
            <div className="relative w-full mb-3">
                <input
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Buscar por nome, série ou estúdio..."
                    className="w-full px-4 py-3 rounded border border-gray-700 bg-[#121826] text-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-500"
                />
                <label className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2 items-center text-sm select-none cursor-pointer">
                    <input
                        type="checkbox"
                        className="accent-orange-500 w-4 h-4"
                        checked={filters.novidades === 'true'}
                        onChange={(e) => onChange({ ...filters, novidades: e.target.checked ? 'true' : 'false' })}
                    />
                    <span className="text-gray-300">Novidades</span>
                </label>
            </div>

            {/* 2. Busca Avançada Toggle */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={clsx(
                        "px-4 py-1.5 rounded-md border text-sm font-medium transition-colors",
                        showAdvanced
                            ? "bg-black border-orange-500 text-orange-500 ring-1 ring-orange-500"
                            : "bg-black border-gray-700 text-white hover:border-orange-500"
                    )}
                >
                    Busca avançada
                </button>
            </div>

            {/* 3. Advanced Panel */}
            {showAdvanced && (
                <div className="rounded-lg border border-gray-800 bg-[#0d1117] p-6 animate-in fade-in slide-in-from-top-2">

                    {/* Sorting */}
                    <div className="mb-6">
                        <div className="text-sm text-zinc-400 mb-2 font-medium">Ordenar por</div>
                        <div className="flex items-center gap-6">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="accent-orange-500 w-4 h-4" checked disabled />
                                <span className="text-white text-sm font-bold">A/Z</span>
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer opacity-50">
                                <input type="checkbox" className="accent-orange-500 w-4 h-4" disabled />
                                <span className="text-white text-sm font-bold">Z/A</span>
                            </label>
                            <span className="text-xs text-zinc-500">("Novidades" é atalho para ID desc)</span>
                        </div>
                    </div>

                    {/* Studios */}
                    <div className="mb-6">
                        <div className="text-sm text-zinc-400 mb-2 font-medium">Filtrar por Estúdio</div>
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {estudios?.map(studio => {
                                const isSelected = filters.studioIds?.split(',').includes(String(studio.id));
                                return (
                                    <label key={studio.id} className={clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all select-none",
                                        isSelected
                                            ? "bg-white text-black border-white font-medium"
                                            : "bg-transparent border-zinc-700 text-zinc-300 hover:border-zinc-500"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className={clsx("w-3.5 h-3.5", isSelected ? "accent-black" : "accent-orange-500")}
                                            checked={!!isSelected}
                                            onChange={() => toggleStudio(studio.id)}
                                        />
                                        <span className="text-xs truncate" title={studio.nome}>{studio.nome}</span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {/* Extra Options */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 select-none cursor-pointer">
                            <input
                                type="checkbox"
                                className="accent-orange-500 w-4 h-4"
                                checked={filters.incluirNaoVendaveis === 'true'}
                                onChange={(e) => onChange({ ...filters, incluirNaoVendaveis: e.target.checked ? 'true' : 'false' })}
                            />
                            <span className="text-sm text-white">Incluir itens <em>não</em> à venda</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-800">
                        <button
                            onClick={handleApply}
                            className="px-6 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-lg shadow-orange-900/20 transition-transform active:scale-95"
                        >
                            Aplicar
                        </button>
                        <button
                            onClick={handleClear}
                            className="px-6 py-2 rounded border border-zinc-700 bg-black hover:bg-zinc-900 text-white text-sm transition-transform active:scale-95"
                        >
                            Limpar
                        </button>
                    </div>
                </div>
            )}

            {/* 4. Categories Buttons */}
            <div className="flex flex-wrap justify-center gap-2 mt-8">
                <button
                    onClick={() => onChange({ ...filters, categoria: undefined })}
                    className={clsx(
                        "px-6 py-1.5 text-sm font-bold rounded-sm transition-all border",
                        (!filters.categoria || filters.categoria === 'Todos')
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-black text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600"
                    )}
                >
                    Todos
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={clsx(
                            "px-6 py-1.5 text-sm font-bold rounded-sm transition-all border",
                            filters.categoria === cat
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-black text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

        </div>
    );
};
