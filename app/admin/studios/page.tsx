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

            toast.success('Estúdio atualizado!');
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

                <div className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-3xl overflow-hidden shadow-lg relative">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                    {loading ? (
                        <div className="p-24 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-12 h-12" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-950/80 border-b border-zinc-800/80">
                                    <tr className="text-zinc-500 text-[9px] uppercase font-black tracking-widest">
                                        <th className="p-5 pl-8 w-[250px]">Estúdio Fabril</th>
                                        <th className="p-5 w-[180px]">Despesa Mensal</th>
                                        <th className="p-5 w-[150px] text-center">Acervo Auto.</th>
                                        <th className="p-5 w-[150px] text-center">Qualidade</th>
                                        <th className="p-5">Termos / Observações</th>
                                        <th className="p-5 w-[120px] text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {studios.map(studio => (
                                        <tr key={studio.id} className="hover:bg-zinc-900/50 transition-colors group">
                                            <td className="p-5 pl-8 font-black text-xl tracking-tight text-zinc-100 group-hover:text-blue-400 transition-colors">{studio.nome}</td>

                                            <td className="p-5">
                                                <div className="relative">
                                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 opacity-60" />
                                                    <input
                                                        type="number"
                                                        value={studio.custo_mensal ?? ''}
                                                        onChange={(e) => handleChange(studio.id, 'custo_mensal', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        placeholder="0.00"
                                                        className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-2.5 pl-8 focus:border-emerald-500 outline-none text-emerald-400 placeholder:text-zinc-600 transition-all font-black text-sm"
                                                    />
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <div className="flex items-center justify-center gap-2 text-zinc-500 bg-zinc-900/50 py-1.5 px-3 rounded-lg border border-zinc-800/80 w-fit mx-auto">
                                                    <Box size={14} className="text-blue-500/70" />
                                                    <span className="font-black text-lg tracking-tighter text-blue-400">
                                                        {studio.figuras?.[0]?.count || 0}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <div className="flex items-center justify-center gap-1.5 bg-zinc-900/50 py-1.5 px-2 rounded-lg border border-zinc-800/80 w-fit mx-auto">
                                                    <select
                                                        value={studio.qualidade || 5}
                                                        onChange={(e) => handleChange(studio.id, 'qualidade', parseInt(e.target.value))}
                                                        className="bg-transparent border-none outline-none text-amber-500 font-black transition-all text-lg cursor-pointer appearance-none text-center"
                                                    >
                                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-zinc-900">{n}</option>)}
                                                    </select>
                                                    <Star size={16} className="text-amber-500" fill="currentColor" />
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <input
                                                    type="text"
                                                    value={studio.observacao || ''}
                                                    onChange={(e) => handleChange(studio.id, 'observacao', e.target.value)}
                                                    placeholder="Notas automáticas..."
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500/50 outline-none text-zinc-500 focus:text-zinc-300 transition-all font-medium text-sm px-2 py-1"
                                                />
                                            </td>

                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleUpdate(studio)}
                                                        disabled={saving === studio.id}
                                                        className="p-2.5 text-zinc-400 hover:text-emerald-400 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 rounded-xl transition-all shadow-sm"
                                                        title="Salvar"
                                                    >
                                                        {saving === studio.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    </button>
                                                    {hasRole('admin') && (
                                                        <button
                                                            onClick={() => handleDelete(studio.id, studio.figuras?.[0]?.count || 0)}
                                                            className="p-2.5 text-zinc-400 hover:text-red-400 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl transition-all shadow-sm"
                                                            title="Excluir"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Add New Studio Row */}
                                    {canEdit && (
                                        <tr className="bg-zinc-950">
                                            <td className="p-6 border-t border-zinc-800/80" colSpan={6}>
                                                <form onSubmit={handleAddStudio} className="flex items-center gap-4 max-w-2xl mx-auto bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80 shadow-inner">
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest pl-1">Novo Ponto de Produção</label>
                                                        <input
                                                            type="text"
                                                            value={newStudioName}
                                                            onChange={(e) => setNewStudioName(e.target.value)}
                                                            placeholder="Nome do Estúdio..."
                                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 outline-none focus:border-blue-500 text-zinc-200 placeholder:text-zinc-600 transition-all font-black text-sm"
                                                        />
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={isAdding || !newStudioName.trim()}
                                                        className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:shadow-none text-white font-black px-6 py-3.5 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-widest text-xs"
                                                    >
                                                        {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
                                                        <span>Registrar</span>
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
