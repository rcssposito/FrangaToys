'use client';

import { useState, useEffect, useMemo } from 'react';
import { GatekeeperLanding } from '@/components/GatekeeperLanding';
import {
    Loader2,
    ArrowLeft,
    ExternalLink,
    Instagram,
    Globe,
    Sparkles,
    Eye,
    EyeOff,
    Search,
    X,
    Boxes,
    ArrowUpDown
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { BackToTop } from '@/components/ui/BackToTop';

interface Studio {
    id: number;
    nome: string;
    logo_url?: string | null;
    instagram_handle?: string | null;
    social_url?: string | null;
    qualidade?: number | null;
    ativo?: boolean;
    merchant?: boolean;
    figuras?: { count: number }[];
}

type SortOption = 'count-desc' | 'name-asc';

export default function PartnersPage() {
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('count-desc');
    const [failedLogos, setFailedLogos] = useState<Record<number, boolean>>({});

    useEffect(() => {
        let isMounted = true;
        async function checkAccess() {
            try {
                const res = await fetch('/api/public/access/verify');
                const data = await res.json();
                if (isMounted) setHasAccess(!!data.ok);
            } catch {
                if (isMounted) setHasAccess(false);
            }
        }
        checkAccess();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (!hasAccess) return;
        const fetchStudios = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/estudios?incluirInativos=${showInactive}`);
                const data = await res.json();
                if (res.ok && Array.isArray(data)) {
                    setStudios(data);
                }
            } catch (err) {
                console.error('Failed to fetch partners:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudios();
    }, [showInactive, hasAccess]);

    if (hasAccess === false) {
        return <GatekeeperLanding onAccessGranted={() => setHasAccess(true)} />;
    }

    const getFigureCount = (studio: Studio): number => {
        return studio.figuras?.[0]?.count ?? 0;
    };

    const filteredStudios = useMemo(() => {
        let list = studios.filter((s) => showInactive || (s.ativo !== false && s.merchant !== false));

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (s) =>
                    s.nome?.toLowerCase().includes(q) ||
                    s.instagram_handle?.toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            const isActiveMerchantA = Boolean(a.merchant && a.ativo !== false);
            const isActiveMerchantB = Boolean(b.merchant && b.ativo !== false);
            if (isActiveMerchantA !== isActiveMerchantB) {
                return isActiveMerchantA ? -1 : 1;
            }
            const countA = getFigureCount(a);
            const countB = getFigureCount(b);

            if (sortBy === 'count-desc') {
                if (countB !== countA) return countB - countA;
                return a.nome.localeCompare(b.nome);
            } else {
                // Keep 0-figure studios at the bottom even in A-Z so empty cards don't clutter the top
                if ((countA > 0) !== (countB > 0)) {
                    return countA > 0 ? -1 : 1;
                }
                return a.nome.localeCompare(b.nome);
            }
        });

        return list;
    }, [studios, searchQuery, sortBy]);

    const totalFiguresCount = useMemo(() => {
        return filteredStudios.reduce((acc, s) => acc + getFigureCount(s), 0);
    }, [filteredStudios]);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 selection:bg-orange-500/30 overflow-x-hidden">
            {/* Background Decorative Ambient Glow */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 pb-20">
                {/* Header Section */}
                <div className="flex flex-col gap-6 mb-12">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-3 text-zinc-400 hover:text-white transition-all text-[11px] font-black tracking-widest uppercase group"
                        >
                            <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 group-hover:border-orange-500/40 group-hover:bg-orange-500/10 group-hover:text-orange-400 transition-all">
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            </div>
                            VOLTAR PARA A LOJA
                        </Link>

                        <button
                            type="button"
                            onClick={() => setShowInactive(!showInactive)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer",
                                showInactive
                                    ? "bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.12)]"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                            )}
                        >
                            {showInactive ? <EyeOff size={14} /> : <Eye size={14} />}
                            <span>{showInactive ? "Ocultar Arquivo" : "Ver Todos"}</span>
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-zinc-800/80 pb-8">
                        <div className="space-y-3">
                            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-[10px] font-black tracking-widest uppercase">
                                <Sparkles size={12} fill="currentColor" />
                                <span>
                                    Curadoria FrangaToys • {filteredStudios.length} {filteredStudios.length === 1 ? 'Estúdio' : 'Estúdios'}
                                </span>
                                {totalFiguresCount > 0 && (
                                    <>
                                        <span className="opacity-40">•</span>
                                        <span className="text-zinc-300">{totalFiguresCount.toLocaleString('pt-BR')} Figuras</span>
                                    </>
                                )}
                            </div>
                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.95] text-white">
                                Nossos <span className="text-orange-500 not-italic">Parceiros</span>
                            </h1>
                        </div>

                        {/* Search & Sort Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                            <div className="relative w-full sm:w-72 lg:w-80">
                                <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar estúdio ou artista..."
                                    className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-orange-500/60 rounded-2xl pl-11 pr-10 py-3 text-xs font-bold text-white placeholder:text-zinc-500 outline-none transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                        title="Limpar busca"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSortBy('count-desc')}
                                    className={clsx(
                                        "flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                        sortBy === 'count-desc'
                                            ? "bg-orange-500 text-black shadow-sm"
                                            : "text-zinc-400 hover:text-white"
                                    )}
                                >
                                    <Boxes size={12} />
                                    <span>Mais Figuras</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortBy('name-asc')}
                                    className={clsx(
                                        "flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                        sortBy === 'name-asc'
                                            ? "bg-orange-500 text-black shadow-sm"
                                            : "text-zinc-400 hover:text-white"
                                    )}
                                >
                                    <ArrowUpDown size={12} />
                                    <span>A-Z</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid de Parceiros */}
                {loading && studios.length === 0 ? (
                    <div className="py-32 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
                        <p className="text-zinc-500 font-bold text-[10px] tracking-[0.3em] uppercase">
                            Conectando com o Acervo...
                        </p>
                    </div>
                ) : filteredStudios.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredStudios.map((studio) => {
                            const count = getFigureCount(studio);
                            const hasLogo = Boolean(studio.logo_url) && !failedLogos[studio.id];
                            const isLicensedActive = Boolean(studio.merchant && studio.ativo !== false);
                            const studioCatalogHref = `/?studioIds=${studio.id}`;

                            return (
                                <div
                                    key={studio.id}
                                    className={clsx(
                                        "group relative flex flex-col gap-4 transition-all duration-500",
                                        !isLicensedActive && "opacity-65 hover:opacity-100"
                                    )}
                                >
                                    {/* Card Principal (Quadrado com Logo + Quantidade de Figuras dentro do Card) */}
                                    <Link
                                        href={studioCatalogHref}
                                        className={clsx(
                                            "block relative aspect-square bg-zinc-900/40 border rounded-[2.5rem] overflow-hidden p-10 transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.95)] group-hover:-translate-y-1.5",
                                            isLicensedActive
                                                ? "border-zinc-800/80 hover:border-orange-500/40"
                                                : "border-zinc-900"
                                        )}
                                    >
                                        {/* Inner Gradient Glow */}
                                        {isLicensedActive && (
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                        )}

                                        {/* Badge de Quantidade de Figuras DENTRO do Card (Top Left) */}
                                        <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-zinc-800 group-hover:border-orange-500/40 shadow-lg">
                                            <Boxes size={12} className="text-orange-500 shrink-0" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-200">
                                                {count} {count === 1 ? 'Figura' : 'Figuras'}
                                            </span>
                                        </div>

                                        {/* Status Badge for inactive/archive studio (Top Right) */}
                                        {!isLicensedActive && (
                                            <div className="absolute top-5 right-5 z-20 bg-zinc-900/90 px-3 py-1.5 rounded-full border border-zinc-800">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                                    Sob Consulta
                                                </span>
                                            </div>
                                        )}

                                        {/* Logo Container (Grande no centro do Card) */}
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            {hasLogo ? (
                                                <img
                                                    src={studio.logo_url!}
                                                    alt={studio.nome}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onError={() =>
                                                        setFailedLogos((prev) => ({ ...prev, [studio.id]: true }))
                                                    }
                                                    className={clsx(
                                                        "max-w-full max-h-full object-contain transition-all duration-500 scale-95 group-hover:scale-105",
                                                        isLicensedActive
                                                            ? "opacity-90 group-hover:opacity-100"
                                                            : "grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-90"
                                                    )}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-2 text-center">
                                                    <div className="w-20 h-20 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl font-black font-mono text-orange-500 shadow-inner">
                                                        {studio.nome.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                                        {studio.nome}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Link Action Indicator (Bottom Center Inside Card) */}
                                        <div className="absolute inset-x-0 bottom-5 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-20">
                                            <div
                                                className={clsx(
                                                    "text-black text-[10px] font-black tracking-widest uppercase px-5 py-2 rounded-full shadow-2xl flex items-center gap-2",
                                                    isLicensedActive ? "bg-orange-500 text-black" : "bg-zinc-300 text-black"
                                                )}
                                            >
                                                <span>Ver {count > 0 ? `${count} Figuras` : 'Acervo'}</span>
                                                <ExternalLink size={11} />
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Footer Data & Socials */}
                                    <div className="px-3 flex items-center justify-between gap-3">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <h3
                                                className={clsx(
                                                    "text-sm font-black tracking-widest uppercase truncate",
                                                    isLicensedActive ? "text-zinc-200 group-hover:text-orange-400 transition-colors" : "text-zinc-500"
                                                )}
                                            >
                                                {studio.nome}
                                            </h3>
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">
                                                {isLicensedActive ? 'Estúdio de Modelagem 3D' : 'Acervo • Sob Consulta'} • {count} {count === 1 ? 'peça' : 'peças'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {studio.instagram_handle && (
                                                <a
                                                    href={`https://instagram.com/${studio.instagram_handle.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 hover:bg-pink-500/10 text-zinc-400 hover:text-pink-400 rounded-xl transition-all"
                                                    title={`Instagram: @${studio.instagram_handle.replace('@', '')}`}
                                                >
                                                    <Instagram size={14} />
                                                </a>
                                            )}
                                            {studio.social_url && (
                                                <a
                                                    href={studio.social_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-400 hover:text-orange-400 rounded-xl transition-all"
                                                    title="Visite o Site"
                                                >
                                                    <Globe size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-32 bg-zinc-900/10 border-2 border-dashed border-zinc-900 rounded-[3rem] flex flex-col items-center justify-center gap-4">
                        <p className="text-zinc-500 font-black text-xs tracking-[0.3em] uppercase">
                            Nenhum parceiro encontrado
                        </p>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-orange-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                                Limpar busca
                            </button>
                        )}
                    </div>
                )}
            </div>

            <BackToTop />
        </div>
    );
}
