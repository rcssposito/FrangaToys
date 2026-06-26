'use client';

import { useEstudios } from '@/hooks/useEstudios';
import { FiltersSchema } from '@/lib/dto';
import { 
  Search, 
  SlidersHorizontal, 
  LayoutGrid, 
  Gamepad2, 
  Tv, 
  Zap, 
  Shield, 
  Shuffle, 
  Tag, 
  Sparkles, 
  MoveUp, 
  MoveDown,
  Boxes,
  Swords
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { clsx } from 'clsx';

type FilterState = z.infer<typeof FiltersSchema>;

interface FiltersProps {
    filters: FilterState;
    onChange: (newFilters: FilterState) => void;
    categories: string[];
    totalCount: number;
    isLoading: boolean;
}

const PRICE_RANGES = [
  { label: 'Até R$ 400', value: '0-400', activeClass: 'border-orange-500 text-orange-400 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
  { label: 'R$ 400 - R$ 700', value: '400-700', activeClass: 'border-orange-500 text-orange-400 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
  { label: 'R$ 700 - R$ 1200', value: '700-1200', activeClass: 'border-orange-500 text-orange-400 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
  { label: 'R$ 1200 - R$ 1800', value: '1200-1800', activeClass: 'border-orange-500 text-orange-400 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
  { label: 'R$ 1800+', value: '1800-+', activeClass: 'border-orange-500 text-orange-400 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.15)]' }
];

export const DesktopFilters = ({ filters, onChange, categories, totalCount, isLoading }: FiltersProps) => {
    const { data: estudios } = useEstudios(true);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [localSearch, setLocalSearch] = useState(filters.q || '');
    const [debouncedSearch, setDebouncedSearch] = useState(filters.q || '');
    const isUserInteraction = useRef(false);
    const isFocused = useRef(false);

    useEffect(() => {
        const remoteQ = filters.q || '';
        if (remoteQ !== localSearch) {
            if (isFocused.current) return;
            setLocalSearch(remoteQ);
            setDebouncedSearch(remoteQ);
            isUserInteraction.current = false;
        }
    }, [filters.q]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(localSearch);
        }, 400);
        return () => clearTimeout(timer);
    }, [localSearch]);

    useEffect(() => {
        const currentQ = filters.q || '';
        const debouncedQ = debouncedSearch || '';

        if (debouncedQ === localSearch && debouncedQ !== currentQ) {
            if (isUserInteraction.current) {
                onChange({ ...filters, q: debouncedQ || undefined });
            }
        }
    }, [debouncedSearch, localSearch, filters, onChange]);

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

    const handleClear = () => {
        onChange({
            q: filters.q,
            categoria: filters.categoria,
            sort: filters.sort || 'newest'
        });
    };

    const handleSortChange = (newSort: string) => {
        onChange({ ...filters, sort: newSort });
    };

    const handlePriceRangeChange = (newRange: string | undefined) => {
        if (newRange) {
            onChange({ ...filters, priceRange: newRange, sort: 'name_asc' });
        } else {
            onChange({ ...filters, priceRange: newRange });
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 mb-8">
            
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 bg-zinc-900/60 backdrop-blur-md border border-white/5 px-6 py-2.5 rounded-full shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.25em] leading-none">
                            {isLoading ? 'Sintonizando...' : `${totalCount} Peças no Acervo`}
                        </span>
                    </div>
                </div>

                <h1 className="text-center text-4xl md:text-5xl font-black tracking-tight text-white mb-2 leading-tight">
                    Encontre sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">próxima peça.</span>
                </h1>
            </div>

            <div className="max-w-3xl mx-auto mb-6">
                <div className="relative flex items-center bg-zinc-950/60 backdrop-blur-md border border-white/5 hover:border-orange-500/20 focus-within:border-orange-500/50 rounded-2xl transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_35px_rgba(249,115,22,0.08)] group pl-5 pr-3 py-3.5">
                    <Search className="text-zinc-500 w-5 h-5 mr-3 flex-shrink-0 group-focus-within:text-orange-500 transition-colors" />
                    <input
                        value={localSearch}
                        onChange={(e) => {
                            setLocalSearch(e.target.value);
                            isUserInteraction.current = true;
                        }}
                        onFocus={() => isFocused.current = true}
                        onBlur={() => isFocused.current = false}
                        placeholder="Buscar por nome, série ou estúdio..."
                        className="w-full bg-transparent text-white focus:outline-none placeholder:text-zinc-650 text-sm font-medium"
                    />
                    <div className="h-6 w-px bg-zinc-800/60 mx-3" />
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={clsx(
                          "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                          showAdvanced
                            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                            : "text-zinc-400 hover:text-orange-400"
                        )}
                    >
                        Busca avançada
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto mb-8 bg-zinc-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-1.5 shadow-xl flex items-center justify-between">
                <button
                    onClick={() => onChange({ ...filters, categoria: undefined })}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative border border-transparent",
                        (!filters.categoria || filters.categoria === 'Todos')
                            ? "bg-zinc-900/60 text-orange-400 border-white/5 shadow-inner"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <Boxes size={14} className={(!filters.categoria || filters.categoria === 'Todos') ? "text-orange-400" : "text-zinc-500"} />
                    <span>Todos</span>
                    {(!filters.categoria || filters.categoria === 'Todos') && (
                        <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                    )}
                </button>
                {categories.map((cat) => {
                    const isActive = filters.categoria === cat;
                    let IconComponent = LayoutGrid;
                    if (cat === 'Anime') IconComponent = Swords;
                    else if (cat === 'Games') IconComponent = Gamepad2;
                    else if (cat === 'Marvel') IconComponent = Shield;
                    else if (cat === 'DC') IconComponent = Zap;
                    else if (cat === 'Random') IconComponent = Shuffle;
                    else if (cat === 'Outros') IconComponent = Boxes;

                    return (
                        <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative border border-transparent",
                                isActive
                                    ? "bg-zinc-900/60 text-orange-400 border-white/5 shadow-inner"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <IconComponent size={14} className={isActive ? "text-orange-400" : "text-zinc-500"} />
                            <span>{cat}</span>
                            {isActive && (
                                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {showAdvanced && (
                <div className="max-w-6xl mx-auto rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 animate-in fade-in slide-in-from-top-2 shadow-2xl mb-6">
                    <div className="mb-6">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Filtrar por Estúdio</div>
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {estudios?.map(studio => {
                                const isSelected = filters.studioIds?.split(',').includes(String(studio.id));
                                return (
                                    <label key={studio.id} className={clsx(
                                        "flex items-center gap-2 px-3.5 py-2 rounded-full border cursor-pointer transition-all select-none shadow-md",
                                        isSelected
                                            ? "bg-orange-500 text-white border-orange-500 font-bold"
                                            : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-orange-500/50"
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

                    <div className="mb-6">
                        <label className="flex items-center gap-2.5 select-none cursor-pointer">
                            <input
                                type="checkbox"
                                className="accent-orange-500 w-4 h-4 rounded-md border-white/10"
                                checked={filters.incluirNaoVendaveis === 'true'}
                                onChange={(e) => onChange({ ...filters, incluirNaoVendaveis: e.target.checked ? 'true' : 'false' })}
                            />
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Exibir itens indisponíveis</span>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            onClick={handleClear}
                            className="px-6 py-2 rounded-full border border-white/5 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-300 hover:text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md"
                        >
                            Limpar
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto bg-zinc-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col lg:flex-row items-stretch justify-between gap-6">
                <div className="flex-1 flex flex-col gap-3 justify-center">
                    <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <Tag size={12} className="text-orange-500" />
                        <span>Filtrar por Valor</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handlePriceRangeChange(undefined)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                !filters.priceRange
                                    ? "bg-transparent text-orange-400 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] bg-orange-500/5"
                                    : "bg-zinc-900/40 text-zinc-500 border-white/5 hover:text-zinc-350"
                            )}
                        >
                            Todos os valores
                        </button>
                        {PRICE_RANGES.map((range) => {
                            const isActive = filters.priceRange === range.value;
                            return (
                                <button
                                    key={range.value}
                                    onClick={() => handlePriceRangeChange(isActive ? undefined : range.value)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                        isActive
                                            ? range.activeClass
                                            : "bg-zinc-900/40 text-zinc-500 border-white/5 hover:text-zinc-350"
                                    )}
                                >
                                    {range.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="hidden lg:block w-px bg-white/5 self-stretch" />

                <div className="flex flex-col gap-3 justify-center lg:items-end">
                    <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <SlidersHorizontal size={12} className="text-orange-500" />
                        <span>Ordenar por</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-zinc-900/40 border border-white/5 p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => handleSortChange('newest')}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                filters.sort === 'newest' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Sparkles size={11} /> Novidades
                        </button>
                        <button
                            onClick={() => handleSortChange('name_asc')}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                filters.sort === 'name_asc' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <MoveUp size={11} /> A-Z
                        </button>
                        <button
                            onClick={() => handleSortChange('name_desc')}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                filters.sort === 'name_desc' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <MoveDown size={11} /> Z-A
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
