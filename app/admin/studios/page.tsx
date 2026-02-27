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
    const router = useRouter();

    // Protect Route
    useEffect(() => {
        const canAccess = hasRole('admin') || hasRole('pricing');
        if (!loading && user && !canAccess) {
            toast.error('Acesso negado');
            router.push('/admin');
        }
    }, [user, loading, hasRole, router]);

    // Fetch studios
    useEffect(() => {
        const canAccess = hasRole('admin') || hasRole('pricing');
        if (canAccess) {
            fetchStudios();
        }
    }, [hasRole]);

    const fetchStudios = async () => {
        try {
            // Note: Ensure /api/estudios returns "figuras(count)"
            const res = await fetch('/api/estudios');
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
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            Gerenciar Estúdios
                        </h1>
                        <p className="text-zinc-400">Configure custos e métricas de cada estúdio.</p>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 border-b border-zinc-800">Estúdio</th>
                                        <th className="p-4 border-b border-zinc-800 w-[150px]">Custo Mensal (R$)</th>
                                        <th className="p-4 border-b border-zinc-800 w-[150px]">Total Modelos (Auto)</th>
                                        <th className="p-4 border-b border-zinc-800 w-[120px]">Qualidade (1-5)</th>
                                        <th className="p-4 border-b border-zinc-800">Observações</th>
                                        <th className="p-4 border-b border-zinc-800 w-[80px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-zinc-800">
                                    {studios.map(studio => (
                                        <tr key={studio.id} className="hover:bg-zinc-800/30 group">
                                            <td className="p-4 font-bold text-lg">{studio.nome}</td>

                                            <td className="p-4">
                                                <div className="relative">
                                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                    <input
                                                        type="number"
                                                        value={studio.custo_mensal ?? ''}
                                                        onChange={(e) => handleChange(studio.id, 'custo_mensal', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        placeholder="0.00"
                                                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 pl-8 focus:border-orange-500 outline-none placeholder:text-zinc-600"
                                                    />
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-zinc-400">
                                                    <Box size={14} />
                                                    <span className="font-mono text-lg">
                                                        {studio.figuras?.[0]?.count || 0}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <div className="flex items-center gap-1">
                                                    <select
                                                        value={studio.qualidade || 5}
                                                        onChange={(e) => handleChange(studio.id, 'qualidade', parseInt(e.target.value))}
                                                        className="bg-zinc-950 border border-zinc-700 rounded p-2 focus:border-orange-500 outline-none"
                                                    >
                                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                                    </select>
                                                    <Star size={14} className="text-yellow-500" fill="currentColor" />
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={studio.observacao || ''}
                                                    onChange={(e) => handleChange(studio.id, 'observacao', e.target.value)}
                                                    placeholder="Notas..."
                                                    className="w-full bg-transparent border-b border-transparent focus:border-zinc-700 outline-none text-zinc-400 focus:text-white"
                                                />
                                            </td>

                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdate(studio)}
                                                        disabled={saving === studio.id}
                                                        className="bg-zinc-800 hover:bg-orange-600 text-zinc-400 hover:text-white p-2 rounded transition-colors"
                                                        title="Salvar"
                                                    >
                                                        {saving === studio.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    </button>
                                                    {hasRole('admin') && (
                                                        <button
                                                            onClick={() => handleDelete(studio.id, studio.figuras?.[0]?.count || 0)}
                                                            className="bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white p-2 rounded transition-colors"
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
                                    <tr className="bg-zinc-950/50">
                                        <td className="p-4" colSpan={5}>
                                            <form onSubmit={handleAddStudio} className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={newStudioName}
                                                    onChange={(e) => setNewStudioName(e.target.value)}
                                                    placeholder="Novo Estúdio..."
                                                    className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded p-2 focus:border-orange-500 outline-none placeholder:text-zinc-600"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isAdding || !newStudioName.trim()}
                                                    className="flex items-center gap-2 bg-zinc-800 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded transition-colors"
                                                >
                                                    {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                                    <span>Adicionar</span>
                                                </button>
                                            </form>
                                        </td>
                                        <td className="p-4"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
