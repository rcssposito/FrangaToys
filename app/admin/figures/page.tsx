
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ArrowLeft, Search, Trash2, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Figure {
    id: number;
    nome: string;
    serie: string;
    categoria: string;
    categoria_id: number;
    imagem_url: string;
    altura_cm: number | string;
    largura_cm: number | string;
    profundidade_cm: number | string;
    resina_kg: number | string;
    horas_impressao: number | string;
    horas_pintura: number | string;
    escala: number | string;
}

interface PricingSettings {
    custo_h_impressao: number;
    custo_h_pintura: number;
    custo_resina_kg: number;
    margem_basica: number;
    margem_premium: number;
}

export default function DataGridPage() {
    const [figures, setFigures] = useState<Figure[]>([]);
    const [settings, setSettings] = useState<PricingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Modal State
    const [previewImage, setPreviewImage] = useState<{ url: string, nome: string } | null>(null);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/admin/settings');
                const data = await res.json();
                setSettings(data);
            } catch (err) {
                toast.error('Erro ao carregar configurações');
            }
        };
        fetchSettings();
    }, []);

    // Fetch figures based on filters
    const fetchFigures = useCallback(async (catId: number | null = selectedCategoryId, searchTerm: string = search) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (catId) params.append('categoria_id', catId.toString());
            if (searchTerm) params.append('search', searchTerm);

            const res = await fetch(`/api/admin/figures?${params.toString()}`);
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();
            setFigures(data);
        } catch (error) {
            toast.error('Erro ao carregar figuras');
        } finally {
            setLoading(false);
        }
    }, [selectedCategoryId, search]); // Dependencies for useCallback

    // Initial Load & Filter Changes with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFigures();
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [fetchFigures]); // fetchFigures depends on selectedCategoryId and search

    const handleChange = (id: number, field: keyof Figure, value: string) => {
        setFigures(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const handleSave = async (figure: Figure) => {
        setSavingId(figure.id);

        // Ensure values are numbers for API
        const payload = {
            ...figure,
            resina_kg: Number(figure.resina_kg),
            horas_impressao: Number(figure.horas_impressao),
            horas_pintura: Number(figure.horas_pintura),
            altura_cm: Number(figure.altura_cm),
            largura_cm: Number(figure.largura_cm),
            profundidade_cm: Number(figure.profundidade_cm),
            escala: Number(figure.escala),
        };

        try {
            const res = await fetch('/api/admin/figures', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Erro ao salvar');
            toast.success('Alterações salvas!');
            await fetchFigures(); // Refresh data to show calculated dimensions
        } catch (err) {
            toast.error('Erro ao salvar');
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: number, nome: string) => {
        if (!confirm(`Tem certeza que deseja excluir "${nome}"? Esta ação é irreversível.`)) return;

        setDeletingId(id);
        try {
            const res = await fetch('/api/admin/figures', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error('Erro ao excluir');

            toast.success('Figura removida com sucesso');
            await fetchFigures(); // Refresh data
        } catch (err) {
            toast.error('Erro ao excluir figura');
        } finally {
            setDeletingId(null);
        }
    };

    const calculatePrices = (f: Figure) => {
        if (!settings) return { basic: 0, premium: 0 };

        const h_imp = Number(f.horas_impressao);
        const res_kg = Number(f.resina_kg);
        const h_pint = Number(f.horas_pintura);

        const custoBase =
            (h_imp * settings.custo_h_impressao) +
            (res_kg * settings.custo_resina_kg) +
            (h_pint * settings.custo_h_pintura);

        // Round up to nearest multiple of 5
        const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

        return {
            basic: roundTo5(custoBase * settings.margem_basica),
            premium: roundTo5(custoBase * settings.margem_premium)
        };
    };

    if (loading && figures.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

    const CATEGORY_FILTERS = [
        { id: 1, label: 'Anime' },
        { id: 2, label: 'Games' },
        { id: 3, label: 'Marvel' },
        { id: 4, label: 'DC' },
        { id: 5, label: 'Random' },
    ];

    // Check for duplicate keys in figures (Accessing state)
    const duplicateIds = figures.map(f => f.id).filter((item, index, arr) => arr.indexOf(item) !== index);
    if (duplicateIds.length > 0) console.error('Duplicate IDs detected:', duplicateIds);

    return (
        <div className="min-h-screen bg-black text-white p-8 relative">
            <div className="mx-auto max-w-[1500px]">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Catálogo & Precificação</h1>
                            <p className="text-zinc-400 text-sm">Clique no nome para ver a foto. Edite custos abaixo.</p>
                        </div>
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar figura..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700">
                    <button
                        onClick={() => setSelectedCategoryId(null)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!selectedCategoryId ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                        Todas
                    </button>
                    {CATEGORY_FILTERS.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategoryId === cat.id ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Tabela */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-auto shadow-2xl max-h-[75vh]">
                    <table className="w-full text-left border-collapse whitespace-nowrap relative">
                        <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="p-4 min-w-[220px]">Figura (Clique p/ ver)</th>
                                <th className="p-4 text-center">Escala (%)</th>
                                <th className="p-4 text-center">KG Resina</th>
                                <th className="p-4 text-center">H. Impressão</th>
                                <th className="p-4 text-center">H. Pintura</th>
                                <th className="p-4 text-center">Medidas (cm)</th>
                                <th className="p-4 text-right text-green-500">Básico (R$)</th>
                                <th className="p-4 text-right text-purple-400">Premium (R$)</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-sm">
                            {figures.map(f => {
                                const prices = calculatePrices(f);
                                return (
                                    <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors group">
                                        <td className="p-3">
                                            <div
                                                onClick={() => f.imagem_url && setPreviewImage({ url: f.imagem_url, nome: f.nome })}
                                                className="cursor-pointer text-left group/name"
                                            >
                                                <div className="font-bold text-white leading-tight group-hover/name:text-orange-500 transition-colors flex items-center gap-2">
                                                    {f.nome}
                                                    {f.imagem_url && <ExternalLink size={12} className="opacity-0 group-hover/name:opacity-100" />}
                                                </div>
                                                <div className="text-[11px] text-zinc-500">{f.categoria} - {f.serie}</div>
                                            </div>
                                        </td>

                                        <td className="p-2">
                                            <input
                                                type="number" step="1"
                                                className="w-16 bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-center focus:border-orange-500 outline-none mx-auto block text-orange-400 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={f.escala || ''}
                                                onChange={e => handleChange(f.id, 'escala', e.target.value)}
                                                placeholder="100"
                                            />
                                        </td>

                                        <td className="p-2">
                                            <input
                                                type="number" step="0.001"
                                                className="w-20 bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-center focus:border-orange-500 outline-none mx-auto block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={f.resina_kg === 0 ? '' : f.resina_kg}
                                                onChange={e => handleChange(f.id, 'resina_kg', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number" step="0.1"
                                                className="w-20 bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-center focus:border-orange-500 outline-none mx-auto block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={f.horas_impressao === 0 ? '' : f.horas_impressao}
                                                onChange={e => handleChange(f.id, 'horas_impressao', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number" step="0.1"
                                                className="w-20 bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-center focus:border-orange-500 outline-none mx-auto block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={f.horas_pintura === 0 ? '' : f.horas_pintura}
                                                onChange={e => handleChange(f.id, 'horas_pintura', e.target.value)}
                                            />
                                        </td>

                                        <td className="p-2">
                                            <div className="flex gap-1 justify-center">
                                                <input className="w-10 bg-zinc-800/50 border-none rounded px-1 py-1 text-center text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="A" value={f.altura_cm === 0 ? '' : f.altura_cm} onChange={e => handleChange(f.id, 'altura_cm', e.target.value)} />
                                                <input className="w-10 bg-zinc-800/50 border-none rounded px-1 py-1 text-center text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="L" value={f.largura_cm === 0 ? '' : f.largura_cm} onChange={e => handleChange(f.id, 'largura_cm', e.target.value)} />
                                                <input className="w-10 bg-zinc-800/50 border-none rounded px-1 py-1 text-center text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="P" value={f.profundidade_cm === 0 ? '' : f.profundidade_cm} onChange={e => handleChange(f.id, 'profundidade_cm', e.target.value)} />
                                            </div>
                                        </td>

                                        <td className="p-4 text-right font-mono font-bold text-green-400">
                                            R$ {prices.basic}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-purple-400">
                                            R$ {prices.premium}
                                        </td>

                                        <td className="p-3 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => handleSave(f)}
                                                    disabled={savingId === f.id}
                                                    className="p-2 bg-orange-500/10 text-orange-500 rounded hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                                                    title="Salvar"
                                                >
                                                    {savingId === f.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(f.id, f.nome)}
                                                    disabled={deletingId === f.id}
                                                    className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                                    title="Excluir"
                                                >
                                                    {deletingId === f.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative max-w-4xl w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                            <h3 className="font-bold text-lg">{previewImage.nome}</h3>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-2 flex justify-center bg-zinc-950">
                            <img
                                src={previewImage.url}
                                alt={previewImage.nome}
                                className="max-h-[70vh] w-auto object-contain rounded-lg"
                            />
                        </div>
                        <div className="p-4 text-center text-zinc-500 text-xs">
                            Imagens carregadas via ImageKit
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
