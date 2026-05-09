
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ArrowLeft, Search, Trash2, X, ExternalLink, Image as ImageIcon, Minus, Plus, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
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
    disponivel?: boolean;
    sinonimos?: string;
    is_campanha?: boolean;
    is_campanha_active?: boolean;
}

interface PricingSettings {
    custo_h_impressao: number;
    custo_h_pintura: number;
    custo_resina_kg: number;
    margem_basica: number;
    margem_premium: number;
    margem_pobre?: number;
    taxa_cartao?: number;
}

const FigureMobileCard = ({
    f, prices, canEdit, savingId, deletingId, hasRole,
    handleChange, handleSave, handleDelete, handleDownloadImage, setPreviewImage
}: any) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm flex flex-col gap-3">
            {/* Cabecalho */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <h3 onClick={() => f.imagem_url && setPreviewImage({ url: f.imagem_url, nome: f.nome })} className="text-sm font-bold text-orange-500 cursor-pointer">{f.nome}</h3>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{f.categoria} - {f.serie}</div>
                    <span className="font-mono text-[10px] bg-[var(--input-bg)] text-[var(--text-muted)] px-2 py-0.5 rounded-sm border border-[var(--input-border)] mt-2 inline-block">
                        SKU: {f.codigo || '--'}
                    </span>
                </div>
            </div>

            {/* Precos Principais */}
            <div className="flex flex-col gap-2 bg-[var(--input-bg)] rounded-lg p-3 border border-[var(--card-border)]">
                <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter">Estilizado</span>
                        <span className="text-xs font-black text-blue-400">R$ {prices.basicCredito}</span>
                        <span className="text-[10px] font-bold text-[var(--accent-emerald)]">PIX: R$ {prices.basic}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter">Colorido</span>
                        <span className="text-xs font-black text-blue-400">R$ {prices.premiumCredito}</span>
                        <span className="text-[10px] font-bold text-[var(--accent-fuchsia)]">PIX: R$ {prices.premium}</span>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter">2D</span>
                    <span className="text-sm font-black text-orange-500">R$ {prices.twoDCredito}</span>
                    <span className="text-[10px] font-bold text-orange-500">PIX: R$ {prices.twoD}</span>
                </div>
            </div>

            {/* Ações Rápidas & Expandir */}
            <div className="flex justify-between items-center pt-2 border-t border-[var(--card-border)] mt-1">
                <div className="flex gap-2">
                    <button
                        onClick={() => handleDownloadImage(f.id, f.nome)}
                        className="p-2 bg-blue-500/10 text-blue-500 rounded-md hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                    >
                        <ImageIcon size={14} />
                    </button>
                    {hasRole('admin') && (
                        <button
                            onClick={() => handleDelete(f.id, f.nome)}
                            disabled={deletingId === f.id}
                            className="p-2 bg-orange-400/10 text-orange-400 rounded-md hover:bg-orange-400 hover:text-white transition-all disabled:opacity-50 border border-orange-400/20"
                        >
                            {deletingId === f.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs font-semibold flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--foreground)]"
                >
                    {expanded ? 'Ocultar Edição' : 'Editar Dados'}
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {/* Expansão de Edição */}
            {expanded && (
                <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-[var(--card-border)] animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Escala */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Escala (%)</label>
                            <div className="flex items-center justify-between bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm p-1.5 shadow-sm">
                                <button
                                    onClick={() => handleChange(f.id, 'escala', Math.max(1, (Number(f.escala) || 0) - 10).toString())}
                                    disabled={!canEdit}
                                    className="p-1 text-[var(--text-muted)]"
                                >
                                    <Minus size={12} />
                                </button>
                                <input
                                    type="number"
                                    value={f.escala}
                                    disabled={!canEdit}
                                    onChange={e => handleChange(f.id, 'escala', e.target.value)}
                                    className="w-full bg-transparent text-center text-xs font-black text-orange-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                                />
                                <button
                                    onClick={() => handleChange(f.id, 'escala', ((Number(f.escala) || 0) + 10).toString())}
                                    disabled={!canEdit}
                                    className="p-1 text-[var(--text-muted)]"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>

                        {/* KG Resina */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">KG Resina</label>
                            <input
                                type="number" step="0.001"
                                value={f.resina_kg ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'resina_kg', e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-1.5 text-center text-xs font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                            />
                        </div>

                        {/* Horas Impressao */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">H. Impres.</label>
                            <input
                                type="number"
                                value={f.horas_impressao ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'horas_impressao', e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-1.5 text-center text-xs font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                            />
                        </div>

                        {/* Horas Pintura */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">H. Pintura</label>
                            <input
                                type="number"
                                value={f.horas_pintura ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'horas_pintura', e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-1.5 text-center text-xs font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Medidas */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Medidas (CM) - Altura, Largura, Prof.</label>
                        <div className="flex gap-2">
                            <input
                                type="number" step="0.1"
                                value={f.altura_cm ?? ''}
                                placeholder="Alt"
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'altura_cm', e.target.value)}
                                className="w-1/3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-xs font-black text-[var(--foreground)] outline-none disabled:opacity-50"
                            />
                            <input
                                type="number" step="0.1"
                                value={f.largura_cm ?? ''}
                                placeholder="Larg"
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'largura_cm', e.target.value)}
                                className="w-1/3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-xs font-black text-[var(--foreground)] outline-none disabled:opacity-50"
                            />
                            <input
                                type="number" step="0.1"
                                value={f.profundidade_cm ?? ''}
                                placeholder="Prof"
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'profundidade_cm', e.target.value)}
                                className="w-1/3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-xs font-black text-[var(--foreground)] outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Tags e Extras */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Sinônimos / Tags</label>
                        <input
                            type="text"
                            value={f.sinonimos || ''}
                            placeholder="Nomes PT-BR, tags..."
                            disabled={!canEdit}
                            onChange={e => handleChange(f.id, 'sinonimos', e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-1.5 text-left text-xs font-medium text-[var(--foreground)] outline-none focus:border-orange-500/50 disabled:opacity-50"
                        />
                    </div>

                    <div className="flex items-center justify-between mt-2 py-2 border-t border-[var(--card-border)]">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={f.disponivel}
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'disponivel', e.target.checked)}
                                className="w-5 h-5 rounded-sm border-[var(--input-border)] text-blue-500 bg-[var(--input-bg)] focus:ring-0"
                            />
                            <span className="text-xs font-medium text-[var(--text-muted)]">Disponível (Vitrine)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={f.tem_extras}
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'tem_extras', e.target.checked)}
                                className="w-5 h-5 rounded-sm border-[var(--input-border)] text-orange-500 bg-[var(--input-bg)] focus:ring-0"
                            />
                            <span className="text-xs font-medium text-[var(--text-muted)]">Tem Extras?</span>
                        </label>

                        <button
                            onClick={() => handleSave(f)}
                            disabled={savingId === f.id || !canEdit}
                            className="px-4 py-2 bg-orange-500/10 text-orange-500 rounded-md hover:bg-orange-500 hover:text-[var(--background)] transition-all disabled:opacity-50 font-medium text-xs flex items-center gap-2 shadow-sm"
                        >
                            {savingId === f.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

import { useSearchParams, useRouter } from 'next/navigation';

// ... (tipagens permanecem as mesmas)

function DataGridContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const studioParam = searchParams.get('studio');

    const [figures, setFigures] = useState<Figure[]>([]);
    const [settings, setSettings] = useState<PricingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null>(null);

    const { hasRole } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');

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
    const fetchFigures = useCallback(async (
        catId: number | string | null = selectedCategoryId,
        searchTerm: string = search,
        pageZero: boolean = true
    ) => {
        try {
            if (pageZero) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const params = new URLSearchParams();
            if (catId === 'sem_preco') {
                params.append('sem_preco', 'true');
            } else if (catId) {
                params.append('categoria_id', catId.toString());
            }

            // Filtro de Estúdio (vindo da URL)
            if (studioParam) {
                params.append('studio_id', studioParam);
            }

            if (searchTerm) params.append('search', searchTerm);
            if (!pageZero && nextCursor) {
                params.append('page', nextCursor.toString());
            }

            const res = await fetch(`/api/admin/figures?${params.toString()}`);
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();

            // Format 0s and nulls as empty strings for placeholders
            const formattedData = (data.items || []).map((f: Figure) => ({
                ...f,
                resina_kg: Number(f.resina_kg) === 0 ? '' : f.resina_kg,
                horas_impressao: Number(f.horas_impressao) === 0 ? '' : f.horas_impressao,
                horas_pintura: Number(f.horas_pintura) === 0 ? '' : f.horas_pintura,
                altura_cm: Number(f.altura_cm) === 0 ? '' : f.altura_cm,
                largura_cm: Number(f.largura_cm) === 0 ? '' : f.largura_cm,
                profundidade_cm: Number(f.profundidade_cm) === 0 ? '' : f.profundidade_cm,
            }));

            if (pageZero) {
                setFigures(formattedData);
            } else {
                setFigures(prev => [...prev, ...formattedData]);
            }
            setNextCursor(data.nextCursor);

        } catch (error) {
            toast.error('Erro ao carregar figuras');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedCategoryId, search, nextCursor, studioParam]); // Added studioParam as dependency

    // Initial Load & Filter Changes with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFigures(selectedCategoryId, search, true);
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [selectedCategoryId, search, studioParam]); // run when studioParam changes too

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
            sinonimos: figure.sinonimos || '',
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
        const msg = `Tem certeza que deseja excluir "${nome}"?\n\nOs metadados e sinônimos serão apagados permanentemente, mas o histórico de vendas será preservado.`;
        if (!confirm(msg)) return;

        // Atualização Otimista: Remove da tela imediatamente
        const previousFigures = [...figures];
        setFigures(prev => prev.filter(f => f.id !== id));
        setDeletingId(id);

        try {
            const res = await fetch('/api/admin/figures', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao excluir');
            }

            toast.success('Figura removida com sucesso');
            // Não precisa de fetchFigures() aqui pois já removemos otimisticamente
        } catch (err: any) {
            // Reverte se der erro
            setFigures(previousFigures);
            toast.error(err.message || 'Erro ao excluir figura');
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

        // Custo Estilizado: Pintura fixa de 20 minutos (0.33h)
        const custoBaseEstilizado =
            (h_imp * settings.custo_h_impressao) +
            (res_kg * settings.custo_resina_kg) +
            (0.33 * settings.custo_h_pintura);

        const custoBase =
            (h_imp * settings.custo_h_impressao) +
            (res_kg * settings.custo_resina_kg) +
            (h_pint * settings.custo_h_pintura);

        // Round up to nearest multiple of 5
        const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

        const mEstilizado = settings.margem_pobre || 1.15;
        const mColorido = settings.margem_basica || 1.30;
        const mTwoD = settings.margem_premium || 1.60;

        return {
            basic: roundTo5(custoBaseEstilizado * mEstilizado),
            premium: roundTo5(custoBase * mColorido),
            twoD: roundTo5(custoBase * mTwoD),
            basicCredito: roundTo5(custoBaseEstilizado * mEstilizado * (settings.taxa_cartao || 1.15)),
            premiumCredito: roundTo5(custoBase * mColorido * (settings.taxa_cartao || 1.15)),
            twoDCredito: roundTo5(custoBase * mTwoD * (settings.taxa_cartao || 1.15))
        };
    };

    if (loading && figures.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

    const CATEGORY_FILTERS = [
        { id: 'sem_preco', label: 'Falta Preço' },
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
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 relative transition-colors duration-300">
            <div className="w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-[var(--input-bg)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Catálogo & Precificação</h1>
                            <p className="text-[var(--text-muted)] text-sm font-medium">Clique no nome para ver a foto. Edite custos abaixo.</p>
                        </div>
                    </div>
                    {/* View Controls & Search Bar */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="hidden md:flex bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-1 shadow-sm">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-[var(--input-bg)] text-orange-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
                                title="Ver como Tabela"
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--input-bg)] text-orange-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
                                title="Ver como Grade"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>

                        <div className="relative w-full md:w-80">
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
                </div>

                <div className="flex gap-4 items-center mb-6">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--card-border)]">
                        {studioParam && (
                            <button
                                onClick={() => router.push('/admin/figures')}
                                className="px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/20 flex items-center gap-2 group"
                            >
                                <X size={14} className="group-hover:scale-120 transition-transform" />
                                Filtrando Estúdio: #{studioParam}
                            </button>
                        )}
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

                {/* Container Principal */}
                <div className={`bg-[var(--card-bg)] border border-[var(--card-border)] md:rounded-xl shadow-[var(--shadow-md)] backdrop-blur-sm flex flex-col -mx-4 md:mx-0 border-x-0 md:border-x ${viewMode === 'grid' ? 'bg-transparent border-none shadow-none md:p-0' : ''}`}>

                    {/* View Desktop (Tabela) */}
                    <div className={`hidden ${viewMode === 'table' ? 'md:block' : ''} overflow-auto flex-1 custom-scrollbar pb-10 md:pb-0 max-h-[75vh]`}>
                        <table className="w-full min-w-full text-left border-collapse whitespace-nowrap relative">
                            <thead className="bg-[var(--background)] sticky top-0 z-10">
                                <tr className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest border-b border-[var(--card-border)]">
                                    <th className="pl-4 pr-2 py-4 w-full min-w-[350px]">Figura</th>
                                    <th className="px-3 py-4 text-center">Sinônimos / Tags</th>
                                    <th className="px-3 py-4 text-center">SKU</th>
                                    <th className="px-3 py-4 text-center">Escala (%)</th>
                                    <th className="px-3 py-4 text-center">KG Resina</th>
                                    <th className="px-2 py-4 text-center text-[10px]">H. Impressão</th>
                                    <th className="px-2 py-4 text-center text-[10px]">H. Pintura</th>
                                    <th className="px-3 py-4 text-center">Medidas (cm)</th>
                                    <th className="px-3 py-4 text-center uppercase">Merchant</th>
                                    <th className="px-3 py-4 text-center uppercase">Extras</th>
                                    <th className="px-4 py-4 text-center text-zinc-400 group-hover:text-zinc-200 transition-colors"><div className="flex flex-col"><span>ESTILIZADO</span><span className="text-[9px] text-[var(--text-muted)] mt-0.5 uppercase tracking-tighter">PIX (-15%)</span></div></th>
                                    <th className="px-4 py-4 text-center text-zinc-400 group-hover:text-zinc-200 transition-colors"><div className="flex flex-col"><span>COLORIDO</span><span className="text-[9px] text-[var(--text-muted)] mt-0.5 uppercase tracking-tighter">PIX (-15%)</span></div></th>
                                    <th className="px-4 py-4 text-center text-orange-500"><div className="flex flex-col"><span>2D (LUXO)</span><span className="text-[9px] text-orange-600 mt-0.5 uppercase tracking-tighter font-black">PIX (-15%)</span></div></th>
                                    <th className="px-4 py-4 w-[120px] text-right">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--card-border)] text-sm">
                                {figures.map(f => {
                                    const prices = calculatePrices(f);
                                    return (
                                        <tr key={f.id} className="hover:bg-orange-500/[0.02] transition-colors group">
                                            <td className="pl-4 pr-2 py-4 w-full min-w-[350px]">
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
                                                <input
                                                    type="text"
                                                    value={f.sinonimos || ''}
                                                    placeholder="Nomes PT-BR, tags..."
                                                    disabled={!canEdit}
                                                    onChange={e => handleChange(f.id, 'sinonimos', e.target.value)}
                                                    className="w-48 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-2 text-left text-xs font-medium text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all shadow-[var(--shadow-sm)] disabled:opacity-50"
                                                />
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
                                                        disabled={!canEdit}
                                                        className="p-1 hover:text-orange-500 text-[var(--text-muted)] transition-colors disabled:opacity-30"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={f.escala}
                                                        disabled={!canEdit}
                                                        onChange={e => handleChange(f.id, 'escala', e.target.value)}
                                                        className="w-10 bg-transparent text-center text-sm font-black text-orange-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                                                    />
                                                    <button
                                                        onClick={() => handleChange(f.id, 'escala', ((Number(f.escala) || 0) + 10).toString())}
                                                        disabled={!canEdit}
                                                        className="p-1 hover:text-orange-500 text-[var(--text-muted)] transition-colors disabled:opacity-30"
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
                                                    disabled={!canEdit}
                                                    onChange={e => handleChange(f.id, 'resina_kg', e.target.value)}
                                                    className="w-24 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-2 text-center text-sm font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)] disabled:opacity-50"
                                                />
                                            </td>

                                            <td className="px-2 py-4 text-center">
                                                <input
                                                    type="number"
                                                    value={f.horas_impressao ?? ''}
                                                    placeholder="0"
                                                    disabled={!canEdit}
                                                    onChange={e => handleChange(f.id, 'horas_impressao', e.target.value)}
                                                    className="w-16 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-2 text-center text-sm font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)] disabled:opacity-50"
                                                />
                                            </td>

                                            <td className="px-2 py-4 text-center">
                                                <input
                                                    type="number"
                                                    value={f.horas_pintura ?? ''}
                                                    placeholder="0"
                                                    disabled={!canEdit}
                                                    onChange={e => handleChange(f.id, 'horas_pintura', e.target.value)}
                                                    className="w-16 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm px-2 py-2 text-center text-sm font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)] disabled:opacity-50"
                                                />
                                            </td>

                                            <td className="px-3 py-4 text-center">
                                                <div className="flex gap-1 justify-center">
                                                    <Tooltip content="Altura" position="top">
                                                        <input
                                                            type="number" step="0.1"
                                                            value={f.altura_cm ?? ''}
                                                            placeholder="0"
                                                            disabled={!canEdit}
                                                            onChange={e => handleChange(f.id, 'altura_cm', e.target.value)}
                                                            className="w-12 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-[11px] font-black text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)] disabled:opacity-50"
                                                        />
                                                    </Tooltip>
                                                    <Tooltip content="Largura" position="top">
                                                        <input
                                                            type="number" step="0.1"
                                                            value={f.largura_cm ?? ''}
                                                            placeholder="0"
                                                            disabled={!canEdit}
                                                            onChange={e => handleChange(f.id, 'largura_cm', e.target.value)}
                                                            className="w-12 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-[11px] font-black text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)] disabled:opacity-50"
                                                        />
                                                    </Tooltip>
                                                    <Tooltip content="Profundidade" position="top">
                                                        <input
                                                            type="number" step="0.1"
                                                            value={f.profundidade_cm ?? ''}
                                                            placeholder="0"
                                                            disabled={!canEdit}
                                                            onChange={e => handleChange(f.id, 'profundidade_cm', e.target.value)}
                                                            className="w-12 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm py-1.5 text-center text-[11px] font-black text-[var(--foreground)] outline-none focus:border-orange-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[var(--shadow-sm)] disabled:opacity-50"
                                                        />
                                                    </Tooltip>
                                                </div>
                                            </td>

                                            <td className="px-3 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={f.disponivel}
                                                    disabled={!canEdit}
                                                    onChange={e => handleChange(f.id, 'disponivel', e.target.checked)}
                                                    className="w-5 h-5 rounded-sm border-[var(--input-border)] text-blue-500 bg-[var(--input-bg)] focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </td>

                                            <td className="px-3 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={f.tem_extras}
                                                    disabled={!canEdit}
                                                    onChange={e => handleChange(f.id, 'tem_extras', e.target.checked)}
                                                    className="w-5 h-5 rounded-sm border-[var(--input-border)] text-orange-500 bg-[var(--input-bg)] focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="text-[13px] font-black text-blue-400 whitespace-nowrap">R$ {prices.basicCredito}</div>
                                                    <div className="text-[10px] font-bold text-[var(--text-muted)]">PIX R$ {prices.basic}</div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="text-[13px] font-black text-blue-400 whitespace-nowrap">R$ {prices.premiumCredito}</div>
                                                    <div className="text-[10px] font-bold text-[var(--text-muted)]">PIX R$ {prices.premium}</div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-center bg-orange-500/5">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="text-[15px] font-black text-orange-500 whitespace-nowrap drop-shadow-sm">R$ {prices.twoDCredito}</div>
                                                    <div className="text-[10px] font-black text-orange-600">PIX R$ {prices.twoD}</div>
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
                                                                className="p-2.5 bg-orange-400/10 text-orange-400 rounded-md hover:bg-orange-400 hover:text-white transition-all disabled:opacity-50 border border-orange-400/20 shadow-[var(--shadow-sm)]"
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
                    </div>

                    {/* View Mobile (Sempre Grade) E Desktop (Se selecionou Grade) */}
                    <div className={`${viewMode === 'table' ? 'md:hidden' : ''} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-0 text-[var(--foreground)] bg-transparent w-full`}>
                        {figures.map(f => {
                            const prices = calculatePrices(f);
                            return (
                                <FigureMobileCard
                                    key={f.id}
                                    f={f}
                                    prices={prices}
                                    canEdit={canEdit}
                                    savingId={savingId}
                                    deletingId={deletingId}
                                    hasRole={hasRole}
                                    handleChange={handleChange}
                                    handleSave={handleSave}
                                    handleDelete={handleDelete}
                                    handleDownloadImage={handleDownloadImage}
                                    setPreviewImage={setPreviewImage}
                                />
                            );
                        })}
                    </div>
                    {/* Botão Carregar Mais - Compartilhado */}
                    {nextCursor !== undefined && (
                        <div className={`flex justify-center p-6 w-full ${viewMode === 'table' ? 'border-t border-[var(--card-border)] bg-[var(--background)]' : 'mt-4'}`}>
                            <button
                                onClick={() => fetchFigures(selectedCategoryId, search, false)}
                                disabled={loadingMore}
                                className="px-6 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-full text-sm font-medium hover:bg-[var(--input-bg)] hover:text-orange-500 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
                                {loadingMore ? 'Carregando...' : 'Carregar Mais Figuras'}
                            </button>
                        </div>
                    )}
                    {/* Fim do Container Principal */}
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

export default function DataGridPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" />
            </div>
        }>
            <DataGridContent />
        </Suspense>
    );
}
