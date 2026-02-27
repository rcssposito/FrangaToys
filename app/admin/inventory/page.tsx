'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, ArrowLeft, Trash2, PackageOpen, Pipette, Edit2, Check, X, Search, Layers, Droplet } from 'lucide-react';
import Link from 'next/link';

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
            <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="animate-spin text-orange-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <PackageOpen className="text-orange-500" />
                                Insumos & Tintas
                            </h1>
                            <p className="text-zinc-400 mt-1">Gerencie o estoque do ateliê (Tintas, primers, embalagens)</p>
                        </div>
                    </div>
                    <button
                        onClick={openModalForNew}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        <Plus size={20} />
                        Novo Insumo
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-zinc-400 text-sm font-medium mb-1">Total de Itens Listados</div>
                        <div className="text-3xl font-bold">{items.length}</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-6 relative overflow-hidden">
                        <div className="text-red-400 text-sm font-medium mb-1">Alerta: Estoque Crítico</div>
                        <div className="text-3xl font-bold text-red-500">{itemsBellowMinimum.length}</div>
                        {itemsBellowMinimum.length > 0 && (
                            <div className="absolute top-0 right-0 w-2 h-full bg-red-500 animate-pulse" />
                        )}
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-zinc-400 text-sm font-medium mb-1">Valor Secundário (Unidades)</div>
                        <div className="text-3xl font-bold">{items.reduce((acc, i) => acc + (i.unidade_medida === 'un' ? i.quantidade : 0), 0)}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-orange-500 text-zinc-200"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-black border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500 text-zinc-200 min-w-[200px]"
                    >
                        <option value="Todas">Todas as Categorias</option>
                        {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Data Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                    <th className="p-4 font-semibold text-zinc-400 w-12"></th>
                                    <th className="p-4 font-semibold text-zinc-400">Nome do Insumo</th>
                                    <th className="p-4 font-semibold text-zinc-400">Marca</th>
                                    <th className="p-4 font-semibold text-zinc-400">Categoria</th>
                                    <th className="p-4 font-semibold text-zinc-400 text-center">Quantidade Atual</th>
                                    <th className="p-4 font-semibold text-zinc-400 text-right w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                                            Nenhum item encontrado no estoque.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => {
                                        const isCritical = item.quantidade <= item.estoque_minimo;

                                        return (
                                            <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                                                <td className="p-4 pl-6">
                                                    {getCategoryIcon(item.categoria)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-zinc-200">{item.nome}</div>
                                                    {isCritical && <div className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-wider">Estoque Baixo (Min: {item.estoque_minimo})</div>}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded text-xs">{item.marca || 'Genérico'}</span>
                                                </td>
                                                <td className="p-4 text-zinc-400 text-sm">
                                                    {item.categoria}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => handleQuickStockUpdate(item.id, item.quantidade, -1)}
                                                            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors disabled:opacity-50"
                                                            disabled={item.quantidade <= 0}
                                                        >
                                                            -
                                                        </button>
                                                        <div className={`w-16 text-center font-mono font-bold text-lg ${isCritical ? 'text-red-400' : 'text-zinc-200'}`}>
                                                            {item.quantidade} <span className="text-xs text-zinc-500 font-sans font-normal ml-0.5">{item.unidade_medida}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleQuickStockUpdate(item.id, item.quantidade, 1)}
                                                            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-green-500/20 hover:text-green-400 flex items-center justify-center transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openModalForEdit(item)}
                                                            className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                            title="Editar Detalhes"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id, item.nome)}
                                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#121212] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-red-500/20 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <PackageOpen className="text-orange-500" />
                            {formData.id ? 'Editar Insumo' : 'Novo Insumo'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome / Cor *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: Primer Grey PU, Khorne Red..."
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 text-zinc-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Marca</label>
                                    <input
                                        type="text"
                                        value={formData.marca}
                                        onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                        placeholder="Ex: Acrilex, Citadel..."
                                        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 text-zinc-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Categoria *</label>
                                    <select
                                        required
                                        value={formData.categoria}
                                        onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 text-zinc-200"
                                    >
                                        {categoriesList.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Qtd *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.quantidade}
                                        onChange={e => setFormData({ ...formData, quantidade: e.target.value })}
                                        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 text-zinc-200 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Unidade *</label>
                                    <select
                                        required
                                        value={formData.unidade_medida}
                                        onChange={e => setFormData({ ...formData, unidade_medida: e.target.value })}
                                        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 text-zinc-200"
                                    >
                                        <option value="un">Unidade (un)</option>
                                        <option value="ml">Mililitro (ml)</option>
                                        <option value="g">Grama (g)</option>
                                        <option value="kg">Quilograma (kg)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Est. Mínimo</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.estoque_minimo}
                                        onChange={e => setFormData({ ...formData, estoque_minimo: e.target.value })}
                                        title="Sempre que a quantidade chegar nesse valor, o painel vai alertar"
                                        className="w-full bg-black border border-red-900/50 rounded-lg px-4 py-2.5 focus:outline-none focus:border-red-500 text-zinc-200 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    {formData.id ? 'Salvar Alterações' : 'Cadastrar no Estoque'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
