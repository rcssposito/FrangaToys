'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Minus, Loader2, ArrowLeft, Trash2, PackageOpen, Pipette, Edit2, Check, X, Search, Layers, Droplet } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { clsx } from 'clsx';

interface InventoryItem {
    id: string;
    nome: string;
    marca: string | null;
    categoria: string;
    quantidade: number;
    unidade_medida: string;
    estoque_minimo: number;
}

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { hasRole } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('Todas');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        nome: '',
        marca: '',
        categoria: 'Tinta Acrílica',
        quantidade: '',
        unidade_medida: 'ml',
        estoque_minimo: '0'
    });

    const categoriesList = [
        'Tinta Acrílica', 'Tinta Metálica', 'Pátina / Goldfix', 'Primer', 'Verniz (Pincel)', 'Verniz (Spray)', 'Solvente', 'Diluente', 'Óleo / Enamel', 'Embalagem', 'Outros'
    ];

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/inventory');
            if (!res.ok) throw new Error('Falha ao carregar estoque');
            const data = await res.json();
            setItems(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar itens do estoque');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const isEditing = !!formData.id;
            const method = isEditing ? 'PATCH' : 'POST';

            const res = await fetch('/api/admin/inventory', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Erro ao salvar item');

            await fetchInventory();
            setIsModalOpen(false);
            toast.success(`Item ${isEditing ? 'atualizado' : 'adicionado'} com sucesso!`);

        } catch (error) {
            console.error(error);
            toast.error('Ocorreu um erro ao salvar o item.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, nome: string) => {
        if (!window.confirm(`Tem certeza que deseja remover "${nome}" do controle de estoque?`)) return;

        try {
            const res = await fetch(`/api/admin/inventory?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao deletar item');

            setItems(prev => prev.filter(item => item.id !== id));
            toast.success('Item removido com sucesso.');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao remover o item.');
        }
    };

    const handleQuickStockUpdate = async (id: string, currentAmount: number, change: number) => {
        const newAmount = currentAmount + change;
        if (newAmount < 0) return; // Prevent negative stock

        // Optimistic UI update
        setItems(prev => prev.map(item => item.id === id ? { ...item, quantidade: newAmount } : item));

        try {
            const res = await fetch('/api/admin/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, quantidade: newAmount }),
            });

            if (!res.ok) throw new Error('Erro ao atualizar quantidade');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao sincronizar estoque. Recarregando...');
            fetchInventory(); // Revert on failure
        }
    };

    const openModalForEdit = (item: InventoryItem) => {
        setFormData({
            id: item.id,
            nome: item.nome,
            marca: item.marca || '',
            categoria: item.categoria,
            quantidade: item.quantidade.toString(),
            unidade_medida: item.unidade_medida,
            estoque_minimo: item.estoque_minimo.toString()
        });
        setIsModalOpen(true);
    };

    const openModalForNew = () => {
        setFormData({
            id: '',
            nome: '',
            marca: '',
            categoria: 'Tinta Acrílica',
            quantidade: '1',
            unidade_medida: 'un',
            estoque_minimo: '0'
        });
        setIsModalOpen(true);
    };

    // Derived states
    const itemsBellowMinimum = items.filter(i => i.quantidade <= i.estoque_minimo);
    const filteredItems = items.filter(item => {
        const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.marca?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'Todas' || item.categoria === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryIcon = (cat: string) => {
        if (cat.includes('Tinta') || cat.includes('Primer') || cat.includes('Óleo')) return <Pipette size={18} className="text-blue-400" />;
        if (cat.includes('Verniz') || cat.includes('Spray')) return <Droplet size={18} className="text-cyan-400" />;
        return <Layers size={18} className="text-zinc-400" />;
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--background)]">
                <Loader2 className="animate-spin text-orange-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-[var(--input-bg)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
                                <PackageOpen className="text-orange-500" />
                                Insumos & Tintas
                            </h1>
                            <p className="text-[var(--text-muted)] mt-1 font-medium">Gerencie o estoque do ateliê (Tintas, primers, embalagens)</p>
                        </div>
                    </div>
                    {canEdit && (
                        <button
                            onClick={openModalForNew}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                        >
                            <Plus size={20} />
                            Novo Insumo
                        </button>
                    )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-[var(--shadow-sm)] transition-all">
                        <div className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2">Total de Itens Listados</div>
                        <div className="text-4xl font-black text-[var(--foreground)]">{items.length}</div>
                    </div>
                    <div className={clsx(
                        "rounded-xl p-6 relative overflow-hidden transition-all shadow-md border",
                        itemsBellowMinimum.length > 0
                            ? "bg-red-500/5 border-red-500/20"
                            : "bg-[var(--card-bg)] border-[var(--card-border)]"
                    )}>
                        <div className={clsx(
                            "text-[10px] font-black uppercase tracking-widest mb-2",
                            itemsBellowMinimum.length > 0 ? "text-red-500" : "text-[var(--text-muted)]"
                        )}>
                            Alerta: Estoque Crítico
                        </div>
                        <div className={clsx(
                            "text-4xl font-black",
                            itemsBellowMinimum.length > 0 ? "text-red-600" : "text-[var(--foreground)]"
                        )}>{itemsBellowMinimum.length}</div>
                        {itemsBellowMinimum.length > 0 && (
                            <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500 animate-pulse" />
                        )}
                    </div>
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-[var(--shadow-sm)] transition-all">
                        <div className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2">Unidades (UN)</div>
                        <div className="text-4xl font-black text-[var(--foreground)]">{items.reduce((acc, i) => acc + (i.unidade_medida === 'un' ? i.quantidade : 0), 0)}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-xl shadow-[var(--shadow-sm)] transition-all">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-orange-500 text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-all font-medium"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 text-[var(--foreground)] min-w-[220px] transition-all font-medium"
                    >
                        <option value="Todas">Todas as Categorias</option>
                        {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Data Table */}
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-[var(--shadow-md)] transition-all">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--card-border)] bg-[var(--muted-bg)]/30 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                                    <th className="p-4 text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest w-12 pl-6"></th>
                                    <th className="p-4 text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">Nome do Insumo</th>
                                    <th className="p-4 text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">Marca</th>
                                    <th className="p-4 text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">Categoria</th>
                                    <th className="p-4 text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest text-center">Quantidade Atual</th>
                                    <th className="p-4 text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest text-right w-24 pr-6">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-[var(--text-muted)]">
                                            <div className="flex flex-col items-center gap-3 opacity-40">
                                                <PackageOpen size={48} />
                                                <p className="font-medium">Nenhum item encontrado no estoque.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => {
                                        const isCritical = item.quantidade <= item.estoque_minimo;

                                        return (
                                            <tr key={item.id} className="border-b border-[var(--card-border)]/50 hover:bg-[var(--input-bg)] transition-all group">
                                                <td className="p-4 pl-6">
                                                    <div className="w-10 h-10 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] flex items-center justify-center text-orange-500 shadow-sm transition-all group-hover:border-orange-500/30">
                                                        {getCategoryIcon(item.categoria)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-[var(--foreground)] text-sm tracking-tight">{item.nome}</div>
                                                    {isCritical && <div className="text-[9px] text-red-500 mt-1 uppercase font-black tracking-widest flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                        Estoque Crítico (Min: {item.estoque_minimo})
                                                    </div>}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[var(--text-muted)] bg-[var(--input-bg)] border border-[var(--card-border)] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight transition-all group-hover:text-[var(--foreground)]">{item.marca || 'Genérico'}</span>
                                                </td>
                                                <td className="p-4 text-[var(--text-muted)] text-xs font-medium uppercase tracking-tight group-hover:text-[var(--foreground)] transition-colors">
                                                    {item.categoria}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-4">
                                                        <button
                                                            onClick={() => handleQuickStockUpdate(item.id, item.quantidade, -1)}
                                                            disabled={item.quantidade <= 0 || !canEdit}
                                                            className="w-8 h-8 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 flex items-center justify-center transition-all disabled:opacity-30 shadow-sm active:scale-90"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <div className={`w-16 text-center font-black ${isCritical ? 'text-red-500' : 'text-[var(--foreground)]'}`}>
                                                            <div className="text-lg leading-none">{item.quantidade}</div>
                                                            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-tight font-bold mt-0.5">{item.unidade_medida}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleQuickStockUpdate(item.id, item.quantidade, 1)}
                                                            disabled={!canEdit}
                                                            className="w-8 h-8 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/20 flex items-center justify-center transition-all disabled:opacity-30 shadow-sm active:scale-90"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => openModalForEdit(item)}
                                                                className="p-2 text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/5 rounded-lg transition-all"
                                                                title="Editar Detalhes"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                        {hasRole('admin') && (
                                                            <button
                                                                onClick={() => handleDelete(item.id, item.nome)}
                                                                className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de Criação / Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--input-bg)] hover:bg-red-500/10 rounded-full transition-all"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-black flex items-center gap-3 text-[var(--foreground)]">
                                <PackageOpen className="text-orange-500" />
                                {formData.id ? 'Editar Insumo' : 'Novo Insumo'}
                            </h2>
                            <p className="text-[var(--text-muted)] text-xs font-medium mt-1 uppercase tracking-widest">Detalhes do Material</p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome / Cor *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: Primer Grey PU, Khorne Red..."
                                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-all font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Marca</label>
                                    <input
                                        type="text"
                                        value={formData.marca}
                                        onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                        placeholder="Ex: Acrilex, Citadel..."
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Categoria *</label>
                                    <select
                                        required
                                        value={formData.categoria}
                                        onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 text-[var(--foreground)] transition-all font-medium"
                                    >
                                        {categoriesList.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Qtd *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.quantidade}
                                        onChange={e => setFormData({ ...formData, quantidade: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 text-[var(--foreground)] font-black text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Unidade *</label>
                                    <select
                                        required
                                        value={formData.unidade_medida}
                                        onChange={e => setFormData({ ...formData, unidade_medida: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 text-[var(--foreground)] font-bold text-center"
                                    >
                                        <option value="un">un</option>
                                        <option value="ml">ml</option>
                                        <option value="g">g</option>
                                        <option value="kg">kg</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Mínimo</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.estoque_minimo}
                                        onChange={e => setFormData({ ...formData, estoque_minimo: e.target.value })}
                                        title="Alerta crítico quando atingir este valor"
                                        className="w-full bg-[var(--input-bg)] border border-red-500/20 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 text-red-500 font-black text-center"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-[var(--input-bg)] border border-[var(--card-border)] hover:bg-[var(--background)] text-[var(--text-muted)] font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    {formData.id ? 'Salvar' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
