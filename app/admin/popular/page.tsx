'use client';

import { useState, useEffect } from 'react';
import { Eye, TrendingUp, Trophy, Package, ExternalLink, Image as ImageIcon, Clapperboard, Film, Layers, DollarSign, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function PopularFiguresPage() {
    const [loading, setLoading] = useState(true);
    const [figures, setFigures] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>(null);

    useEffect(() => {
        fetchPopular();
    }, []);

    const fetchPopular = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/popular');
            const data = await res.json();
            if (res.ok) {
                if (data.figures) {
                    setFigures(data.figures);
                    setInsights(data.insights);
                } else {
                    setFigures(data);
                }
            } else {
                toast.error('Erro ao carregar ranking de popularidade');
            }
        } catch (error) {
            console.error(error);
            toast.error('Falha na conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-medium animate-pulse">Calculando popularidade e extraindo insights...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={32} />
                        Ranking de Popularidade
                    </h1>
                    <p className="text-zinc-500 mt-1">As figuras mais desejadas e os insights de comportamento da vitrine.</p>
                </div>
                <button 
                    onClick={fetchPopular}
                    className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-sm font-bold transition-all active:scale-95"
                >
                    Atualizar Agora
                </button>
            </div>

            {/* Market Insights Cards */}
            {insights && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/60 border border-white/5 p-5 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                            <Clapperboard size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estúdio Favorito</p>
                            <p className="text-lg font-black text-white leading-tight truncate" title={insights.topStudio?.name}>{insights.topStudio?.name}</p>
                            <p className="text-xs text-orange-400 font-bold">{insights.topStudio?.views} views</p>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-white/5 p-5 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                            <Film size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Série do Momento</p>
                            <p className="text-lg font-black text-white leading-tight truncate" title={insights.topSeries?.name}>{insights.topSeries?.name}</p>
                            <p className="text-xs text-blue-400 font-bold">{insights.topSeries?.views} views</p>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-white/5 p-5 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
                            <Layers size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoria em Alta</p>
                            <p className="text-lg font-black text-white leading-tight truncate" title={insights.topCategory?.name}>{insights.topCategory?.name}</p>
                            <p className="text-xs text-purple-400 font-bold">{insights.topCategory?.views} views</p>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-white/5 p-5 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Faixa de Preço Ideal</p>
                            <p className="text-lg font-black text-white leading-tight truncate" title={insights.topPriceRange?.name}>{insights.topPriceRange?.name}</p>
                            <p className="text-xs text-emerald-400 font-bold">{insights.topPriceRange?.views} views</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Ranking Table */}
            <div className="grid grid-cols-1 gap-4">
                {figures.map((fig, index) => (
                    <div 
                        key={fig.id}
                        className="group relative bg-zinc-900/40 hover:bg-zinc-900/60 border border-white/5 rounded-3xl p-4 flex items-center gap-6 transition-all duration-300 hover:translate-x-2"
                    >
                        {/* Rank Badge */}
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-black border border-white/10 font-black text-xl italic text-zinc-500 group-hover:text-orange-500 transition-colors">
                            #{index + 1}
                        </div>

                        {/* Figure Image */}
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-zinc-800 border border-white/5">
                            {fig.imagem_url ? (
                                <Image 
                                    src={fig.imagem_url} 
                                    alt={fig.nome}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-zinc-700">
                                    <ImageIcon size={32} />
                                </div>
                            )}
                        </div>

                        {/* Info Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 bg-black/50 px-2 py-0.5 rounded">
                                    {fig.studios?.nome || 'Estúdio Desconhecido'}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/80">
                                    {fig.series?.nome}
                                </span>
                            </div>
                            <h2 className="text-lg font-black text-white truncate tracking-tight">
                                {fig.nome}
                            </h2>
                        </div>

                        {/* Stats Side */}
                        <div className="flex items-center gap-4 md:gap-8 pr-4 shrink-0">
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Eye size={18} className="opacity-70" />
                                    <span className="text-2xl font-black tracking-tighter leading-none">
                                        {fig.views || 0}
                                    </span>
                                </div>
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Views</p>
                            </div>

                            <div className="hidden md:flex flex-col items-end border-l border-white/10 pl-6">
                                <div className="flex items-center gap-2 text-blue-400">
                                    <TrendingUp size={18} className="opacity-70" />
                                    <span className="text-2xl font-black tracking-tighter leading-none">
                                        {((fig.vendas / (fig.views || 1)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Conv.</p>
                            </div>

                            <div className="hidden lg:flex flex-col items-end border-l border-white/10 pl-6">
                                <div className="flex items-center gap-2 text-orange-500">
                                    <ShoppingBag size={18} className="opacity-70" />
                                    <span className="text-2xl font-black tracking-tighter leading-none">
                                        {fig.vendas || 0}
                                    </span>
                                </div>
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Vendas</p>
                            </div>
                        </div>

                        {/* Action Link */}
                        <a 
                            href={`/figura/${fig.id}`}
                            target="_blank"
                            className="p-3 bg-zinc-800 hover:bg-orange-600 rounded-2xl text-white transition-all shadow-lg active:scale-90"
                            title="Ver na Vitrine"
                        >
                            <ExternalLink size={18} />
                        </a>
                    </div>
                ))}

                {figures.length === 0 && (
                    <div className="text-center py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-white/10">
                        <Package className="mx-auto text-zinc-800 mb-4" size={64} />
                        <p className="text-zinc-600 font-medium">Nenhum dado de acesso coletado ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
