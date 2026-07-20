'use client';

import { useState, useEffect } from 'react';
import { Eye, TrendingUp, Trophy, Package, ExternalLink, Image as ImageIcon, Clapperboard, Film, Layers, DollarSign, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/Admin/LiveMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[600px] bg-zinc-900/20 animate-pulse flex items-center justify-center rounded-[2.5rem] border border-white/5">
            <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Ativando Inteligência Geográfica...</p>
        </div>
    )
});

export default function PopularFiguresPage() {
    const [loading, setLoading] = useState(true);
    const [figures, setFigures] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>(null);

    const COLORS = ['#f97316', '#3b82f6', '#a855f7', '#10b981', '#f43f5e'];

    // Formata os dados para o Google GeoChart
    const getMapData = () => {
        if (!insights?.analytics?.locations) return [['Estado', 'Visitas']];
        const data = [['Estado', 'Visitas']];
        insights.analytics.locations.forEach((loc: any) => {
            // Google Charts BR precisa do prefixo BR-
            data.push([`BR-${loc.name}`, loc.value]);
        });
        return data;
    };

    const mapOptions = {
        region: 'BR',
        displayMode: 'regions',
        resolution: 'provinces',
        colorAxis: { colors: ['#27272a', '#f97316'] }, // De cinza escuro a Laranja Franga
        backgroundColor: 'transparent',
        datalessRegionColor: '#18181b',
        defaultColor: '#18181b',
        legend: 'none',
        tooltip: { isHtml: true, trigger: 'focus' },
    };

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
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={32} />
                        Centro de Inteligência
                    </h1>
                    <p className="text-zinc-500 mt-1">Dados demográficos, origens de acesso e performance do catálogo.</p>
                </div>
                <button
                    onClick={fetchPopular}
                    className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-sm font-bold transition-all active:scale-95"
                >
                    Atualizar Agora
                </button>
            </div>

            {/* Analytics Dashboard */}
            {insights?.analytics && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Origens de Acesso - Mais largo para leitura de barras */}
                        <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem]">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 pl-2">Origens de Tráfego (Performance de Canal)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={insights.analytics.sources} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={100}
                                            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 900 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px' }}
                                            itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'black' }}
                                        />
                                        <Bar dataKey="value" fill="#f97316" radius={[0, 6, 6, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Dispositivos & Plataformas */}
                        <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 pl-2 mb-4">Perfil de Dispositivo & Plataforma</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={insights.analytics.devices}
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {insights.analytics.devices.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-4">
                                    {insights.analytics.devices.map((item: any, i: number) => (
                                        <div key={item.name} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="text-xs font-black text-zinc-300 uppercase tracking-tight">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-white">{item.value} <span className="text-[10px] text-zinc-500 opacity-50 ml-1">VIEWS</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/5 mt-6">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Navegador vs App</span>
                                    <div className="flex gap-8">
                                        {insights.analytics.platforms.map((p: any) => (
                                            <div key={p.name} className="flex flex-col items-end">
                                                <span className="text-lg font-black text-white leading-none">{p.value}</span>
                                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{p.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Localização (Destaque Inferior com Mapa de Hexágonos) */}
                    <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem]">
                        <div className="flex justify-between items-start mb-8 pl-2">
                            <div className="hidden lg:block" />
                            <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/20">
                                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Live Monitoring</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            {/* Live Leaflet Map Container */}
                            <div className="relative bg-zinc-950/30 rounded-[2.5rem] border border-white/5 overflow-hidden">
                                <LiveMap analyticsData={insights.analytics.locations} />
                            </div>

                            {/* Ranking List */}
                            <div className="space-y-3">
                                {insights.analytics.locations.slice(0, 8).map((loc: any, i: number) => (
                                    <div key={loc.name} className="flex items-center gap-4 bg-zinc-900/40 hover:bg-zinc-900/80 p-4 rounded-3xl border border-white/5 transition-all group">
                                        <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-center font-black text-sm text-zinc-600 group-hover:text-orange-500 transition-colors shadow-inner">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{loc.name || 'Outros'}</p>
                                            <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden shadow-inner">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-1000"
                                                    style={{ width: `${(loc.value / (insights.analytics.locations[0]?.value || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-white leading-none">{loc.value}</p>
                                            <p className="text-[9px] font-black text-zinc-600 uppercase">Visitas</p>
                                        </div>
                                    </div>
                                ))}
                                {insights.analytics.locations.length === 0 && (
                                    <div className="text-center py-20 bg-black/20 rounded-[2.5rem] border border-dashed border-white/5">
                                        <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Aguardando primeiros acessos...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Market Insights Cards (Existing) */}
            {insights && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
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
                            href={`/figura/${fig.slug || fig.id}`}
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
