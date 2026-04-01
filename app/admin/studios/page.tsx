'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Save, DollarSign, Star, Box, Loader2, Trash, Plus, Instagram, Globe, ExternalLink, Search, ImageIcon, Sparkles, ShoppingBag } from 'lucide-react';
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
    figuras?: { count: number }[];
}

export default function StudiosPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newStudioName, setNewStudioName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { hasRole, user } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');
    const router = useRouter();

    // ... (efeitos permanecem os mesmos)
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
            const res = await fetch('/api/estudios?incluirInativos=true', { cache: 'no-store' });
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

    const filteredStudios = studios.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()));

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
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Gestão de Branding, Custos e Acervo.</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group max-w-sm w-full">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar estúdio..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 p-3.5 pl-12 rounded-2xl outline-none text-sm transition-all shadow-inner font-medium text-zinc-300"
                        />
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
                                    {studios.filter(s => s.merchant).reduce((acc, s) => acc + (s.figuras?.[0]?.count || 0), 0)} 
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

                        {filteredStudios.map(studio => (
                            <div key={studio.id} className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 relative group hover:border-blue-500/20 transition-all duration-500">
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className={clsx("flex justify-between items-center transition-opacity duration-500", !studio.ativo && "opacity-40")}>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shadow-inner group-hover:border-blue-500/30 transition-all">
                                            {studio.logo_url ? (
                                                <img src={studio.logo_url} alt={studio.nome} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="font-black text-xl text-zinc-700">{studio.nome.slice(0, 2).toUpperCase()}</div>
                                            )}
                                            {!studio.ativo && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-black uppercase text-white/50 tracking-widest">OFF</div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-black text-lg tracking-tight text-white line-clamp-2 leading-tight flex items-center gap-2">
                                                {studio.nome}
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                {studio.instagram_handle && (
                                                    <a href={`https://instagram.com/${studio.instagram_handle.replace('@', '')}`} target="_blank" className="text-zinc-600 hover:text-pink-500 transition-colors">
                                                        <Instagram size={14} />
                                                    </a>
                                                )}
                                                {studio.social_url && (
                                                    <a href={studio.social_url} target="_blank" className="text-zinc-600 hover:text-blue-400 transition-colors">
                                                        <Globe size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        {/* Merchant Toggle (Venda/Vitrine) */}
                                        <button 
                                            onClick={() => {
                                                const newVal = !studio.merchant;
                                                handleChange(studio.id, 'merchant', newVal);
                                                handleUpdate({ ...studio, merchant: newVal });
                                            }}
                                            className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border",
                                                studio.merchant 
                                                    ? "bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
                                                    : "bg-zinc-900 border-zinc-800 text-zinc-700"
                                            )}
                                            title={studio.merchant ? "Merchant: Visível na Vitrine" : "Merchant: Oculto da Vitrine"}
                                        >
                                            <ShoppingBag size={18} />
                                        </button>

                                        <div className="h-4 w-px bg-zinc-800 mx-1" />

                                        {/* Status Toggle (Custo/Operação) */}
                                        <button 
                                            onClick={() => {
                                                const newVal = !studio.ativo;
                                                handleChange(studio.id, 'ativo', newVal);
                                                handleUpdate({ ...studio, ativo: newVal });
                                            }}
                                            className={clsx(
                                                "w-11 h-6 rounded-full p-1 transition-all duration-300 relative",
                                                studio.ativo ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-zinc-800"
                                            )}
                                            title={studio.ativo ? "Ativo: Gerando Custo" : "Inativo: Operação Pausada"}
                                        >
                                            <div className={clsx(
                                                "w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                                                studio.ativo ? "translate-x-5" : "translate-x-0"
                                            )} />
                                        </button>
                                        
                                        <div className="h-6 w-px bg-zinc-800 mx-1" />
                                        
                                        {saving === studio.id && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                                        <button onClick={() => handleDelete(studio.id, studio.figuras?.[0]?.count || 0)} className="text-zinc-700 hover:text-red-500 transition-colors p-2 bg-black/40 rounded-xl border border-zinc-800/50 hover:border-red-500/20">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Qualidade */}
                                    <div className="bg-zinc-950/30 border border-zinc-800/30 rounded-3xl p-4 flex flex-col items-center justify-center gap-1 shadow-inner relative group/stat hover:bg-zinc-950/50 transition-colors">
                                        <label className="text-[9px] font-black tracking-widest uppercase text-zinc-600 absolute top-3 left-4">Nível</label>
                                        <div className="flex items-center gap-1 mt-4">
                                            <select
                                                value={studio.qualidade || 5}
                                                onChange={(e) => handleChange(studio.id, 'qualidade', parseInt(e.target.value))}
                                                onBlur={() => handleUpdate(studio)}
                                                className="bg-transparent border-none outline-none text-amber-500 font-black text-2xl cursor-pointer appearance-none text-right hover:text-amber-400 transition-colors"
                                            >
                                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-zinc-900">{n}</option>)}
                                            </select>
                                            <Star size={18} className="text-amber-500 mb-0.5 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" fill="currentColor" />
                                        </div>
                                    </div>
                                    {/* Acervo */}
                                    <Link 
                                        href={`/admin/figures?studio=${studio.id}`}
                                        className="bg-zinc-950/30 border border-zinc-800/30 rounded-3xl p-4 flex flex-col items-center justify-center gap-1 shadow-inner relative group/stat hover:bg-blue-500/5 transition-all border-dashed hover:border-blue-400/30"
                                    >
                                        <label className="text-[9px] font-black tracking-widest uppercase text-zinc-600 absolute top-3 left-4">Acervo</label>
                                        <div className="flex items-center gap-2 mt-4 text-zinc-200 group-hover/stat:text-blue-400 transition-colors">
                                            <span className="font-black text-2xl tracking-tighter">
                                                {studio.figuras?.[0]?.count || 0}
                                            </span>
                                            <ExternalLink size={14} className="opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                                        </div>
                                    </Link>
                                </div>

                                {/* Branding Inputs (Expandable or always visible subtle links) */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-zinc-800/50 transition-colors group-focus-within:border-blue-500/20">
                                        <div className="p-2 bg-zinc-900 rounded-xl text-zinc-600"><ImageIcon size={14} /></div>
                                        <input
                                            type="text"
                                            placeholder="URL do Logo"
                                            value={studio.logo_url || ''}
                                            onChange={e => handleChange(studio.id, 'logo_url', e.target.value)}
                                            onBlur={() => handleUpdate(studio)}
                                            className="bg-transparent text-[11px] font-medium outline-none text-zinc-400 flex-1 placeholder:text-zinc-700"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-zinc-800/50 transition-colors group-focus-within:border-pink-500/20">
                                        <div className="p-2 bg-zinc-900 rounded-xl text-zinc-600"><Instagram size={14} /></div>
                                        <input
                                            type="text"
                                            placeholder="@instagram"
                                            value={studio.instagram_handle || ''}
                                            onChange={e => handleChange(studio.id, 'instagram_handle', e.target.value)}
                                            onBlur={() => handleUpdate(studio)}
                                            className="bg-transparent text-[11px] font-medium outline-none text-zinc-400 flex-1 placeholder:text-zinc-700"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-zinc-800/50 transition-colors group-focus-within:border-blue-500/20">
                                        <div className="p-2 bg-zinc-900 rounded-xl text-zinc-600"><Globe size={14} /></div>
                                        <input
                                            type="text"
                                            placeholder="https://site.com"
                                            value={studio.social_url || ''}
                                            onChange={e => handleChange(studio.id, 'social_url', e.target.value)}
                                            onBlur={() => handleUpdate(studio)}
                                            className="bg-transparent text-[11px] font-medium outline-none text-zinc-400 flex-1 placeholder:text-zinc-700"
                                        />
                                    </div>
                                </div>

                                {/* Despesa Mensal */}
                                <div className="mt-2 bg-zinc-950/40 p-4 rounded-3xl border border-zinc-800/30 border-dashed group-hover:border-emerald-500/20 transition-all">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Custo Operacional</span>
                                        <DollarSign size={14} className="text-emerald-600 opacity-50" />
                                    </div>
                                    <input
                                        type="number"
                                        value={studio.custo_mensal ?? ''}
                                        onChange={(e) => handleChange(studio.id, 'custo_mensal', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        onBlur={() => handleUpdate(studio)}
                                        className="bg-transparent text-xl font-black text-emerald-400 outline-none w-full tracking-tighter"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
