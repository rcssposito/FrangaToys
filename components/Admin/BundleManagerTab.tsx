'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Boxes,
    Plus,
    Search,
    Trash2,
    Edit3,
    Clock,
    Layers,
    DollarSign,
    Check,
    X,
    Loader2,
    Upload,
    Percent,
    AlertCircle,
    Package,
    Image as ImageIcon,
    Columns,
    CheckCircle2,
    ChevronDown,
    ChevronsUpDown
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ComponentItem {
    id: number;
    nome: string;
    codigo?: string | null;
    imagem_url?: string | null;
    imagem_secundaria?: string | null;
    fotos_extras?: string[];
    quantidade: number;
    resina_kg?: number;
    horas_impressao?: number;
    horas_pintura?: number;
    preco_colorido?: number;
    preco_estilizado?: number;
    disponivel?: boolean;
}

interface BundleData {
    id: number;
    nome: string;
    codigo?: string | null;
    slug: string;
    imagem_url?: string | null;
    imagem_secundaria?: string | null;
    fotos_extras?: string[];
    desconto_bundle_pct: number;
    preco_fixo_bundle?: number | null;
    disponivel: boolean;
    todas_pecas_disponiveis?: boolean;
    componentes: ComponentItem[];
    summary: {
        horas_pintura_total: number;
        horas_impressao_total: number;
        resina_kg_total: number;
        custo_producao_total: number;
        preco_cheio_colorido: number;
        preco_cheio_estilizado: number;
        desconto_pct: number;
        preco_bundle_colorido: number;
        preco_bundle_estilizado: number;
        economia_colorido: number;
    };
}

export default function BundleManagerTab() {
    const [bundles, setBundles] = useState<BundleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<BundleData | null>(null);

    // Controle de cards colapsados
    const [expandedBundleIds, setExpandedBundleIds] = useState<Record<number, boolean>>({});

    const toggleBundleExpand = (id: number) => {
        setExpandedBundleIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const isAllExpanded = bundles.length > 0 && bundles.every(b => expandedBundleIds[b.id]);

    const toggleExpandAll = () => {
        if (isAllExpanded) {
            setExpandedBundleIds({});
        } else {
            const all: Record<number, boolean> = {};
            bundles.forEach(b => { all[b.id] = true; });
            setExpandedBundleIds(all);
        }
    };

    // Form State
    const [nome, setNome] = useState('');
    const [codigo, setCodigo] = useState('');
    const [descontoPct, setDescontoPct] = useState<number>(15);
    const [precoFixo, setPrecoFixo] = useState<string>('');
    const [selectedComponents, setSelectedComponents] = useState<ComponentItem[]>([]);
    const [capaUrl, setCapaUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // Busca de figuras para adicionar
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Carrega bundles
    const fetchBundles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/bundles');
            if (!res.ok) throw new Error('Falha ao buscar bundles');
            const data = await res.json();
            setBundles(data.bundles || []);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao carregar bundles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBundles();
    }, []);

    // Busca figuras componentes (com limpeza do termo para maximizar acertos)
    useEffect(() => {
        const cleanQuery = searchQuery.trim();
        if (!cleanQuery || cleanQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Remove traços soltos no final da string para a query não falhar
                const queryTerm = cleanQuery.replace(/\s*-\s*$/, '').trim();
                const res = await fetch(`/api/admin/figures?search=${encodeURIComponent(queryTerm)}&limit=15`);
                if (res.ok) {
                    const data = await res.json();
                    // O endpoint retorna { items: formatted }
                    const items = data.items || data.figures || [];
                    setSearchResults(items);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const handleOpenCreate = () => {
        setEditingBundle(null);
        setNome('');
        setCodigo('');
        setDescontoPct(15);
        setPrecoFixo('');
        setSelectedComponents([]);
        setCapaUrl('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (b: BundleData) => {
        setEditingBundle(b);
        setNome(b.nome);
        setCodigo(b.codigo || '');
        setDescontoPct(b.desconto_bundle_pct || 0);
        setPrecoFixo(b.preco_fixo_bundle ? String(b.preco_fixo_bundle) : '');
        setSelectedComponents(b.componentes || []);
        setCapaUrl(b.imagem_url || '');
        setIsModalOpen(true);
    };

    const handleAddComponent = (fig: any) => {
        if (selectedComponents.some(c => c.id === fig.id)) {
            toast.warning('Esta figura já está na lista do bundle');
            return;
        }

        const newComp: ComponentItem = {
            id: fig.id,
            nome: fig.nome,
            codigo: fig.codigo,
            imagem_url: fig.imagem_url,
            imagem_secundaria: fig.imagem_secundaria || null,
            fotos_extras: Array.isArray(fig.fotos_extras) ? fig.fotos_extras : [],
            quantidade: 1,
            resina_kg: Number(fig.resina_kg) || 0,
            horas_impressao: Number(fig.horas_impressao) || 0,
            horas_pintura: Number(fig.horas_pintura) || 0,
            preco_colorido: Number(fig.precos?.colorido) || 0,
            preco_estilizado: Number(fig.precos?.estilizado) || 0,
            disponivel: fig.disponivel !== false,
        };

        if (fig.disponivel === false) {
            toast.warning(`Atenção: "${fig.nome}" está desativada no catálogo. O combo só ficará visível na vitrine quando todas as suas peças estiverem ativas.`);
        }

        const updated = [...selectedComponents, newComp];
        setSelectedComponents(updated);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleToggleDisponivel = async (bundle: BundleData) => {
        if (!bundle.todas_pecas_disponiveis && !bundle.disponivel) {
            toast.error('Não é possível ativar este bundle: uma ou mais peças componentes estão desativadas ou o estúdio está sem merchant.');
            return;
        }

        const novoStatus = !bundle.disponivel;
        try {
            const res = await fetch('/api/admin/bundles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: bundle.id, disponivel: novoStatus }),
            });
            if (!res.ok) throw new Error('Erro ao alterar disponibilidade');
            toast.success(novoStatus ? 'Bundle ativado na vitrine!' : 'Bundle pausado da vitrine.');
            fetchBundles();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao alterar status');
        }
    };

    const handleRemoveComponent = (id: number) => {
        const updated = selectedComponents.filter(c => c.id !== id);
        setSelectedComponents(updated);
        // Se a capa atual era da figura removida, troca para a primeira disponível
        if (capaUrl && !updated.some(c => c.imagem_url === capaUrl) && updated[0]?.imagem_url) {
            setCapaUrl(updated[0].imagem_url);
        }
    };

    const handleUpdateQuantity = (id: number, delta: number) => {
        setSelectedComponents(prev => prev.map(c => {
            if (c.id === id) {
                const nextQty = Math.max(1, (c.quantidade || 1) + delta);
                return { ...c, quantidade: nextQty };
            }
            return c;
        }));
    };

    // Gera Colagem Automática (Crop Lado a Lado / Split View) das Figuras Selecionadas
    const handleGenerateCollage = async () => {
        const validImages = selectedComponents.map(c => c.imagem_url).filter(Boolean) as string[];
        if (validImages.length < 2) {
            toast.error('Adicione pelo menos 2 figuras para gerar a colagem combinada');
            return;
        }

        setIsGeneratingCollage(true);
        toast.loading('Gerando colagem das peças combinadas...', { id: 'collage' });

        try {
            const canvas = document.createElement('canvas');
            const size = 1000;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Não foi possível inicializar Canvas');

            // Fundo escuro premium
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(0, 0, size, size);

            // Carrega as imagens
            const loadedImages: HTMLImageElement[] = await Promise.all(
                validImages.slice(0, 4).map(url => {
                    return new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new window.Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error('Erro ao carregar imagem para colagem'));
                        img.src = url;
                    });
                })
            );

            // Desenha com layouts modernos inteligentes
            if (loadedImages.length === 2) {
                // Split 50/50 vertical elegante
                const w = size / 2;
                loadedImages.forEach((img, idx) => {
                    const x = idx * w;
                    // Draw image covering half
                    drawImageProp(ctx, img, x, 0, w, size);
                });
                // Linha divisória fina neon
                ctx.strokeStyle = '#27272a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(size / 2, 0);
                ctx.lineTo(size / 2, size);
                ctx.stroke();
            } else if (loadedImages.length === 3) {
                // 1 grande na esquerda, 2 empilhadas na direita
                drawImageProp(ctx, loadedImages[0], 0, 0, size * 0.55, size);
                drawImageProp(ctx, loadedImages[1], size * 0.55, 0, size * 0.45, size * 0.5);
                drawImageProp(ctx, loadedImages[2], size * 0.55, size * 0.5, size * 0.45, size * 0.5);

                ctx.strokeStyle = '#27272a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(size * 0.55, 0);
                ctx.lineTo(size * 0.55, size);
                ctx.moveTo(size * 0.55, size * 0.5);
                ctx.lineTo(size, size * 0.5);
                ctx.stroke();
            } else {
                // Grade 2x2
                const half = size / 2;
                drawImageProp(ctx, loadedImages[0], 0, 0, half, half);
                drawImageProp(ctx, loadedImages[1], half, 0, half, half);
                drawImageProp(ctx, loadedImages[2], 0, half, half, half);
                drawImageProp(ctx, loadedImages[3], half, half, half, half);

                ctx.strokeStyle = '#27272a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(half, 0);
                ctx.lineTo(half, size);
                ctx.moveTo(0, half);
                ctx.lineTo(size, half);
                ctx.stroke();
            }

            // Converte Canvas para Blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Erro ao exportar blob')), 'image/webp', 0.85);
            });

            // Envia para o Cloudflare R2
            const file = new File([blob], `bundle_${Date.now()}.webp`, { type: 'image/webp' });
            const formData = new FormData();
            formData.append('file', file);
            formData.append('figureName', nome.trim() || 'Bundle');
            formData.append('categoria', 'bundles');
            formData.append('index', '1');

            const uploadRes = await fetch('/api/admin/figures/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) throw new Error('Falha no upload da colagem para o Cloudflare R2');
            const uploadData = await uploadRes.json();

            setCapaUrl(uploadData.url);
            toast.success('Colagem gerada e salva no Cloudflare R2 com sucesso!', { id: 'collage' });
        } catch (err: any) {
            console.error('Erro na colagem:', err);
            toast.error(err.message || 'Erro ao gerar colagem automática', { id: 'collage' });
        } finally {
            setIsGeneratingCollage(false);
        }
    };

    // Helper para desenhar imagem em estilo "object-fit: cover" no Canvas
    function drawImageProp(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
        const imgRatio = img.width / img.height;
        const targetRatio = w / h;
        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        if (imgRatio > targetRatio) {
            sWidth = img.height * targetRatio;
            sx = (img.width - sWidth) / 2;
        } else {
            sHeight = img.width / targetRatio;
            sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
    }

    // Upload de arquivo customizado do PC
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingPhoto(true);
        toast.loading('Enviando foto para o Cloudflare R2...', { id: 'upload-capa' });
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('figureName', nome.trim() || 'Bundle');
            formData.append('categoria', 'bundles');
            formData.append('index', '1');

            const res = await fetch('/api/admin/figures/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Erro no upload da foto');
            const data = await res.json();
            setCapaUrl(data.url);
            toast.success('Foto enviada e definida como capa!', { id: 'upload-capa' });
        } catch (err: any) {
            toast.error(err.message || 'Falha no upload', { id: 'upload-capa' });
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Cálculos em tempo real para o modal
    const totalHorasPintura = selectedComponents.reduce((acc, c) => acc + (c.horas_pintura || 0) * (c.quantidade || 1), 0);
    const totalResina = selectedComponents.reduce((acc, c) => acc + (c.resina_kg || 0) * (c.quantidade || 1), 0);
    const precoCheioSoma = selectedComponents.reduce((acc, c) => {
        const p = c.preco_colorido || 0;
        return acc + p * (c.quantidade || 1);
    }, 0);

    const safeDesconto = Math.max(0, Math.min(100, Number(descontoPct) || 0));
    const precoBundleCalculado = precoFixo ? Number(precoFixo) : Math.ceil((precoCheioSoma * (1 - safeDesconto / 100)) / 5) * 5;
    const economiaCalculada = Math.max(0, precoCheioSoma - precoBundleCalculado);

    const handleSaveBundle = async () => {
        if (!nome.trim()) {
            toast.error('Informe o nome do bundle');
            return;
        }
        if (selectedComponents.length === 0) {
            toast.error('Adicione pelo menos 1 figura ao bundle');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                id: editingBundle?.id,
                nome: nome.trim(),
                codigo: codigo.trim() || null,
                imagem_url: capaUrl || null,
                desconto_bundle_pct: safeDesconto,
                preco_fixo_bundle: precoFixo ? Number(precoFixo) : null,
                componentesIds: selectedComponents.map(c => ({ id: c.id, quantidade: c.quantidade || 1 })),
            };

            const method = editingBundle ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/bundles', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao salvar bundle');
            }

            toast.success(editingBundle ? 'Bundle atualizado com sucesso!' : 'Bundle criado com sucesso!');
            setIsModalOpen(false);
            fetchBundles();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar bundle');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBundle = async (bundle: BundleData) => {
        if (!confirm(`Tem certeza que deseja excluir o bundle "${bundle.nome}"?\nAs figuras filhas NÃO serão afetadas.`)) return;

        try {
            const res = await fetch('/api/admin/figures', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: bundle.id }),
            });

            if (!res.ok) throw new Error('Falha ao excluir bundle');
            toast.success('Bundle excluído com sucesso!');
            fetchBundles();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir');
        }
    };

    return (
        <div className="space-y-4">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 shrink-0">
                        <Boxes size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-zinc-100">
                                SKUs Compostos (Bundles & Kits)
                            </h2>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-400">
                                {bundles.length} {bundles.length === 1 ? 'registro' : 'registros'}
                            </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                            Tempos de pintura e consumo de resina somados automaticamente a partir das peças filhas.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {bundles.length > 0 && (
                        <button
                            type="button"
                            onClick={toggleExpandAll}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 font-medium text-xs rounded-lg transition-colors border border-zinc-800 hover:border-zinc-700 flex items-center gap-1.5 cursor-pointer shrink-0"
                            title={isAllExpanded ? "Recolher todos os cards" : "Expandir todos os cards"}
                        >
                            <ChevronsUpDown size={13} className="text-zinc-400" />
                            <span>{isAllExpanded ? 'Recolher Todos' : 'Expandir Todos'}</span>
                        </button>
                    )}
                    <button
                        onClick={handleOpenCreate}
                        className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        Novo Bundle
                    </button>
                </div>
            </div>

            {/* Listagem de Bundles */}
            {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-zinc-500">
                    <Loader2 className="animate-spin text-orange-500" size={24} />
                    <span className="text-xs font-mono uppercase tracking-wider">Carregando bundles...</span>
                </div>
            ) : bundles.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-zinc-800 bg-zinc-900/20 rounded-xl p-8 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                        <Boxes size={22} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-zinc-200">Nenhum bundle cadastrado</h3>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto">
                            Agrupe figuras individuais em um único SKU composto com cálculo automático de insumos e desconto percentual.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        Criar Primeiro Bundle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {bundles.map(bundle => {
                        const isExpanded = !!expandedBundleIds[bundle.id];

                        return (
                            <div
                                key={bundle.id}
                                className={`bg-zinc-900/50 border rounded-xl transition-colors overflow-hidden ${
                                    isExpanded
                                        ? 'border-zinc-700 bg-zinc-900/80 p-4 space-y-3.5'
                                        : 'border-zinc-800/90 hover:border-zinc-700/80 p-3.5'
                                }`}
                            >
                                {/* Header do Card (clicável para expandir/colapsar) */}
                                <div className="flex items-center justify-between gap-3">
                                    <div
                                        onClick={() => toggleBundleExpand(bundle.id)}
                                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none group"
                                        title={isExpanded ? 'Clique para recolher' : 'Clique para expandir'}
                                    >
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 group-hover:border-zinc-700 transition-colors">
                                            {bundle.imagem_url ? (
                                                <Image
                                                    src={bundle.imagem_url}
                                                    alt={bundle.nome}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                    <Boxes size={18} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800">
                                                    #{bundle.id}
                                                </span>
                                                {bundle.codigo && (
                                                    <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded">
                                                        {bundle.codigo}
                                                    </span>
                                                )}
                                                {bundle.todas_pecas_disponiveis === false ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-950/40 text-red-400 border border-red-500/20 flex items-center gap-1">
                                                        <AlertCircle size={10} />
                                                        Peça Inativa
                                                    </span>
                                                ) : (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                                                        bundle.disponivel
                                                            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/25'
                                                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${bundle.disponivel ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                                        {bundle.disponivel ? 'Ativo' : 'Pausado'}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-bold text-zinc-100 mt-1 leading-tight truncate group-hover:text-white transition-colors">
                                                {bundle.nome}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 flex-wrap font-mono">
                                                <span className="text-zinc-400">
                                                    {bundle.componentes.length} {bundle.componentes.length === 1 ? 'peça' : 'peças'}
                                                </span>
                                                <span>·</span>
                                                <span className="text-emerald-400 font-semibold">
                                                    R$ {bundle.summary.preco_bundle_colorido}
                                                </span>
                                                {bundle.summary.desconto_pct > 0 && (
                                                    <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/70 px-1.5 py-0.2 rounded">
                                                        -{bundle.summary.desconto_pct}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações e Botão Chevron */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleDisponivel(bundle);
                                            }}
                                            className={`p-2 rounded-lg text-xs transition-colors border cursor-pointer ${
                                                bundle.disponivel
                                                    ? 'bg-zinc-900 text-emerald-400 border-zinc-800 hover:border-zinc-700'
                                                    : 'bg-zinc-950 text-zinc-500 border-zinc-800/80 hover:border-zinc-700'
                                            }`}
                                            title={bundle.disponivel ? 'Pausar da vitrine' : 'Ativar na vitrine'}
                                        >
                                            <span className={`block w-2 h-2 rounded-full ${bundle.disponivel ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEdit(bundle);
                                            }}
                                            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors cursor-pointer"
                                            title="Editar Bundle"
                                        >
                                            <Edit3 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteBundle(bundle);
                                            }}
                                            className="p-2 rounded-lg bg-zinc-900 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 transition-colors cursor-pointer"
                                            title="Excluir Bundle"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleBundleExpand(bundle.id)}
                                            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                                                isExpanded
                                                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                                            }`}
                                            title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                        >
                                            <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-orange-400' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Conteúdo Expandido (Componentes do Kit + Métricas) */}
                                {isExpanded && (
                                    <div className="pt-3 border-t border-zinc-800/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                        {/* Componentes do Kit */}
                                        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5 space-y-1.5">
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                                                Composição ({bundle.componentes.length} {bundle.componentes.length === 1 ? 'item' : 'itens'})
                                            </span>
                                            <div className="divide-y divide-zinc-800/60">
                                                {bundle.componentes.map(comp => (
                                                    <div key={comp.id} className="flex items-center justify-between text-xs py-1.5 first:pt-0.5 last:pb-0.5">
                                                        <div className="flex items-center gap-2 truncate pr-2">
                                                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[10px] shrink-0">
                                                                {comp.quantidade}x
                                                            </span>
                                                            <span className="font-medium text-zinc-200 truncate">{comp.nome}</span>
                                                            {comp.disponivel === false && (
                                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-red-950/50 text-red-400 border border-red-500/30 shrink-0">
                                                                    Inativa
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 shrink-0 font-mono">
                                                            <span className="flex items-center gap-1 text-zinc-500">
                                                                <Clock size={10} /> {comp.horas_pintura}h
                                                            </span>
                                                            <span className="flex items-center gap-1 text-zinc-500">
                                                                <Layers size={10} /> {(comp.resina_kg || 0) * 1000}g
                                                            </span>
                                                            {comp.preco_colorido ? (
                                                                <span className="text-zinc-300">R$ {comp.preco_colorido}</span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Métricas e Precificação Dinâmica */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                                                <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                                                    <Clock size={10} className="text-zinc-400" /> Pintura
                                                </div>
                                                <div className="text-xs font-bold text-zinc-200 mt-1 font-mono">
                                                    {bundle.summary.horas_pintura_total} h
                                                </div>
                                            </div>
                                            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                                                <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                                                    <Layers size={10} className="text-zinc-400" /> Resina
                                                </div>
                                                <div className="text-xs font-bold text-zinc-200 mt-1 font-mono">
                                                    {(bundle.summary.resina_kg_total * 1000).toFixed(0)} g
                                                </div>
                                            </div>
                                            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                                                <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                                                    <DollarSign size={10} className="text-zinc-400" /> Soma Avulsa
                                                </div>
                                                <div className="text-xs font-bold text-zinc-500 line-through mt-1 font-mono">
                                                    R$ {bundle.summary.preco_cheio_colorido}
                                                </div>
                                            </div>
                                            <div className="bg-zinc-950 border border-emerald-500/30 rounded-lg p-2.5">
                                                <div className="text-[10px] font-mono uppercase text-emerald-500/80 flex items-center justify-between">
                                                    <span>Preço Kit</span>
                                                    <span>-{bundle.summary.desconto_pct}%</span>
                                                </div>
                                                <div className="text-xs font-bold text-emerald-400 mt-1 font-mono">
                                                    R$ {bundle.summary.preco_bundle_colorido}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Criação / Edição de Bundle */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
                                    <Boxes size={15} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-100">
                                        {editingBundle ? 'Editar Bundle de Figuras' : 'Novo Bundle (SKU Composto)'}
                                    </h3>
                                    <p className="text-[11px] text-zinc-500">
                                        Selecione as figuras componentes. Os tempos e custos são somados automaticamente.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto space-y-5 flex-1">
                            {/* Dados Básicos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-zinc-400">Nome do Bundle *</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Attack on Titan - Titans v1"
                                        value={nome}
                                        onChange={e => setNome(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-zinc-400">SKU / Código (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: BND-001"
                                        value={codigo}
                                        onChange={e => setCodigo(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-600 transition-colors font-mono"
                                    />
                                </div>
                            </div>

                            {/* Seleção de Componentes (Adicionar Peças ao Combo) */}
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-medium text-zinc-400 block">Peças Componentes</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Buscar figura por nome ou série para adicionar ao kit..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                                    />
                                    {isSearching && (
                                        <Loader2 size={14} className="animate-spin text-orange-500 absolute right-3 top-1/2 -translate-y-1/2" />
                                    )}

                                    {/* Resultados da Busca */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 z-20 shadow-2xl max-h-60 overflow-y-auto space-y-0.5">
                                            {searchResults.map(fig => (
                                                <button
                                                    key={fig.id}
                                                    type="button"
                                                    onClick={() => handleAddComponent(fig)}
                                                    className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-left cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <div className="w-7 h-7 rounded overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 relative">
                                                            {fig.imagem_url ? (
                                                                <Image src={fig.imagem_url} alt="" fill className="object-cover" />
                                                            ) : (
                                                                <Package size={12} className="text-zinc-600 m-auto" />
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                                                            {fig.nome}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-mono text-orange-400 shrink-0 px-2">
                                                        + Adicionar
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Lista de Componentes Selecionados */}
                                {selectedComponents.length === 0 ? (
                                    <div className="py-5 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                        Nenhuma figura adicionada ao kit. Use a busca acima para compor o bundle.
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {selectedComponents.map(comp => (
                                            <div
                                                key={comp.id}
                                                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/90 gap-3"
                                            >
                                                <div className="flex items-center gap-2.5 truncate">
                                                    <div className="w-9 h-9 rounded overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 relative">
                                                        {comp.imagem_url && (
                                                            <Image src={comp.imagem_url} alt="" fill className="object-cover" />
                                                        )}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="text-xs font-semibold text-zinc-100 truncate">{comp.nome}</div>
                                                        <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5 font-mono">
                                                            <span>Pintura: {comp.horas_pintura}h</span>
                                                            <span>·</span>
                                                            <span>Resina: {(comp.resina_kg || 0) * 1000}g</span>
                                                            {comp.preco_colorido ? (
                                                                <>
                                                                    <span>·</span>
                                                                    <span className="text-emerald-400">R$ {comp.preco_colorido}</span>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-md p-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(comp.id, -1)}
                                                            className="w-5 h-5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono flex items-center justify-center text-xs cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-5 text-center text-xs font-semibold text-zinc-200 font-mono">
                                                            {comp.quantidade}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(comp.id, 1)}
                                                            className="w-5 h-5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono flex items-center justify-center text-xs cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveComponent(comp.id)}
                                                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Gerenciamento Visual da Capa do Bundle */}
                            <div className="bg-zinc-900/40 border border-zinc-800/90 rounded-xl p-3.5 space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                        <ImageIcon size={13} className="text-zinc-500" />
                                        Imagem de Capa
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingPhoto}
                                            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Upload size={12} />
                                            {isUploadingPhoto ? 'Enviando...' : 'Upload Foto'}
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />

                                        {selectedComponents.length >= 2 && (
                                            <button
                                                type="button"
                                                onClick={handleGenerateCollage}
                                                disabled={isGeneratingCollage}
                                                className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {isGeneratingCollage ? <Loader2 size={12} className="animate-spin" /> : <Columns size={12} className="text-orange-400" />}
                                                {isGeneratingCollage ? 'Gerando...' : 'Gerar Colagem Automática'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Preview da Capa Selecionada */}
                                <div className="flex items-center gap-3 bg-zinc-950/70 border border-zinc-800/80 p-2.5 rounded-lg">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 relative">
                                        {capaUrl ? (
                                            <Image src={capaUrl} alt="Capa Bundle" fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-zinc-400">
                                                URL da Capa {capaUrl ? '' : '(Opcional)'}
                                            </span>
                                            {capaUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCapaUrl('')}
                                                    className="text-[10px] text-zinc-500 hover:text-red-400 font-medium cursor-pointer"
                                                >
                                                    Remover capa
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Deixe vazio para definir depois"
                                            value={capaUrl}
                                            onChange={e => setCapaUrl(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600 font-mono truncate"
                                        />
                                    </div>
                                </div>

                                {/* Opções de Imagens Disponíveis das Peças Componentes */}
                                {selectedComponents.length > 0 && (() => {
                                    const allPhotos: { url: string; compName: string; label: string }[] = [];
                                    selectedComponents.forEach(comp => {
                                        if (comp.imagem_url) {
                                            allPhotos.push({ url: comp.imagem_url, compName: comp.nome, label: 'Principal' });
                                        }
                                        if (comp.imagem_secundaria) {
                                            allPhotos.push({ url: comp.imagem_secundaria, compName: comp.nome, label: 'Secundária' });
                                        }
                                        if (Array.isArray(comp.fotos_extras)) {
                                            comp.fotos_extras.forEach((extraUrl, idx) => {
                                                if (extraUrl) {
                                                    allPhotos.push({ url: extraUrl, compName: comp.nome, label: `Extra #${idx + 1}` });
                                                }
                                            });
                                        }
                                    });

                                    if (allPhotos.length === 0) return null;

                                    return (
                                        <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-zinc-400">
                                                    Fotos das peças componentes ({allPhotos.length})
                                                </span>
                                                <span className="text-[10px] text-zinc-500">
                                                    Clique para usar como capa
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                                                {allPhotos.map((photo, pIdx) => {
                                                    const isSelected = capaUrl === photo.url;
                                                    return (
                                                        <button
                                                            key={`${photo.url}-${pIdx}`}
                                                            type="button"
                                                            onClick={() => setCapaUrl(photo.url)}
                                                            className={`relative rounded-lg overflow-hidden border p-1 text-left transition-all cursor-pointer group ${
                                                                isSelected
                                                                    ? 'border-orange-500 bg-zinc-900 ring-1 ring-orange-500/40'
                                                                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            <div className="aspect-square rounded overflow-hidden relative bg-zinc-950">
                                                                <Image src={photo.url} alt="" fill className="object-cover" />
                                                                {isSelected && (
                                                                    <div className="absolute top-1 right-1 bg-orange-500 text-zinc-950 rounded-full p-0.5 shadow">
                                                                        <CheckCircle2 size={12} />
                                                                    </div>
                                                                )}
                                                                <span className="absolute bottom-1 left-1 bg-black/80 text-[9px] font-mono text-zinc-300 px-1 py-0.5 rounded">
                                                                    {photo.label}
                                                                </span>
                                                            </div>
                                                            <div className="px-0.5 mt-1 truncate text-[10px] text-zinc-400 group-hover:text-zinc-200">
                                                                {photo.compName}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Precificação & Desconto */}
                            <div className="bg-zinc-900/40 border border-zinc-800/90 rounded-xl p-3.5 space-y-3.5">
                                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                                    <Percent size={13} className="text-orange-500" /> Cálculo de Custos e Precificação do Kit
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-zinc-800/80">
                                        <div className="text-[10px] text-zinc-500 uppercase font-mono">Pintura Somada</div>
                                        <div className="text-xs font-bold text-zinc-200 mt-1 font-mono">{totalHorasPintura.toFixed(2)} h</div>
                                    </div>
                                    <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-zinc-800/80">
                                        <div className="text-[10px] text-zinc-500 uppercase font-mono">Resina Somada</div>
                                        <div className="text-xs font-bold text-zinc-200 mt-1 font-mono">{(totalResina * 1000).toFixed(0)} g</div>
                                    </div>
                                    <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-zinc-800/80">
                                        <div className="text-[10px] text-zinc-500 uppercase font-mono">Soma Avulsa</div>
                                        <div className="text-xs font-bold text-zinc-500 line-through mt-1 font-mono">R$ {precoCheioSoma}</div>
                                    </div>
                                    <div className="bg-zinc-950 rounded-lg p-2.5 border border-emerald-500/30">
                                        <div className="text-[10px] text-emerald-500/80 uppercase font-mono">Valor Final Kit</div>
                                        <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">R$ {precoBundleCalculado}</div>
                                    </div>
                                </div>

                                {/* Controles de Desconto */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                                            <span>Desconto do Combo (%)</span>
                                            <span className="text-orange-400 font-mono font-bold">{safeDesconto}% OFF</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="50"
                                            step="5"
                                            value={descontoPct}
                                            onChange={e => setDescontoPct(Number(e.target.value))}
                                            className="w-full accent-orange-500 cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                            <span>0%</span>
                                            <span>15%</span>
                                            <span>30%</span>
                                            <span>50%</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-zinc-400">Ou Preço Fixo Promocional (R$)</label>
                                        <input
                                            type="number"
                                            placeholder="Sobrescrever com valor fixo..."
                                            value={precoFixo}
                                            onChange={e => setPrecoFixo(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-600 font-mono"
                                        />
                                    </div>
                                </div>

                                {economiaCalculada > 0 && (
                                    <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-3 py-2">
                                        <Check size={13} />
                                        Economia direta para o cliente: R$ {economiaCalculada.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBundle}
                                disabled={isSaving}
                                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
                                {isSaving ? 'Salvando...' : 'Salvar Bundle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
