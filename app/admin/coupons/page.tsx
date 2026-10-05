'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Tag, 
    Calendar, 
    Activity, 
    Check, 
    X, 
    Loader2, 
    Sparkles, 
    Film, 
    Palette, 
    TrendingUp, 
    ArrowRight,
    Eye,
    Copy,
    ExternalLink,
    Search,
    AlertCircle,
    CheckCircle2,
    RotateCw,
    Layers,
    DollarSign,
    ShoppingBag,
    Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CampaignManager from '@/components/Admin/CampaignManager';

interface Cupom {
    id: string;
    codigo: string;
    tipo: 'porcentagem' | 'fixo';
    valor: number;
    usos_restantes: number | null;
    data_validade: string | null;
    valor_minimo: number | null;
    desconto_maximo: number | null;
    ativo: boolean;
    criado_em: string;
    serie_id?: number | null;
    series?: { nome: string } | null;
    figuras_permitidas?: number[] | null;
}

interface PopularFigure {
    id: number;
    nome: string;
    imagem_url?: string;
    views: number;
    vendas: number;
    faturamento: number;
    conversaoPct: number;
    oportunidade: 'demanda_reprimida' | 'alta_conversao' | 'em_observacao';
    precoBase: number;
    serieId?: number | null;
    serieNome: string;
    studioId?: number | null;
    studioNome: string;
}

interface TopSeries {
    id: number;
    nome: string;
    totalViews: number;
    figureCount: number;
    vendas: number;
}

function CouponsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Tab state: 'cupons' | 'campanhas' | 'demanda'
    const initialTab = searchParams.get('tab') === 'demanda' || searchParams.get('tab') === 'popularidade' 
        ? 'demanda' 
        : searchParams.get('tab') === 'campanhas'
        ? 'campanhas'
        : 'cupons';
    const [activeTab, setActiveTab] = useState<'cupons' | 'campanhas' | 'demanda'>(initialTab);

    // Coupons State
    const [cupons, setCupons] = useState<Cupom[]>([]);
    const [series, setSeries] = useState<{ id: number; nome: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCupom, setEditingCupom] = useState<Cupom | null>(null);
    const [saving, setSaving] = useState(false);
    const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [couponSearch, setCouponSearch] = useState('');
    const [previewImage, setPreviewImage] = useState<{ url: string; nome: string } | null>(null);

    // Form states
    const [codigo, setCodigo] = useState('');
    const [tipo, setTipo] = useState<'porcentagem' | 'fixo'>('porcentagem');
    const [valor, setValor] = useState('');
    const [usosRestantes, setUsosRestantes] = useState('');
    const [dataValidade, setDataValidade] = useState('');
    const [valorMinimo, setValorMinimo] = useState('');
    const [descontoMaximo, setDescontoMaximo] = useState('');
    const [serieId, setSerieId] = useState('');
    const [ativo, setAtivo] = useState(true);

    // Figures restrictions states
    const [figurasPermitidas, setFigurasPermitidas] = useState<number[]>([]);
    const [figurasPermitidasObj, setFigurasPermitidasObj] = useState<any[]>([]);
    const [searchFigQuery, setSearchFigQuery] = useState('');
    const [searchFigResults, setSearchFigResults] = useState<any[]>([]);

    // Suggestions state
    const [suggestions, setSuggestions] = useState<any>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

    // Popularidade / Demanda state
    const [popularFigures, setPopularFigures] = useState<PopularFigure[]>([]);
    const [topSeriesList, setTopSeriesList] = useState<TopSeries[]>([]);
    const [popularSummary, setPopularSummary] = useState<any>(null);
    const [loadingPopular, setLoadingPopular] = useState(false);
    const [demandaFilter, setDemandaFilter] = useState<'all' | 'reprimida' | 'alta_conversao'>('all');
    const [demandaSearch, setDemandaSearch] = useState('');

    const changeTab = (tab: 'cupons' | 'campanhas' | 'demanda') => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        params.set('tab', tab);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        if (tab === 'demanda' && popularFigures.length === 0) {
            fetchPopularData();
        }
    };

    const fetchCupons = async () => {
        try {
            const res = await fetch('/api/admin/coupons');
            if (!res.ok) throw new Error('Falha ao carregar cupons');
            const data = await res.json();
            setCupons(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao buscar cupons');
        } finally {
            setLoading(false);
        }
    };

    const fetchSeries = async () => {
        try {
            const res = await fetch('/api/admin/series');
            if (res.ok) {
                const data = await res.json();
                setSeries(data);
            }
        } catch (error) {
            console.error('Erro ao buscar séries:', error);
        }
    };

    const fetchSuggestions = async () => {
        try {
            setLoadingSuggestions(true);
            const res = await fetch('/api/admin/coupons/suggestions');
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data);
            }
        } catch (err) {
            console.error('Erro ao buscar sugestões:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const fetchPopularData = async () => {
        try {
            setLoadingPopular(true);
            const res = await fetch('/api/admin/popular');
            if (res.ok) {
                const data = await res.json();
                setPopularFigures(data.figures || []);
                setTopSeriesList(data.topSeries || []);
                setPopularSummary(data.summary || {});
            } else {
                toast.error('Erro ao carregar dados de demanda');
            }
        } catch (err) {
            console.error('Erro ao buscar dados de popularidade:', err);
            toast.error('Falha na conexão com o servidor');
        } finally {
            setLoadingPopular(false);
        }
    };

    useEffect(() => {
        fetchCupons();
        fetchSeries();
        fetchSuggestions();
        if (initialTab === 'demanda') {
            fetchPopularData();
        }
    }, []);

    const handleSearchFigures = async (q: string) => {
        if (!q.trim()) {
            setSearchFigResults([]);
            return;
        }
        try {
            const res = await fetch(`/api/admin/figures?search=${encodeURIComponent(q)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setSearchFigResults(data.items || []);
            }
        } catch (err) {
            console.error('Erro ao buscar figuras:', err);
        }
    };

    const fetchFigurasPermitidasDetails = async (ids: number[]) => {
        if (!ids || ids.length === 0) return [];
        try {
            const { data, error } = await supabase
                .from('figuras')
                .select(`
                    id,
                    nome,
                    series ( nome ),
                    categorias:series ( categorias ( nome ) )
                `)
                .in('id', ids);

            if (error) {
                console.error("Error fetching figures details:", error);
                return [];
            }
            return (data || []).map((f: any) => {
                const series = Array.isArray(f.series) ? f.series[0] : f.series;
                const catArr = Array.isArray(f.categorias) ? f.categorias : [f.categorias].filter(Boolean);
                const catObj = catArr[0]?.categorias;
                const cat = Array.isArray(catObj) ? catObj[0] : catObj;

                return {
                    id: f.id,
                    nome: f.nome,
                    serie: series?.nome || 'Sem Série',
                    categoria: cat?.nome || 'Outros'
                };
            });
        } catch (err) {
            console.error(err);
            return [];
        }
    };

    const openModal = async (cupom?: Cupom) => {
        setSearchFigQuery('');
        setSearchFigResults([]);

        if (cupom) {
            setEditingCupom(cupom);
            setCodigo(cupom.codigo);
            setTipo(cupom.tipo);
            setValor(cupom.valor.toString());
            setUsosRestantes(cupom.usos_restantes ? cupom.usos_restantes.toString() : '');
            setDataValidade(cupom.data_validade ? new Date(cupom.data_validade).toISOString().slice(0, 16) : '');
            setValorMinimo(cupom.valor_minimo ? cupom.valor_minimo.toString() : '');
            setDescontoMaximo(cupom.desconto_maximo ? cupom.desconto_maximo.toString() : '');
            setSerieId(cupom.serie_id ? cupom.serie_id.toString() : '');
            setAtivo(cupom.ativo);

            const pIds = cupom.figuras_permitidas || [];
            setFigurasPermitidas(pIds);
            if (pIds.length > 0) {
                const details = await fetchFigurasPermitidasDetails(pIds);
                setFigurasPermitidasObj(details);
            } else {
                setFigurasPermitidasObj([]);
            }
        } else {
            setEditingCupom(null);
            setCodigo('');
            setTipo('porcentagem');
            setValor('');
            setUsosRestantes('');
            setDataValidade('');
            setValorMinimo('');
            setDescontoMaximo('');
            setSerieId('');
            setAtivo(true);
            setFigurasPermitidas([]);
            setFigurasPermitidasObj([]);
        }
        setIsModalOpen(true);
    };

    const applySuggestion = async (suggestion: any) => {
        if (!suggestion) return;
        setEditingCupom(null);
        setCodigo(suggestion.codigoSugerido || '');
        setTipo(suggestion.tipo || 'porcentagem');
        setValor(suggestion.valorSugerido?.toString() || '10');
        setUsosRestantes('50');

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        setDataValidade(expiry.toISOString().slice(0, 16));

        setValorMinimo('');
        setDescontoMaximo('');
        setSerieId(suggestion.serieId ? suggestion.serieId.toString() : '');
        setAtivo(true);

        const pIds = suggestion.figurasPermitidas || [];
        setFigurasPermitidas(pIds);
        if (pIds.length > 0) {
            const details = await fetchFigurasPermitidasDetails(pIds);
            setFigurasPermitidasObj(details);
        } else {
            setFigurasPermitidasObj([]);
        }
        setIsModalOpen(true);
    };

    // Criar Cupom direcionado para uma figura com demanda reprimida
    const createCouponForFigure = (fig: PopularFigure, discountPct: number = 15) => {
        const cleanName = fig.nome.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
        setEditingCupom(null);
        setCodigo(`${cleanName}${discountPct}`);
        setTipo('porcentagem');
        setValor(discountPct.toString());
        setUsosRestantes('30');

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        setDataValidade(expiry.toISOString().slice(0, 16));

        setValorMinimo('');
        setDescontoMaximo('');
        setSerieId('');
        setAtivo(true);

        setFigurasPermitidas([fig.id]);
        setFigurasPermitidasObj([{
            id: fig.id,
            nome: fig.nome,
            serie: fig.serieNome,
            categoria: 'Destaque'
        }]);
        setIsModalOpen(true);
    };

    // Criar Cupom direcionado para uma Série / Universo em alta
    const createCouponForSeries = (s: TopSeries, discountPct: number = 10) => {
        const cleanName = s.nome.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
        setEditingCupom(null);
        setCodigo(`${cleanName}${discountPct}`);
        setTipo('porcentagem');
        setValor(discountPct.toString());
        setUsosRestantes('50');

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        setDataValidade(expiry.toISOString().slice(0, 16));

        setValorMinimo('');
        setDescontoMaximo('');
        setSerieId(s.id.toString());
        setAtivo(true);

        setFigurasPermitidas([]);
        setFigurasPermitidasObj([]);
        setIsModalOpen(true);
    };

    const copyCouponLink = (code: string) => {
        const url = `https://frangatoys.com.br/?cupom=${encodeURIComponent(code)}`;
        navigator.clipboard.writeText(url);
        toast.success(`Link com cupom "${code}" copiado!`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                codigo: codigo.trim().toUpperCase(),
                tipo,
                valor: parseFloat(valor),
                usos_restantes: usosRestantes ? parseInt(usosRestantes) : null,
                data_validade: dataValidade ? new Date(dataValidade).toISOString() : null,
                valor_minimo: valorMinimo ? parseFloat(valorMinimo) : null,
                desconto_maximo: descontoMaximo && tipo === 'porcentagem' ? parseFloat(descontoMaximo) : null,
                serie_id: serieId ? parseInt(serieId) : null,
                ativo,
                figuras_permitidas: figurasPermitidas.length > 0 ? figurasPermitidas : null,
            };

            const url = editingCupom 
                ? `/api/admin/coupons/${editingCupom.id}`
                : '/api/admin/coupons';

            const method = editingCupom ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao salvar cupom');
            }

            toast.success(editingCupom ? 'Cupom atualizado!' : 'Cupom criado com sucesso!');
            setIsModalOpen(false);
            fetchCupons();
            // Se foi criado a partir da demanda, muda para a aba de cupons para visualizar
            if (activeTab === 'demanda') {
                setActiveTab('cupons');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
        
        try {
            const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao excluir');
            toast.success('Cupom excluído');
            fetchCupons();
        } catch (error: any) {
            toast.error('Erro ao excluir cupom');
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Filtros de Cupons
    const filteredCupons = useMemo(() => {
        return cupons.filter(c => {
            const matchesSearch = c.codigo.toLowerCase().includes(couponSearch.toLowerCase()) ||
                (c.series?.nome || '').toLowerCase().includes(couponSearch.toLowerCase());
            
            if (!matchesSearch) return false;
            if (couponFilter === 'active') return c.ativo;
            if (couponFilter === 'inactive') return !c.ativo;
            return true;
        });
    }, [cupons, couponSearch, couponFilter]);

    // Filtros de Demanda
    const filteredDemandaFigures = useMemo(() => {
        return popularFigures.filter(f => {
            const matchesSearch = f.nome.toLowerCase().includes(demandaSearch.toLowerCase()) ||
                f.serieNome.toLowerCase().includes(demandaSearch.toLowerCase()) ||
                f.studioNome.toLowerCase().includes(demandaSearch.toLowerCase());
            
            if (!matchesSearch) return false;
            if (demandaFilter === 'reprimida') return f.oportunidade === 'demanda_reprimida';
            if (demandaFilter === 'alta_conversao') return f.oportunidade === 'alta_conversao';
            return true;
        });
    }, [popularFigures, demandaSearch, demandaFilter]);

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Tag className="text-orange-500" size={28} />
                        Promoções & Marketing
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">
                        Cupons promocionais, promoções por estúdio/série no catálogo e radar de demanda reprimida.
                    </p>
                </div>

                {activeTab === 'cupons' && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => openModal()}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.25)] cursor-pointer"
                        >
                            <Plus size={16} /> Novo Cupom
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-950/70 border border-zinc-900 rounded-2xl w-fit">
                <button
                    onClick={() => changeTab('cupons')}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                        activeTab === 'cupons'
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Tag size={14} />
                    Cupons & Códigos
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeTab === 'cupons' ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                        {cupons.filter(c => c.ativo).length}
                    </span>
                </button>

                <button
                    onClick={() => changeTab('campanhas')}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                        activeTab === 'campanhas'
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Flame size={14} />
                    Promoções no Catálogo
                </button>

                <button
                    onClick={() => changeTab('demanda')}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                        activeTab === 'demanda'
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <TrendingUp size={14} />
                    Radar de Demanda
                    {popularSummary?.demandaReprimidaCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-red-500/20 border border-red-500/30 text-red-400 font-bold">
                            {popularSummary.demandaReprimidaCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ========================================================================= */}
            {/* ABA 1: CUPONS & CÓDIGOS */}
            {/* ========================================================================= */}
            {activeTab === 'cupons' && (
                <div className="space-y-6">
                    {/* Filtros da Lista de Cupons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input
                                type="text"
                                value={couponSearch}
                                onChange={(e) => setCouponSearch(e.target.value)}
                                placeholder="Buscar por código ou série..."
                                className="w-full bg-zinc-950/60 border border-zinc-900 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/60 border border-zinc-900 rounded-xl w-fit">
                            <button
                                onClick={() => setCouponFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    couponFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Todos ({cupons.length})
                            </button>
                            <button
                                onClick={() => setCouponFilter('active')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    couponFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Ativos ({cupons.filter(c => c.ativo).length})
                            </button>
                            <button
                                onClick={() => setCouponFilter('inactive')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    couponFilter === 'inactive' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Inativos ({cupons.filter(c => !c.ativo).length})
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={36} className="animate-spin text-orange-500" />
                        </div>
                    ) : filteredCupons.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/40 rounded-3xl border border-zinc-900 border-dashed">
                            <Tag size={40} className="mb-3 opacity-20" />
                            <p className="font-bold tracking-widest uppercase text-xs">Nenhum cupom encontrado</p>
                            <button
                                onClick={() => openModal()}
                                className="mt-4 text-xs font-bold text-orange-400 hover:underline"
                            >
                                + Criar o primeiro cupom
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredCupons.map(cupom => (
                                <div 
                                    key={cupom.id} 
                                    className={`bg-zinc-950/60 border ${cupom.ativo ? 'border-zinc-900 hover:border-zinc-800' : 'border-red-950/60 opacity-60'} rounded-2xl p-5 relative group flex flex-col gap-3 transition-all`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-black text-white tracking-tight uppercase font-mono">
                                                    {cupom.codigo}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                    cupom.ativo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                    {cupom.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-orange-400">
                                                {cupom.tipo === 'porcentagem' ? `${cupom.valor}% OFF` : `R$ ${cupom.valor.toFixed(2)} OFF`}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => copyCouponLink(cupom.codigo)} 
                                                title="Copiar link com este cupom para enviar ao cliente"
                                                className="p-2 bg-zinc-900 hover:bg-orange-500/20 text-zinc-400 hover:text-orange-400 rounded-lg transition-all"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button 
                                                onClick={() => openModal(cupom)} 
                                                title="Editar cupom"
                                                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(cupom.id)} 
                                                title="Excluir cupom"
                                                className="p-2 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Restrições */}
                                    <div className="text-[11px] text-zinc-400 space-y-0.5">
                                        {cupom.series?.nome && (
                                            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                                                <Film size={12} />
                                                <span>Série: {cupom.series.nome}</span>
                                            </div>
                                        )}
                                        {cupom.figuras_permitidas && cupom.figuras_permitidas.length > 0 && (
                                            <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                                                <ShoppingBag size={12} />
                                                <span>Restrito a {cupom.figuras_permitidas.length} figuras</span>
                                            </div>
                                        )}
                                        {cupom.valor_minimo && (
                                            <div className="text-zinc-500 text-[10px]">
                                                Mínimo no carrinho: R$ {cupom.valor_minimo.toFixed(2)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer do Card */}
                                    <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-zinc-900 text-[10px]">
                                        <div className="flex items-center gap-1 text-zinc-500">
                                            <Activity size={11} />
                                            <span>{cupom.usos_restantes !== null ? `${cupom.usos_restantes} restantes` : 'Ilimitado'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-zinc-500 justify-end">
                                            <Calendar size={11} />
                                            <span>{cupom.data_validade ? formatDate(cupom.data_validade) : 'Sem validade'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* ABA 2: CAMPANHAS NO CATÁLOGO */}
            {/* ========================================================================= */}
            {activeTab === 'campanhas' && (
                <div className="pt-2 animate-in fade-in duration-300">
                    <CampaignManager hideHeader={true} />
                </div>
            )}

            {/* ========================================================================= */}
            {/* ABA 3: RADAR DE DEMANDA & OPORTUNIDADES */}
            {/* ========================================================================= */}
            {activeTab === 'demanda' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Resumo Rápido e Limpo */}
                    {popularSummary && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-2xl">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Total de Views</span>
                                <span className="text-xl font-black text-white mt-1 block">
                                    {popularSummary.totalAcessos?.toLocaleString('pt-BR') || 0}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">Interesse no acervo</span>
                            </div>

                            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-2xl">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Modelos Acessados</span>
                                <span className="text-xl font-black text-blue-400 mt-1 block">
                                    {popularSummary.totalFigurasComViews || 0}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">Peças visualizadas</span>
                            </div>

                            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-2xl">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Demanda Reprimida</span>
                                <span className="text-xl font-black text-red-400 mt-1 block">
                                    {popularSummary.demandaReprimidaCount || 0}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">&gt;10 views e 0 vendas</span>
                            </div>

                            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-2xl">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Série Líder</span>
                                <span className="text-xl font-black text-orange-400 mt-1 block truncate" title={popularSummary.topSerie?.nome}>
                                    {popularSummary.topSerie?.nome || '--'}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">
                                    {popularSummary.topSerie?.totalViews || 0} views
                                </span>
                            </div>
                        </div>
                    )}

                    {/* WIDGET DE SUGESTÕES INTELIGENTES (1-CLIQUE) */}
                    {suggestions && (suggestions.topFiguresCombo || suggestions.topSeriesPromo || suggestions.topStudioPromo) && (
                        <div className="bg-gradient-to-br from-zinc-950/80 via-zinc-900/40 to-zinc-950 border border-zinc-850 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider mb-1.5">
                                        <Sparkles size={12} className="animate-pulse" /> 1-Click Promo
                                    </div>
                                    <h3 className="text-lg font-black text-white tracking-tight">
                                        Oportunidades Recomendadas pelo Sistema
                                    </h3>
                                    <p className="text-xs text-zinc-500">
                                        Clique em um dos combos abaixo para gerar o cupom otimizado automaticamente.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {suggestions.topFiguresCombo && (
                                    <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between transition-all group">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    {suggestions.topFiguresCombo.badge}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-400">
                                                    {suggestions.topFiguresCombo.totalViews} views
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                                                {suggestions.topFiguresCombo.titulo}
                                            </h4>
                                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                                                {suggestions.topFiguresCombo.descricao}
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2 mt-4">
                                            <span className="text-xs font-mono font-black text-amber-400">
                                                {suggestions.topFiguresCombo.codigoSugerido} ({suggestions.topFiguresCombo.valorSugerido}% OFF)
                                            </span>
                                            <button
                                                onClick={() => applySuggestion(suggestions.topFiguresCombo)}
                                                className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                            >
                                                Ativar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {suggestions.topSeriesPromo && (
                                    <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between transition-all group">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    {suggestions.topSeriesPromo.badge}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-400">
                                                    {suggestions.topSeriesPromo.totalViews} views
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                                                {suggestions.topSeriesPromo.titulo}
                                            </h4>
                                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                                                {suggestions.topSeriesPromo.descricao}
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2 mt-4">
                                            <span className="text-xs font-mono font-black text-blue-400">
                                                {suggestions.topSeriesPromo.codigoSugerido} ({suggestions.topSeriesPromo.valorSugerido}% OFF)
                                            </span>
                                            <button
                                                onClick={() => applySuggestion(suggestions.topSeriesPromo)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                            >
                                                Ativar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {suggestions.topStudioPromo && (
                                    <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between transition-all group">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    {suggestions.topStudioPromo.badge}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-400">
                                                    {suggestions.topStudioPromo.totalViews} views
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-black text-white group-hover:text-purple-400 transition-colors">
                                                {suggestions.topStudioPromo.titulo}
                                            </h4>
                                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                                                {suggestions.topStudioPromo.descricao}
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2 mt-4">
                                            <span className="text-xs font-mono font-black text-purple-400">
                                                {suggestions.topStudioPromo.codigoSugerido} ({suggestions.topStudioPromo.valorSugerido}% OFF)
                                            </span>
                                            <button
                                                onClick={() => applySuggestion(suggestions.topStudioPromo)}
                                                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                            >
                                                Ativar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Séries em Alta (Universos Desejados) */}
                    {topSeriesList.length > 0 && (
                        <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Film size={18} className="text-orange-500" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                        Universos & Séries Mais Acessados
                                    </h3>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">
                                    Top {topSeriesList.length} do catálogo
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {topSeriesList.slice(0, 4).map(s => (
                                    <div key={s.id} className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-2xl flex flex-col justify-between group hover:border-zinc-700 transition-colors">
                                        <div>
                                            <h4 className="text-sm font-black text-white group-hover:text-orange-400 transition-colors truncate">
                                                {s.nome}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-bold">
                                                <span>{s.totalViews} views</span>
                                                <span>•</span>
                                                <span>{s.figureCount} modelos</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => createCouponForSeries(s, 10)}
                                            className="mt-3 w-full py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                        >
                                            + Criar Cupom 10%
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Figuras com Demanda & Oportunidades */}
                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={18} className="text-orange-500" />
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                        Radar de Figuras com Interesse
                                    </h3>
                                    <p className="text-[10px] text-zinc-500">
                                        Identifique peças visualizadas que precisam de estímulo de preço para fechar venda.
                                    </p>
                                </div>
                            </div>

                            {/* Filtros */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                    <input
                                        type="text"
                                        value={demandaSearch}
                                        onChange={(e) => setDemandaSearch(e.target.value)}
                                        placeholder="Filtrar figura..."
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50"
                                    />
                                </div>

                                <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                                    <button
                                        onClick={() => setDemandaFilter('all')}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            demandaFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Todas ({popularFigures.length})
                                    </button>
                                    <button
                                        onClick={() => setDemandaFilter('reprimida')}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            demandaFilter === 'reprimida' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Reprimida (0 vendas)
                                    </button>
                                    <button
                                        onClick={() => setDemandaFilter('alta_conversao')}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            demandaFilter === 'alta_conversao' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Alta Conversão
                                    </button>
                                </div>
                            </div>
                        </div>

                        {loadingPopular ? (
                            <div className="py-16 flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-orange-500" />
                            </div>
                        ) : filteredDemandaFigures.length === 0 ? (
                            <div className="py-12 text-center text-zinc-600 font-bold uppercase tracking-widest text-xs">
                                Nenhuma figura encontrada com estes filtros
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            <th className="py-3 px-3">Figura</th>
                                            <th className="py-3 px-3">Série & Estúdio</th>
                                            <th className="py-3 px-3 text-center">Acessos</th>
                                            <th className="py-3 px-3 text-center">Vendas</th>
                                            <th className="py-3 px-3 text-center">Diagnóstico</th>
                                            <th className="py-3 px-3 text-right">Ação Direta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900/60 font-medium text-zinc-300">
                                        {filteredDemandaFigures.map(fig => (
                                            <tr key={fig.id} className="hover:bg-zinc-900/20 transition-colors">
                                                <td className="py-3 px-3">
                                                    {fig.imagem_url ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewImage({ url: fig.imagem_url!, nome: fig.nome })}
                                                            className="text-left font-bold text-white hover:text-orange-400 transition-colors cursor-pointer group flex items-center gap-1.5"
                                                            title="Clique para ver a foto do colecionável"
                                                        >
                                                            <span className="group-hover:underline text-xs">{fig.nome}</span>
                                                            <Eye size={12} className="opacity-0 group-hover:opacity-100 text-orange-400 transition-opacity shrink-0" />
                                                        </button>
                                                    ) : (
                                                        <div className="font-bold text-white text-xs">{fig.nome}</div>
                                                    )}
                                                    {fig.precoBase > 0 && (
                                                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                                                            Ref: R$ {fig.precoBase}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="text-zinc-300 font-bold">{fig.serieNome}</span>
                                                    <span className="block text-[10px] text-zinc-500">{fig.studioNome}</span>
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold font-mono text-zinc-200">
                                                    {fig.views}
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold font-mono">
                                                    {fig.vendas > 0 ? (
                                                        <span className="text-emerald-400 font-black">{fig.vendas} pçs</span>
                                                    ) : (
                                                        <span className="text-zinc-600">0</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {fig.oportunidade === 'demanda_reprimida' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400">
                                                            <AlertCircle size={10} /> Demanda Reprimida
                                                        </span>
                                                    ) : fig.oportunidade === 'alta_conversao' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                            <CheckCircle2 size={10} /> Alta Conversão ({fig.conversaoPct}%)
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-500 text-[10px]">
                                                            {fig.views} views • {fig.vendas} vendas
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <button
                                                        onClick={() => createCouponForFigure(fig, 15)}
                                                        className="px-3 py-1 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                                    >
                                                        + Criar Cupom 15%
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Criação / Edição de Cupom */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/30">
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <Tag size={18} className="text-orange-500" />
                                    {editingCupom ? 'Editar Cupom' : 'Novo Cupom Promocional'}
                                </h2>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                    Configure as regras de desconto e restrições
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Código do Cupom</label>
                                    <input
                                        required
                                        type="text"
                                        value={codigo}
                                        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                        placeholder="Ex: PROMO15"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold placeholder-zinc-700 uppercase text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Tipo de Desconto</label>
                                    <select
                                        value={tipo}
                                        onChange={(e) => setTipo(e.target.value as any)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold text-sm cursor-pointer"
                                    >
                                        <option value="porcentagem">Porcentagem (%)</option>
                                        <option value="fixo">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                                        Valor {tipo === 'porcentagem' ? '(%)' : '(R$)'}
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={valor}
                                        onChange={(e) => setValor(e.target.value)}
                                        placeholder="15"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Usos e Validade */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Limite de Usos</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={usosRestantes}
                                        onChange={(e) => setUsosRestantes(e.target.value)}
                                        placeholder="Ilimitado"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Validade (Opcional)</label>
                                    <input
                                        type="datetime-local"
                                        value={dataValidade}
                                        onChange={(e) => setDataValidade(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold text-xs [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {/* Valores Condicionais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Valor Mínimo do Pedido (Opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={valorMinimo}
                                        onChange={(e) => setValorMinimo(e.target.value)}
                                        placeholder="Ex: R$ 100.00"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Teto Máximo de Desconto (Opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={descontoMaximo}
                                        onChange={(e) => setDescontoMaximo(e.target.value)}
                                        placeholder="Ex: R$ 50.00"
                                        disabled={tipo !== 'porcentagem'}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold placeholder-zinc-700 text-sm disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Restrições (Série e Figuras) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Restrição de Série</label>
                                    <select
                                        value={serieId}
                                        onChange={(e) => setSerieId(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold text-sm cursor-pointer"
                                    >
                                        <option value="">Qualquer Série (Sem restrição)</option>
                                        {series.map(s => (
                                            <option key={s.id} value={s.id}>{s.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Restringir a Figuras Específicas</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar figura..."
                                            value={searchFigQuery}
                                            onChange={(e) => {
                                                setSearchFigQuery(e.target.value);
                                                handleSearchFigures(e.target.value);
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                        />
                                        {searchFigResults.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-[60] max-h-48 overflow-y-auto">
                                                {searchFigResults.map((fig: any) => (
                                                    <button
                                                        key={fig.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!figurasPermitidas.includes(fig.id)) {
                                                                setFigurasPermitidas([...figurasPermitidas, fig.id]);
                                                                setFigurasPermitidasObj([...figurasPermitidasObj, fig]);
                                                            }
                                                            setSearchFigQuery('');
                                                            setSearchFigResults([]);
                                                        }}
                                                        className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-900 text-xs font-bold text-white transition-colors border-b border-zinc-900 last:border-0"
                                                    >
                                                        {fig.nome} ({fig.categoria} - {fig.serie})
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Figuras Selecionadas & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
                                <div>
                                    {figurasPermitidasObj.length > 0 ? (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                                                Figuras Vinculadas ({figurasPermitidasObj.length})
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                                                {figurasPermitidasObj.map((fig: any) => (
                                                    <div key={fig.id} className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full text-xs font-bold text-orange-400">
                                                        <span className="truncate max-w-[180px]">{fig.nome}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFigurasPermitidas(figurasPermitidas.filter(id => id !== fig.id));
                                                                setFigurasPermitidasObj(figurasPermitidasObj.filter(f => f.id !== fig.id));
                                                            }}
                                                            className="hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-red-500/10"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center p-3 border border-zinc-850 border-dashed rounded-xl text-zinc-600 text-[10px] font-bold uppercase tracking-wider select-none min-h-[48px]">
                                            Válido para todo o catálogo
                                        </div>
                                    )}
                                </div>

                                <div 
                                    className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors" 
                                    onClick={() => setAtivo(!ativo)}
                                >
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${ativo ? 'bg-orange-500 border-orange-500' : 'bg-black border-zinc-700'}`}>
                                        {ativo && <Check size={12} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">Cupom Ativo</p>
                                        <p className="text-[10px] font-medium text-zinc-500">Permitir uso no checkout</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botões do Modal */}
                            <div className="pt-3 flex gap-3 border-t border-zinc-850">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-colors flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : (editingCupom ? 'Atualizar Cupom' : 'Criar Cupom')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Preview de Imagem */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative max-w-2xl w-full bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-black text-sm text-white truncate pr-4">{previewImage.nome}</h3>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 flex justify-center bg-black/40">
                            <img
                                src={previewImage.url}
                                alt={previewImage.nome}
                                className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-xl border border-zinc-900"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminCouponsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
            </div>
        }>
            <CouponsContent />
        </Suspense>
    );
}
