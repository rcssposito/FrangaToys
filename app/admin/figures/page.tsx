
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ArrowLeft, Search, Trash2, X, ExternalLink, Image as ImageIcon, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import ThemeToggle from '@/components/common/ThemeToggle';
import Tooltip from '@/components/ui/Tooltip';

interface Figure {
    id: number;
    nome: string;
    codigo?: string;
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
    tem_extras?: boolean;
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
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null>(null);

    const { hasRole } = usePermission();
    // Check if user has permission to edit (admin or pricing)
    // Users with ONLY 'orcamento' role can view but not edit
    const canEdit = hasRole('admin') || hasRole('pricing');

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
    const fetchFigures = useCallback(async (catId: number | string | null = selectedCategoryId, searchTerm: string = search) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (catId === 'novidades') {
                params.append('novidades', 'true');
            } else if (catId) {
                params.append('categoria_id', catId.toString());
            }
            if (searchTerm) params.append('search', searchTerm);

            const res = await fetch(`/api/admin/figures?${params.toString()}`);
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();

            // Format 0s and nulls as empty strings for placeholders
            const formattedData = data.map((f: Figure) => ({
                ...f,
                resina_kg: Number(f.resina_kg) === 0 ? '' : f.resina_kg,
                horas_impressao: Number(f.horas_impressao) === 0 ? '' : f.horas_impressao,
                horas_pintura: Number(f.horas_pintura) === 0 ? '' : f.horas_pintura,
                altura_cm: Number(f.altura_cm) === 0 ? '' : f.altura_cm,
                largura_cm: Number(f.largura_cm) === 0 ? '' : f.largura_cm,
                profundidade_cm: Number(f.profundidade_cm) === 0 ? '' : f.profundidade_cm,
            }));

            setFigures(formattedData);
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

    const handleChange = (id: number, field: keyof Figure, value: string | boolean) => {
        setFigures(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const handleSave = async (figure: Figure) => {
        setSavingId(figure.id);

        // Ensure values are numbers for API, or null if empty
        const toNumberOrNull = (val: any) => {
            if (val === '' || val === null || val === undefined) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        };

        const payload = {
            ...figure,
            resina_kg: toNumberOrNull(figure.resina_kg),
            horas_impressao: toNumberOrNull(figure.horas_impressao),
            horas_pintura: toNumberOrNull(figure.horas_pintura),
            altura_cm: toNumberOrNull(figure.altura_cm),
            largura_cm: toNumberOrNull(figure.largura_cm),
            profundidade_cm: toNumberOrNull(figure.profundidade_cm),
            escala: toNumberOrNull(figure.escala) || 100,
            tem_extras: !!figure.tem_extras,
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

    const handleDownloadImage = async (id: number, nome: string) => {
        try {
            toast.loading(`Gerando cartão de ${nome}...`, { id: 'gera-cartao' });

            const url = `/api/orcamento/${id}`;
            const link = document.createElement('a');
            link.href = url;
            // The browser will download the generated image
            link.download = `Orcamento_${nome.replace(/[^a-z0-9]/gi, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Cartão gerado!', { id: 'gera-cartao' });
        } catch (err) {
            toast.error('Erro ao gerar cartão', { id: 'gera-cartao' });
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
            premium: roundTo5(custoBase * settings.margem_premium),
            basicCredito: roundTo5(custoBase * settings.margem_basica * 1.10),
            premiumCredito: roundTo5(custoBase * settings.margem_premium * 1.10)
        };
    };

    if (loading && figures.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

    const CATEGORY_FILTERS = [
        { id: 'novidades', label: 'Novidades' },
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
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 relative transition-colors duration-300">
            <div className="mx-auto max-w-[1500px]">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-[var(--input-bg)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Catálogo & Precificação</h1>
                            <p className="text-[var(--text-muted)] text-sm font-medium">Clique no nome para ver a foto. Edite custos abaixo.</p>
                        </div>
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar figura..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[var(--card-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-all shadow-[var(--shadow-sm)] text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                        />
                    </div>
                </div>

                <div className="flex gap-4 items-center mb-6">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--card-border)]">
                        <button
                            onClick={() => setSelectedCategoryId(null)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!selectedCategoryId ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]'}`}
                        >
                            Todas
                        </button>
                        {CATEGORY_FILTERS.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategoryId === cat.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabela */}
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-auto shadow-[var(--shadow-md)] backdrop-blur-sm max-h-[75vh]">
                    <table className="w-full text-left border-collapse whitespace-nowrap relative">
                        <thead className="bg-[var(--background)] sticky top-0 z-10">
                            <tr className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest border-b border-[var(--card-border)]">
                                <th className="pl-4 pr-2 py-4 w-[350px]">Figura</th>
                                <th className="px-3 py-4 text-center">SKU</th>
                                <th className="px-3 py-4 text-center">Escala (%)</th>
                                <th className="px-3 py-4 text-center">KG Resina</th>
                                <th className="px-2 py-4 text-center text-[10px]">H. Impressão</th>
                                <th className="px-2 py-4 text-center text-[10px]">H. Pintura</th>
                                <th className="px-3 py-4 text-center">Medidas (cm)</th>
                                <th className="px-3 py-4 text-center uppercase">Extras</th>
                                <th className="px-4 py-4 text-center text-[var(--accent-emerald)]"><div className="flex flex-col"><span>Básico (Cartão)</span><span className="text-[9px] text-[var(--text-muted)] mt-0.5">PIX (-10%)</span></div></th>
                                <th className="px-4 py-4 text-center text-[var(--accent-fuchsia)]"><div className="flex flex-col"><span>Premium (Cartão)</span><span className="text-[9px] text-[var(--text-muted)] mt-0.5">PIX (-10%)</span></div></th>
                                <th className="px-4 py-4 text-right">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)] text-sm">
                            {figures.map(f => {
                                const prices = calculatePrices(f);
                                return (
                                    <tr key={f.id} className="hover:bg-orange-500/[0.02] transition-colors group">
                                        <td className="pl-4 pr-2 py-4 w-[350px]">
                                            <div
                                                onClick={() => f.imagem_url && setPreviewImage({ url: f.imagem_url, nome: f.nome })}
                                                className="cursor-pointer text-left group/name"
                                            >
                                                <h3 className="text-sm font-bold text-[var(--foreground)] group-hover:text-orange-500 transition-colors truncate max-w-[340px]">
                                                    {f.nome}
                                                </h3>
                                                <div className="text-xs text-[var(--text-muted)] truncate max-w-[340px]">{f.categoria} - {f.serie}</div>
                                            </div>
                                        </td>

                                        <td className="px-3 py-4 text-center">
                                            <span className="font-mono text-[10px] bg-[var(--input-bg)] text-[var(--text-muted)] px-2 py-1 rounded-sm border border-[var(--input-border)]">
                                                {f.codigo || '--'}
                                            </span>
                                        </td>

                                        <td className="px-3 py-4">
                                            <div className="flex items-center justify-center gap-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm p-1.5 w-fit mx-auto transition-all shadow-[var(--shadow-sm)] group-hover:border-orange-500/30">
                                                <button
                                                    onClick={() => handleChange(f.id, 'escala', Math.max(1, (Number(f.escala) || 0) - 10).toString())}
                                                    className="p-1 hover:text-orange-500 text-[var(--text-muted)] transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={f.escala}
                                                    onChange={e => handleChange(f.id, 'escala', e.target.value)}
                                                    className="w-10 bg-transparent text-center text-sm font-black text-orange-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    onClick={() => handleChange(f.id, 'escala', ((Number(f.escala) || 0) + 10).toString())}
                                                    className="p-1 hover:text-orange-500 text-[var(--text-muted)] transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </td>

                                        <td className="px-3 py-4 text-center">
                                            <input
                                                type="number" step="0.001"
                                                value={f.resina_kg ?? ''}
                                                placeholder="0"
                                                onChange={e => handleChange(f.id, 'resina_kg', e.target.value)}
                                                className="w-24 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-2 text-center text-sm font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)]"
                                            />
                                        </td>

                                        <td className="px-2 py-4 text-center">
                                            <input
                                                type="number"
                                                value={f.horas_impressao ?? ''}
                                                placeholder="0"
                                                onChange={e => handleChange(f.id, 'horas_impressao', e.target.value)}
                                                className="w-16 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-2 text-center text-sm font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)]"
                                            />
                                        </td>

                                        <td className="px-2 py-4 text-center">
                                            <input
                                                type="number"
                                                value={f.horas_pintura ?? ''}
                                                placeholder="0"
                                                onChange={e => handleChange(f.id, 'horas_pintura', e.target.value)}
                                                className="w-16 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-2 text-center text-sm font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)]"
                                            />
                                        </td>

                                        <td className="px-3 py-4 text-center">
                                            <div className="flex gap-1 justify-center">
                                                <Tooltip content="Altura" position="top">
                                                    <input
                                                        type="number" step="0.1"
                                                        value={f.altura_cm ?? ''}
                                                        placeholder="0"
                                                        onChange={e => handleChange(f.id, 'altura_cm', e.target.value)}
                                                        className="w-12 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-[11px] font-black text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)]"
                                                    />
                                                </Tooltip>
                                                <Tooltip content="Largura" position="top">
                                                    <input
                                                        type="number" step="0.1"
                                                        value={f.largura_cm ?? ''}
                                                        placeholder="0"
                                                        onChange={e => handleChange(f.id, 'largura_cm', e.target.value)}
                                                        className="w-12 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-[11px] font-black text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)]"
                                                    />
                                                </Tooltip>
                                                <Tooltip content="Profundidade" position="top">
                                                    <input
                                                        type="number" step="0.1"
                                                        value={f.profundidade_cm ?? ''}
                                                        placeholder="0"
                                                        onChange={e => handleChange(f.id, 'profundidade_cm', e.target.value)}
                                                        className="w-12 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-[11px] font-black text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)]"
                                                    />
                                                </Tooltip>
                                            </div>
                                        </td>

                                        <td className="px-3 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={f.tem_extras}
                                                onChange={e => handleChange(f.id, 'tem_extras', e.target.checked)}
                                                className="w-5 h-5 rounded-sm border-[var(--input-border)] text-orange-500 bg-[var(--input-bg)] focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all"
                                            />
                                        </td>

                                        <td className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="text-[15px] font-black text-blue-400 whitespace-nowrap drop-shadow-sm">R$ {prices.basicCredito}</div>
                                                <div className="text-[10px] font-bold text-[var(--accent-emerald)] opacity-90">PIX: R$ {prices.basic}</div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="text-[15px] font-black text-blue-400 whitespace-nowrap drop-shadow-sm">R$ {prices.premiumCredito}</div>
                                                <div className="text-[10px] font-bold text-[var(--accent-fuchsia)] opacity-90">PIX: R$ {prices.premium}</div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Tooltip content={canEdit ? "Salvar Alterações" : "Sem permissão para salvar"} position="top">
                                                    <button
                                                        onClick={() => handleSave(f)}
                                                        disabled={savingId === f.id || !canEdit}
                                                        className="p-2.5 bg-orange-500/10 text-orange-500 rounded-md hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-orange-500/20 shadow-[var(--shadow-sm)]"
                                                    >
                                                        {savingId === f.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    </button>
                                                </Tooltip>
                                                {hasRole('admin') && (
                                                    <Tooltip content="Excluir Figura" position="top">
                                                        <button
                                                            onClick={() => handleDelete(f.id, f.nome)}
                                                            disabled={deletingId === f.id}
                                                            className="p-2.5 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 border border-red-500/20 shadow-[var(--shadow-sm)]"
                                                        >
                                                            {deletingId === f.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                <Tooltip content="Baixar Cartão de Orçamento" position="top">
                                                    <button
                                                        onClick={() => handleDownloadImage(f.id, f.nome)}
                                                        className="p-2.5 bg-blue-500/10 text-blue-500 rounded-md hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20 shadow-[var(--shadow-sm)]"
                                                    >
                                                        <ImageIcon size={16} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody >
                    </table >
                </div >
            </div >

            {/* Image Preview Modal */}
            {
                previewImage && (
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
                )
            }
        </div >
    );
}
