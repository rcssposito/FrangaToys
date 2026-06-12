'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
    ArrowLeft, 
    Save, 
    DollarSign, 
    Star, 
    Box, 
    Loader2, 
    Trash, 
    Plus, 
    Instagram, 
    Globe, 
    ExternalLink, 
    Search, 
    ImageIcon, 
    Sparkles, 
    ShoppingBag,
    Settings,
    TrendingUp,
    Percent,
    ChevronDown,
    MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';

import { clsx } from 'clsx';

interface Studio {
    id: number;
    nome: string;
    custo_mensal: number | '';
    qtd_display: number;
    qualidade: number;
    observacao: string;
    logo_url?: string;
    instagram_handle?: string;
    social_url?: string;
    ativo?: boolean;
    merchant?: boolean;
    total_figuras?: number;
    total_vendas?: number;
    total_itens?: number;
    receita_bruta?: number;
    lucro_liquido?: number;
    figuras_vendidas?: number;
    conversao_acervo?: number;
    margem_lucro?: number;
    ticket_medio?: number;
}

export default function StudiosPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newStudioName, setNewStudioName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'receita_bruta' | 'lucro_liquido' | 'total_figuras' | 'custo_mensal' | 'nome'>('receita_bruta');
    const [expandedStudioIds, setExpandedStudioIds] = useState<Record<number, boolean>>({});
    
    const { hasRole, user } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && !canEdit) {
            toast.error('Acesso negado');
            router.push('/admin');
        }
    }, [user, loading, canEdit, router]);

    useEffect(() => {
        if (canEdit) {
            fetchStudios();
        }
    }, [canEdit]);

    const fetchStudios = async () => {
        try {
            const res = await fetch('/api/admin/studios', { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) setStudios(data);
        } catch (error) {
            toast.error('Erro ao carregar estúdios');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (studio: Studio) => {
        setSaving(studio.id);
        try {
            const payload = {
                ...studio,
                custo_mensal: studio.custo_mensal === '' ? 0 : studio.custo_mensal
            };

            const res = await fetch('/api/admin/studios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Falha ao salvar');
        } catch (error) {
            toast.error('Erro ao salvar alterações');
        } finally {
            setSaving(null);
        }
    };

    const handleAddStudio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudioName.trim()) return;

        setIsAdding(true);
        try {
            const res = await fetch('/api/admin/studios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: newStudioName.trim() })
            });

            if (!res.ok) throw new Error('Falha ao adicionar estúdio');

            toast.success('Estúdio adicionado!');
            setNewStudioName('');
            fetchStudios();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao adicionar estúdio');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: number, count: number = 0) => {
        if (count > 0) {
            toast.error(`Não é possível excluir. Existem ${count} figuras vinculadas.`);
            return;
        }
        if (!confirm('Você tem certeza que deseja excluir este estúdio?')) return;

        try {
            const res = await fetch(`/api/admin/studios?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao excluir o estúdio');
            toast.success('Estúdio removido!');
            fetchStudios();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir estúdio');
        }
    };

    const handleChange = (id: number, field: keyof Studio, value: any) => {
        setStudios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const toggleExpand = (id: number) => {
        setExpandedStudioIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredAndSortedStudios = studios
        .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'nome') {
                return a.nome.localeCompare(b.nome);
            }
            const valA = Number(a[sortBy]) || 0;
            const valB = Number(b[sortBy]) || 0;
            return valB - valA; // Descending for metrics and costs
        });

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-8 relative overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 transition-all duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-5">
                        <Link href="/admin" className="p-3 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 rounded-2xl transition-all shadow-lg text-zinc-500 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter text-white">Estúdios <span className="text-blue-500">Parceiros</span></h1>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Gestão de Branding, Custos e BI.</p>
                        </div>
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
                        {/* Search Bar */}
                        <div className="relative group flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar estúdio..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 p-3.5 pl-12 rounded-2xl outline-none text-sm transition-all shadow-inner font-medium text-zinc-300"
                            />
                        </div>
                        {/* Sort Selector */}
                        <div className="relative group min-w-[180px]">
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 p-3.5 pr-10 rounded-2xl outline-none text-sm transition-all shadow-inner font-medium text-zinc-300 appearance-none cursor-pointer"
                            >
                                <option value="receita_bruta" className="bg-zinc-950">Faturamento Bruto</option>
                                <option value="lucro_liquido" className="bg-zinc-950">Lucro Líquido Real</option>
                                <option value="total_figuras" className="bg-zinc-950">Tamanho do Acervo</option>
                                <option value="custo_mensal" className="bg-zinc-950">Custo Mensal</option>
                                <option value="nome" className="bg-zinc-950">Nome do Estúdio</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Financial Summary */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-[2rem] p-6 flex items-center gap-6 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Custo Mensal Ativo</p>
                                <h3 className="text-2xl font-black text-white tracking-tighter">
                                    R$ {studios.filter(s => s.ativo).reduce((acc, s) => acc + (Number(s.custo_mensal) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-[2rem] p-6 flex items-center gap-6 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                <Box size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total de Parceiros</p>
                                <h3 className="text-2xl font-black text-white tracking-tighter">
                                    {studios.length} <span className="text-xs font-bold text-zinc-600 ml-1">({studios.filter(s => s.ativo).length} ativos | {studios.filter(s => s.merchant).length} merchants)</span>
                                </h3>
                            </div>
                        </div>

                        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-[2rem] p-6 flex items-center gap-6 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Acervo Ativo</p>
                                <h3 className="text-2xl font-black text-white tracking-tighter">
                                    {studios.filter(s => s.merchant).reduce((acc, s) => acc + (s.total_figuras || 0), 0)} 
                                    <span className="text-sm font-bold text-zinc-600 ml-1">figuras</span>
                                </h3>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="py-24 flex justify-center w-full"><Loader2 className="animate-spin text-blue-500 w-12 h-12" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                        {/* New Studio Card */}
                        {hasRole('admin') && (
                            <div className="bg-zinc-950/40 border-2 border-dashed border-zinc-900 rounded-[2.5rem] p-8 flex flex-col justify-center items-center gap-6 hover:border-blue-500/30 transition-all group backdrop-blur-sm">
                                <div className="w-16 h-16 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-500 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all shadow-lg">
                                    {isAdding ? <Loader2 className="animate-spin" /> : <Plus size={32} />}
                                </div>
                                <div className="text-center w-full">
                                    <input 
                                        type="text"
                                        value={newStudioName}
                                        onChange={e => setNewStudioName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddStudio(e as any); }}
                                        placeholder="Nome do Novo Parceiro"
                                        className="bg-transparent text-center font-black text-xl outline-none text-zinc-200 placeholder:text-zinc-700 w-full mb-2"
                                    />
                                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Pressione Enter para salvar</p>
                                </div>
                            </div>
                        )}

                        {filteredAndSortedStudios.map(studio => {
                            const isExpanded = !!expandedStudioIds[studio.id];
                            
                            const revenue = studio.receita_bruta || 0;
                            const profit = studio.lucro_liquido || 0;
                            const salesCount = studio.total_vendas || 0;
                            
                            let healthLabel = 'Sem Vendas';
                            let healthColor = 'border-zinc-800 text-zinc-500 bg-zinc-900/10 shadow-[0_0_10px_rgba(113,113,122,0.05)]';
                            
                            if (salesCount > 0) {
                                if (profit > 1000) {
                                    healthLabel = 'Altamente Lucrativo';
                                    healthColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
                                } else if (profit > 0) {
                                    healthLabel = 'Lucrativo';
                                    healthColor = 'border-emerald-600/20 text-emerald-500 bg-emerald-600/5 shadow-[0_0_10px_rgba(16,185,129,0.05)]';
                                } else if (profit === 0) {
                                    healthLabel = 'Break-even';
                                    healthColor = 'border-blue-500/20 text-blue-400 bg-blue-500/5';
                                } else {
                                    healthLabel = 'Operando em Prejuízo';
                                    healthColor = 'border-rose-500/30 text-rose-400 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
                                }
                            }

                            return (
                                <div key={studio.id} className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 relative group hover:border-blue-500/20 transition-all duration-500">
                                    <div className={clsx(
                                        "absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-[2.5rem]",
                                        profit < 0 && salesCount > 0 && "via-rose-500/20"
                                    )} />
                                    
                                    <div className={clsx("flex justify-between items-start transition-all duration-500", !studio.ativo && "opacity-45")}>
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shadow-inner group-hover:border-blue-500/30 transition-all">
                                                {studio.logo_url ? (
                                                    <img src={studio.logo_url} alt={studio.nome} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="font-black text-xl text-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950 w-full h-full flex items-center justify-center">
                                                        {studio.nome.slice(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {!studio.ativo && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-black uppercase text-white/50 tracking-widest">OFF</div>}
                                            </div>
                                            
                                            <div className="flex flex-col">
                                                <div className="font-black text-lg tracking-tight text-white leading-tight flex items-center gap-2 max-w-[180px] break-words">
                                                    {studio.nome}
                                                </div>
                                                <div className="flex gap-2 mt-1.5">
                                                    {studio.instagram_handle && (
                                                        <a href={`https://instagram.com/${studio.instagram_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-1 bg-zinc-950/50 rounded-lg text-zinc-500 hover:text-pink-500 transition-colors border border-zinc-800/30">
                                                            <Instagram size={12} />
                                                        </a>
                                                    )}
                                                    {studio.social_url && (
                                                        <a href={studio.social_url} target="_blank" rel="noopener noreferrer" className="p-1 bg-zinc-950/50 rounded-lg text-zinc-500 hover:text-blue-400 transition-colors border border-zinc-800/30">
                                                            <Globe size={12} />
                                                        </a>
                                                    )}
                                                    {studio.observacao && (
                                                        <div className="p-1 bg-zinc-950/50 rounded-lg text-zinc-500 border border-zinc-800/30 group/obs relative cursor-help" title={studio.observacao}>
                                                            <MessageSquare size={12} />
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/obs:block bg-zinc-950 text-zinc-300 text-[10px] p-2 rounded-lg border border-zinc-800 w-48 shadow-2xl z-50 text-center font-medium normal-case tracking-normal">
                                                                {studio.observacao}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {/* Merchant Toggle */}
                                            <button 
                                                onClick={() => {
                                                    const newVal = !studio.merchant;
                                                    handleChange(studio.id, 'merchant', newVal);
                                                    handleUpdate({ ...studio, merchant: newVal });
                                                }}
                                                className={clsx(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border cursor-pointer",
                                                    studio.merchant 
                                                        ? "bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
                                                        : "bg-zinc-950 border-zinc-900 text-zinc-600 hover:text-zinc-400"
                                                )}
                                                title={studio.merchant ? "Vitrine Ativa (Figuras Visíveis)" : "Vitrine Inativa (Figuras Ocultas)"}
                                            >
                                                <ShoppingBag size={15} />
                                            </button>

                                            {/* Active Switch Toggle */}
                                            <button 
                                                onClick={() => {
                                                    const newVal = !studio.ativo;
                                                    handleChange(studio.id, 'ativo', newVal);
                                                    handleUpdate({ ...studio, ativo: newVal });
                                                }}
                                                className={clsx(
                                                    "w-10 h-6 rounded-full p-0.5 transition-all duration-300 relative border border-transparent cursor-pointer",
                                                    studio.ativo ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-zinc-900 border-zinc-800"
                                                )}
                                                title={studio.ativo ? "Operação Ativa (Gerando Custos)" : "Operação Pausada"}
                                            >
                                                <div className={clsx(
                                                    "w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                                                    studio.ativo ? "translate-x-4" : "translate-x-0"
                                                )} />
                                            </button>

                                            {/* Settings Expand Button */}
                                            <button 
                                                onClick={() => toggleExpand(studio.id)}
                                                className={clsx(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border cursor-pointer",
                                                    isExpanded 
                                                        ? "bg-blue-500/10 border-blue-500/40 text-blue-400" 
                                                        : "bg-zinc-950 border-zinc-900 text-zinc-600 hover:text-zinc-400"
                                                )}
                                                title="Configurações e Links"
                                            >
                                                <Settings size={15} />
                                            </button>

                                            {saving === studio.id ? (
                                                <div className="w-9 h-9 flex items-center justify-center"><Loader2 size={15} className="text-blue-500 animate-spin" /></div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleDelete(studio.id, studio.total_figuras || 0)} 
                                                    className="text-zinc-600 hover:text-red-500 transition-colors p-2 bg-zinc-950 border border-zinc-900 hover:border-red-500/20 rounded-xl cursor-pointer"
                                                    title="Remover Estúdio"
                                                >
                                                    <Trash size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Financial Health Pill */}
                                    {salesCount > 0 && (
                                        <div className={clsx(
                                            "w-full py-1.5 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest text-center transition-all",
                                            healthColor
                                        )}>
                                            {healthLabel}
                                        </div>
                                    )}

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Faturamento */}
                                        <div className="bg-zinc-950/45 border border-zinc-900/60 rounded-3xl p-4 flex flex-col justify-between min-h-[90px] shadow-inner relative hover:bg-zinc-950/70 transition-colors group/metric">
                                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-600 flex items-center gap-1.5">
                                                <TrendingUp size={10} className="text-zinc-500" /> FATURAMENTO
                                            </span>
                                            <div className="mt-2.5">
                                                <div className="font-black text-lg tracking-tighter text-white">
                                                    R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[9px] font-bold text-zinc-500 mt-0.5">
                                                    {salesCount} vendas ({studio.total_itens || 0} pçs)
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lucro Real */}
                                        <div className="bg-zinc-950/45 border border-zinc-900/60 rounded-3xl p-4 flex flex-col justify-between min-h-[90px] shadow-inner relative hover:bg-zinc-950/70 transition-colors group/metric">
                                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-600 flex items-center gap-1.5">
                                                <DollarSign size={10} className="text-zinc-500" /> LUCRO REAL
                                            </span>
                                            <div className="mt-2.5">
                                                <div className={clsx(
                                                    "font-black text-lg tracking-tighter",
                                                    profit > 0 ? "text-emerald-400" : profit < 0 ? "text-rose-500" : "text-white"
                                                )}>
                                                    R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[9px] font-bold text-zinc-500 mt-0.5 flex items-center gap-1">
                                                    <Percent size={8} /> {(studio.margem_lucro || 0).toFixed(1)}% margem
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acervo */}
                                        <Link 
                                            href={`/admin/figures?studio=${studio.id}`}
                                            className="bg-zinc-950/45 border border-zinc-900/60 rounded-3xl p-4 flex flex-col justify-between min-h-[90px] shadow-inner relative hover:bg-blue-500/[0.03] hover:border-blue-500/20 transition-all group/metric"
                                        >
                                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-600 flex items-center justify-between">
                                                <span className="flex items-center gap-1.5"><Box size={10} className="text-zinc-500" /> ACERVO & GIRO</span>
                                                <ExternalLink size={10} className="opacity-0 group-hover/metric:opacity-100 text-blue-400 transition-opacity" />
                                            </span>
                                            <div className="mt-2.5">
                                                <div className="font-black text-lg tracking-tighter text-zinc-200 group-hover/metric:text-blue-400 transition-colors">
                                                    {studio.total_figuras || 0} figures
                                                </div>
                                                <div className="text-[9px] font-bold text-zinc-500 mt-0.5">
                                                    {(studio.conversao_acervo || 0).toFixed(1)}% giro catálogo
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Qualidade */}
                                        <div className="bg-zinc-950/45 border border-zinc-900/60 rounded-3xl p-4 flex flex-col justify-between min-h-[90px] shadow-inner relative hover:bg-zinc-950/70 transition-colors group/metric">
                                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-600 flex items-center justify-between">
                                                <span className="flex items-center gap-1.5"><Star size={10} className="text-zinc-500" /> NÍVEL & TICKET</span>
                                            </span>
                                            <div className="mt-1 flex justify-between items-end">
                                                <div className="flex items-center gap-0.5">
                                                    <select
                                                        value={studio.qualidade || 5}
                                                        onChange={(e) => handleChange(studio.id, 'qualidade', parseInt(e.target.value))}
                                                        onBlur={() => handleUpdate(studio)}
                                                        className="bg-transparent border-none outline-none text-amber-500 font-black text-lg cursor-pointer appearance-none text-right hover:text-amber-400 transition-colors py-0"
                                                    >
                                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-zinc-950">{n}</option>)}
                                                    </select>
                                                    <Star size={13} className="text-amber-500 mb-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" fill="currentColor" />
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[9px] font-bold text-zinc-500">Avg Ticket</div>
                                                    <div className="font-black text-xs text-zinc-300">
                                                        R$ {(studio.ticket_medio || 0).toFixed(0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Collapsible Edit Panel */}
                                    {isExpanded && (
                                        <div className="space-y-4 pt-3 border-t border-zinc-900/85 animate-[fadeIn_0.2s_ease-out]">
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Configurações do Estúdio</h4>
                                            
                                            <div className="grid grid-cols-1 gap-3">
                                                {/* Logo URL */}
                                                <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-zinc-900 transition-colors focus-within:border-blue-500/30">
                                                    <div className="p-2 bg-zinc-900 rounded-xl text-zinc-600"><ImageIcon size={14} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-bold text-zinc-600 uppercase">URL do Logo</label>
                                                        <input
                                                            type="text"
                                                            placeholder="https://..."
                                                            value={studio.logo_url || ''}
                                                            onChange={e => handleChange(studio.id, 'logo_url', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            className="bg-transparent text-xs font-semibold outline-none text-zinc-300 placeholder:text-zinc-700 w-full mt-0.5"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Instagram */}
                                                <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-zinc-900 transition-colors focus-within:border-pink-500/30">
                                                    <div className="p-2 bg-zinc-900 rounded-xl text-zinc-600"><Instagram size={14} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-bold text-zinc-600 uppercase">Instagram</label>
                                                        <input
                                                            type="text"
                                                            placeholder="@handle"
                                                            value={studio.instagram_handle || ''}
                                                            onChange={e => handleChange(studio.id, 'instagram_handle', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            className="bg-transparent text-xs font-semibold outline-none text-zinc-300 placeholder:text-zinc-700 w-full mt-0.5"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Site URL */}
                                                <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-zinc-900 transition-colors focus-within:border-blue-500/30">
                                                    <div className="p-2 bg-zinc-900 rounded-xl text-zinc-600"><Globe size={14} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-bold text-zinc-600 uppercase">Website</label>
                                                        <input
                                                            type="text"
                                                            placeholder="https://site.com"
                                                            value={studio.social_url || ''}
                                                            onChange={e => handleChange(studio.id, 'social_url', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            className="bg-transparent text-xs font-semibold outline-none text-zinc-300 placeholder:text-zinc-700 w-full mt-0.5"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Observações */}
                                                <div className="flex items-start gap-3 bg-black/40 p-2.5 rounded-2xl border border-zinc-900 transition-colors focus-within:border-blue-500/30">
                                                    <div className="p-2 bg-zinc-900 rounded-xl text-zinc-600 mt-1"><MessageSquare size={14} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-bold text-zinc-600 uppercase">Observações / Anotações</label>
                                                        <textarea
                                                            placeholder="Notas de licenciamento, suporte, prazos de entrega..."
                                                            value={studio.observacao || ''}
                                                            onChange={e => handleChange(studio.id, 'observacao', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            rows={2}
                                                            className="bg-transparent text-xs font-semibold outline-none text-zinc-300 placeholder:text-zinc-700 w-full mt-1.5 resize-none scrollbar-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Custo Operacional */}
                                    <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-900/60 border-dashed group-hover:border-emerald-500/20 transition-all mt-auto">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">CUSTO OPERACIONAL MENSAL</span>
                                            <DollarSign size={13} className="text-emerald-600 opacity-60 animate-pulse" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-zinc-500 font-extrabold text-sm">R$</span>
                                            <input
                                                type="number"
                                                value={studio.custo_mensal ?? ''}
                                                onChange={(e) => handleChange(studio.id, 'custo_mensal', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                onBlur={() => handleUpdate(studio)}
                                                className="bg-transparent text-xl font-black text-emerald-400 outline-none w-full tracking-tighter py-0"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
