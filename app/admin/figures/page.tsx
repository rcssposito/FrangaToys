'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ArrowLeft, Search, Trash2, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Figure {
    id: number;
    nome: string;
    serie: string;
    imagem_url: string;
    altura_cm: number;
    largura_cm: number;
    profundidade_cm: number;
    resina_kg: number;
    horas_impressao: number;
    horas_pintura: number;
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
    const [filteredFigures, setFilteredFigures] = useState<Figure[]>([]);
    const [settings, setSettings] = useState<PricingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Modal State
    const [previewImage, setPreviewImage] = useState<{ url: string, nome: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const lower = search.toLowerCase();
        setFilteredFigures(
            figures.filter(f =>
                f.nome.toLowerCase().includes(lower) ||
                f.serie.toLowerCase().includes(lower)
            )
        );
    }, [search, figures]);

    const fetchData = async () => {
        try {
            const [figRes, setRes] = await Promise.all([
                fetch('/api/admin/figures'),
                fetch('/api/admin/settings')
            ]);

            const figData = await figRes.json();
            const setData = await setRes.json();

            setFigures(figData);
            setSettings(setData);
        } catch (err) {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (id: number, field: keyof Figure, value: string) => {
        const numValue = parseFloat(value) || 0;
        setFigures(prev => prev.map(f => f.id === id ? { ...f, [field]: numValue } : f));
    };

    const handleSave = async (figure: Figure) => {
        setSavingId(figure.id);
        try {
            const res = await fetch('/api/admin/figures', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(figure),
            });

            if (!res.ok) throw new Error('Erro ao salvar');
            toast.success('Alterações salvas!');
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
            setFigures(prev => prev.filter(f => f.id !== id));
        } catch (err) {
            toast.error('Erro ao excluir figura');
        } finally {
            setDeletingId(null);
        }
    };

    const calculatePrices = (f: Figure) => {
        if (!settings) return { basic: 0, premium: 0 };
        const custoBase =
            (f.horas_impressao * settings.custo_h_impressao) +
            (f.resina_kg * settings.custo_resina_kg) +
            (f.horas_pintura * settings.custo_h_pintura);

        return {
            basic: custoBase * settings.margem_basica,
            premium: custoBase * settings.margem_premium
        };
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

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

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar figura ou série..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Tabela */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto shadow-2xl">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="p-4 min-w-[220px]">Figura (Clique p/ ver)</th>
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
                            {filteredFigures.map(f => {
                                const prices = calculatePrices(f);
                                return (
                                    <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors group">
                                        <td className="p-3">
                                            <button
                                                onClick={() => f.imagem_url && setPreviewImage({ url: f.imagem_url, nome: f.nome })}
                                                className="text-left group/name"
                                            >
                                                <div className="font-bold text-white leading-tight group-hover/name:text-orange-500 transition-colors flex items-center gap-2">
                                                    {f.nome}
                                                    {f.imagem_url && <ExternalLink size={12} className="opacity-0 group-hover/name:opacity-100" />}
                                                </div>
                                                <div className="text-[11px] text-zinc-500">{f.serie}</div>
                                            </button>
                                        </td>

                                        <td className="p-2">
                                            <input
                                                type="number" step="0.001"
                                                className="w-20 bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-center focus:border-orange-500 outline-none mx-auto block"
                                                value={f.resina_kg}
                                                onChange={e => handleChange(f.id, 'resina_kg', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number" step="0.1"
                                                className="w-20 bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-center focus:border-orange-500 outline-none mx-auto block"
                                                value={f.horas_impressao}
                                                onChange={e => handleChange(f.id, 'horas_impressao', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number" step="0.1"
                                                className="w-20 bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-center focus:border-orange-500 outline-none mx-auto block"
                                                value={f.horas_pintura}
                                                onChange={e => handleChange(f.id, 'horas_pintura', e.target.value)}
                                            />
                                        </td>

                                        <td className="p-2">
                                            <div className="flex gap-1 justify-center">
                                                <input className="w-10 bg-zinc-800/50 border-none rounded px-1 py-1 text-center text-[11px]" placeholder="A" value={f.altura_cm} onChange={e => handleChange(f.id, 'altura_cm', e.target.value)} />
                                                <input className="w-10 bg-zinc-800/50 border-none rounded px-1 py-1 text-center text-[11px]" placeholder="L" value={f.largura_cm} onChange={e => handleChange(f.id, 'largura_cm', e.target.value)} />
                                                <input className="w-10 bg-zinc-800/50 border-none rounded px-1 py-1 text-center text-[11px]" placeholder="P" value={f.profundidade_cm} onChange={e => handleChange(f.id, 'profundidade_cm', e.target.value)} />
                                            </div>
                                        </td>

                                        <td className="p-4 text-right font-mono font-bold text-green-400">
                                            R$ {prices.basic.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-purple-400">
                                            R$ {prices.premium.toFixed(2)}
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
                                )
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
