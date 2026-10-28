'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Flame, MoveLeft, Loader2, Search, Zap, ArrowUpDown, Tag, Sparkles, X, Clock } from 'lucide-react';
import Header from '@/components/common/Header';
import { FigureCard } from '@/components/Gallery/FigureCard';
import { FiguraDTO } from '@/lib/dto';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'discount-desc' | 'name-asc';
type QuickFilter = 'all' | 'pronta-entrega' | 'under-250' | 'under-400';

export default function CampanhaClient() {
  const [items, setItems] = useState<FiguraDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignEndAt, setCampaignEndAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch('/api/figuras?campanha=true&limit=100', {
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('Falha ao carregar');
        const data = await res.json();
        setItems(data.items || []);
        setCampaignEndAt(data.campaignEndAt || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, []);

  // Countdown Timer Effect
  useEffect(() => {
    if (!campaignEndAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = new Date(campaignEndAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        setCampaignEndAt(null);
        // Trigger backend auto-expiration and refresh
        fetch('/api/figuras?campanha=true&limit=1', { cache: 'no-store' })
          .then(() => setItems([]))
          .catch(() => {});
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [campaignEndAt]);

  // Helpers for prices and discounts
  const getItemPrice = (item: FiguraDTO): number => {
    return item.precos?.pix_colorido || 
           item.precos?.colorido || 
           item.precos?.pix_estilizado || 
           item.precos?.estilizado || 
           0;
  };

  const getItemDiscount = (item: FiguraDTO): number => {
    return item.desconto_campanha || 
           item.precos?.desconto_bundle_pct || 
           0;
  };

  // Counts for quick chips
  const prontaEntregaCount = useMemo(() => {
    return items.filter(i => Boolean(i.pronta_entrega)).length;
  }, [items]);

  // Filter & sort pipeline
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(item => 
        item.nome?.toLowerCase().includes(q) ||
        item.serie?.toLowerCase().includes(q) ||
        item.studio?.toLowerCase().includes(q)
      );
    }

    // Quick filter chips
    if (quickFilter === 'pronta-entrega') {
      result = result.filter(i => Boolean(i.pronta_entrega));
    } else if (quickFilter === 'under-250') {
      result = result.filter(i => {
        const p = getItemPrice(i);
        return p > 0 && p <= 250;
      });
    } else if (quickFilter === 'under-400') {
      result = result.filter(i => {
        const p = getItemPrice(i);
        return p > 0 && p <= 400;
      });
    }

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => getItemPrice(a) - getItemPrice(b));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => getItemPrice(b) - getItemPrice(a));
    } else if (sortBy === 'discount-desc') {
      result.sort((a, b) => getItemDiscount(b) - getItemDiscount(a));
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return result;
  }, [items, search, quickFilter, sortBy]);

  const hasActiveFilters = search.trim() !== '' || quickFilter !== 'all' || sortBy !== 'default';

  const handleClearFilters = () => {
    setSearch('');
    setQuickFilter('all');
    setSortBy('default');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-500">
      <Header />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-28 sm:pb-16">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 group text-sm font-black uppercase tracking-widest"
        >
          <MoveLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para a Galeria
        </Link>

        {/* Editorial Header & Countdown */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 mb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-purple-400 mb-2">
              <Flame size={13} className="fill-purple-500/20 text-purple-400" />
              <span> Seleção Promocional • {items.length} {items.length === 1 ? 'peça disponível' : 'peças disponíveis'}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic leading-[0.95] text-white">
              Ofertas <span className="text-purple-500 not-italic">Ativas</span>
            </h1>
          </div>

          {/* Segmented Scoreboard Timer */}
          {timeLeft && (
            <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
                <span>Encerra em</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {timeLeft.days > 0 && (
                  <>
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 min-w-[54px] sm:min-w-[62px] text-center shadow-inner">
                      <span className="block text-lg sm:text-2xl font-black text-white tabular-nums leading-none tracking-tight">
                        {String(timeLeft.days).padStart(2, '0')}
                      </span>
                      <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                        {timeLeft.days === 1 ? 'Dia' : 'Dias'}
                      </span>
                    </div>
                    <span className="text-zinc-700 font-black text-base sm:text-lg -mt-2">:</span>
                  </>
                )}

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 min-w-[54px] sm:min-w-[62px] text-center shadow-inner">
                  <span className="block text-lg sm:text-2xl font-black text-white tabular-nums leading-none tracking-tight">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                    Horas
                  </span>
                </div>

                <span className="text-zinc-700 font-black text-base sm:text-lg -mt-2">:</span>

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 min-w-[54px] sm:min-w-[62px] text-center shadow-inner">
                  <span className="block text-lg sm:text-2xl font-black text-white tabular-nums leading-none tracking-tight">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                    Min
                  </span>
                </div>

                <span className="text-zinc-700 font-black text-base sm:text-lg -mt-2">:</span>

                <div className="bg-zinc-900/90 border border-purple-500/30 rounded-xl px-3 py-2 min-w-[54px] sm:min-w-[62px] text-center shadow-inner">
                  <span className="block text-lg sm:text-2xl font-black text-purple-400 tabular-nums leading-none tracking-tight">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-purple-400/70 mt-1">
                    Seg
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 p-3 sm:p-4 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, anime, série ou estúdio..."
                className="w-full bg-black/40 border border-zinc-800 focus:border-purple-500 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-white placeholder:text-zinc-600 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold pl-1 hidden sm:flex">
                <ArrowUpDown size={14} />
                <span>Ordenar:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Ordenar ofertas por"
                className="w-full sm:w-auto bg-black/40 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white outline-none cursor-pointer"
              >
                <option value="default">Destaques</option>
                <option value="discount-desc">Maior Desconto %</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
                <option value="name-asc">Nome (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                quickFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
              }`}
            >
              Todas ({items.length})
            </button>

            {prontaEntregaCount > 0 && (
              <button
                onClick={() => setQuickFilter(quickFilter === 'pronta-entrega' ? 'all' : 'pronta-entrega')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  quickFilter === 'pronta-entrega'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                    : 'bg-zinc-900/60 hover:bg-zinc-800 text-amber-400 border border-amber-500/30'
                }`}
              >
                <Zap size={12} className={quickFilter === 'pronta-entrega' ? 'fill-black' : 'fill-amber-400'} />
                Pronta Entrega ({prontaEntregaCount})
              </button>
            )}

            <button
              onClick={() => setQuickFilter(quickFilter === 'under-250' ? 'all' : 'under-250')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                quickFilter === 'under-250'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
              }`}
            >
              Até R$ 250
            </button>

            <button
              onClick={() => setQuickFilter(quickFilter === 'under-400' ? 'all' : 'under-400')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                quickFilter === 'under-400'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
              }`}
            >
              Até R$ 400
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-white underline font-bold whitespace-nowrap cursor-pointer ml-auto"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
            <Loader2 className="animate-spin text-purple-500 mb-3" size={40} />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">Carregando promoções...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-4 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-3xl max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
              <Flame size={28} />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Nenhuma promoção ativa no momento</h3>
            <p className="text-xs text-zinc-500 font-medium mt-1 mb-6">
              Fique de olho em nossas redes ou confira o acervo completo com opções sob encomenda e pronta entrega.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/20"
            >
              Explorar Catálogo Geral
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-zinc-950/40 border border-zinc-800/80 rounded-3xl">
            <p className="text-zinc-400 text-sm font-bold">Nenhuma peça em promoção encontrada com os filtros atuais.</p>
            <button
              onClick={handleClearFilters}
              className="mt-3 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Ver Todas as {items.length} Ofertas
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 px-1">
              <span>Mostrando {filteredItems.length} de {items.length} peças</span>
              {quickFilter === 'pronta-entrega' && (
                <span className="text-amber-400 flex items-center gap-1">
                  <Zap size={12} className="fill-amber-400" /> Somente Pronta Entrega
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredItems.map((item, index) => (
                <FigureCard key={item.id} figure={item} priority={index < 4} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}