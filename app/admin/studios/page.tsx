'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Save, DollarSign, Star, Box, Loader2, Trash, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';

interface Studio {
    id: number;
    nome: string;
    custo_mensal: number | '';
    qtd_display: number;
    qualidade: number;
    observacao: string;
    figuras?: { count: number }[];
}

export default function StudiosPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newStudioName, setNewStudioName] = useState('');
    const { hasRole, user } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');
    const router = useRouter();

    // Protect Route
    useEffect(() => {
        if (!loading && user && !canEdit) {
            toast.error('Acesso negado');
            router.push('/admin');
        }
    }, [user, loading, canEdit, router]);

    // Fetch studios
    useEffect(() => {
        if (canEdit) {
            fetchStudios();
        }
    }, [canEdit]);

    const fetchStudios = async () => {
        try {
            // Note: Ensure /api/estudios returns "figuras(count)"
            const res = await fetch('/api/estudios', { cache: 'no-store' });
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
            // Toast supression for HCI Auto-Save on Blur
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

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Falha ao adicionar estúdio');
            }

            toast.success('Estúdio adicionado!');
            setNewStudioName('');
            fetchStudios(); // Refresh the list
        } catch (error: any) {
            console.error(error);
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
            const res = await fetch(`/api/admin/studios?id=${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Falha ao excluir o estúdio');

            toast.success('Estúdio removido!');
            fetchStudios(); // Refresh the list
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir estúdio');
        }
    };

    const handleChange = (id: number, field: keyof Studio, value: any) => {
        setStudios(prev => prev.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ));
    };

    return (
        <div className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
            {/* Sci-fi Background Blobs - Subdued */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 transition-colors duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 mt-2">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 rounded-2xl transition-all shadow-sm text-zinc-500 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3 text-white">
                                Gerenciar Estúdios
                            </h1>
                            <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Centro de Custos e Métricas de Produção.</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex justify-center w-full"><Loader2 className="animate-spin text-blue-500 w-12 h-12" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {/* Ghost card for Add */}
                        {hasRole('admin') && (
                            <div className="bg-zinc-950/40 border-2 border-dashed border-zinc-800 rounded-3xl p-6 flex flex-col justify-center gap-4 hover:border-blue-500/50 transition-all group">
                                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-blue-500 group-hover:scale-110 transition-all mx-auto shadow-sm">
                                    {isAdding ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
                                </div>
                                <input 
                                    type="text"
                                    value={newStudioName}
                                    onChange={e => setNewStudioName(e.target.value)}
                                    onBlur={(e) => {
                                        if (e.target.value.trim() !== '') handleAddStudio(e as any);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddStudio(e as any);
                                    }}
                                    placeholder="+ Novo Estúdio [Enter]"
                                    className="bg-transparent text-center font-black text-lg outline-none text-zinc-300 placeholder:text-zinc-600 w-full"
                                />
                                <span className="text-[9px] uppercase tracking-widest text-zinc-600 text-center font-bold">Digite e aperte Enter</span>
                            </div>
                        )}

                        {studios.map(studio => (
                            <div key={studio.id} className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-3xl p-6 shadow-md flex flex-col gap-6 relative group hover:border-blue-500/50 transition-colors">
                                
                                <div className="flex justify-between items-start">
                                    <div className="font-black text-2xl tracking-tight text-zinc-100 group-hover:text-blue-400 transition-colors">{studio.nome}</div>
                                    <div className="flex gap-2 items-center">
                                        {saving === studio.id && <Loader2 size={16} className="text-emerald-500 animate-spin" />}
                                        {hasRole('admin') && (
                                            <button onClick={() => handleDelete(studio.id, studio.figuras?.[0]?.count || 0)} className="text-zinc-600 hover:text-red-500 transition-colors p-1" title="Excluir">
                                                <Trash size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Despesa Mensal */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black tracking-widest uppercase text-zinc-500 pl-1">Despesa Mensal / Custo Fixo</label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                                            <input
                                                type="number"
                                                value={studio.custo_mensal ?? ''}
                                                onChange={(e) => handleChange(studio.id, 'custo_mensal', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                onBlur={() => handleUpdate(studio)}
                                                placeholder="0.00"
                                                className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl py-2.5 pl-8 pr-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-emerald-400 font-bold text-sm shadow-inner transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Qualidade */}
                                        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-inner relative">
                                            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 absolute top-2 left-3">Qualidade</label>
                                            <div className="flex items-center gap-1 mt-4">
                                                <select
                                                    value={studio.qualidade || 5}
                                                    onChange={(e) => {
                                                        handleChange(studio.id, 'qualidade', parseInt(e.target.value));
                                                    }}
                                                    onBlur={() => handleUpdate(studio)}
                                                    className="bg-transparent border-none outline-none text-amber-500 font-black text-xl cursor-pointer appearance-none text-right hover:text-amber-400 transition-colors"
                                                >
                                                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-zinc-900">{n}</option>)}
                                                </select>
                                                <Star size={16} className="text-amber-500 mb-0.5" fill="currentColor" />
                                            </div>
                                        </div>
                                        {/* Acervo */}
                                        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-inner relative select-none">
                                            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 absolute top-2 left-3">Acervo</label>
                                            <div className="flex items-center gap-2 mt-4">
                                                <Box size={16} className="text-blue-500/50" />
                                                <span className="font-black text-xl text-blue-400">
                                                    {studio.figuras?.[0]?.count || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Obs */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black tracking-widest uppercase text-zinc-500 pl-1">Anotações Internas (Auto-Save)</label>
                                        <input
                                            type="text"
                                            value={studio.observacao || ''}
                                            onChange={(e) => handleChange(studio.id, 'observacao', e.target.value)}
                                            onBlur={() => handleUpdate(studio)}
                                            placeholder="..."
                                            className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl p-2.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-zinc-400 text-xs shadow-inner transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
