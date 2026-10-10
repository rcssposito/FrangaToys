'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Boxes,
    Plus,
    Search,
    Trash2,
    Edit3,
    Sparkles,
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
    CheckCircle2
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
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Boxes className="text-purple-400" size={24} />
                        Bundles & Kits de Figuras
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                        Crie combos de produtos (SKUs compostos). Os tempos de pintura e insumos são somados automaticamente, e o desconto é aplicado em tempo real.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
                >
                    <Plus size={16} />
                    Criar Novo Bundle
                </button>
            </div>

            {/* Listagem de Bundles */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                    <span className="text-xs font-bold uppercase tracking-wider">Carregando bundles...</span>
                </div>
            ) : bundles.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-400 flex items-center justify-center mx-auto">
                        <Boxes size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Nenhum bundle cadastrado</h3>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto">
                            Crie seu primeiro combo de figuras (ex: &quot;Diorama Zuko vs Azula&quot; ou &quot;Trio Titãs&quot;) para alavancar o ticket médio da loja!
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-600/20 inline-flex items-center gap-2 cursor-pointer"
                    >
                        <Plus size={16} />
                        Criar Primeiro Bundle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {bundles.map(bundle => (
                        <div
                            key={bundle.id}
                            className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 space-y-5 transition-all shadow-xl"
                        >
                            {/* Header do Card */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black border border-zinc-800 shrink-0">
                                        {bundle.imagem_url ? (
                                            <Image
                                                src={bundle.imagem_url}
                                                alt={bundle.nome}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                <Boxes size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                Bundle SKU #{bundle.id}
                                            </span>
                                            {bundle.codigo && (
                                                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                    {bundle.codigo}
                                                </span>
                                            )}
                                            {bundle.todas_pecas_disponiveis === false ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950/50 text-red-400 border border-red-500/30 flex items-center gap-1" title="Peça componente ou estúdio inativo">
                                                    ⚠️ Indisponível (Componente Inativo)
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleDisponivel(bundle)}
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                                        bundle.disponivel
                                                            ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50'
                                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750'
                                                    }`}
                                                    title="Clique para alternar disponibilidade na vitrine"
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${bundle.disponivel ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                                                    {bundle.disponivel ? 'Disponível na Vitrine' : 'Pausado'}
                                                </button>
                                            )}
                                        </div>
                                        <h3 className="text-base font-black text-white mt-1 leading-tight">{bundle.nome}</h3>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                            {bundle.componentes.length} {bundle.componentes.length === 1 ? 'peça componente' : 'peças componentes'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handleOpenEdit(bundle)}
                                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
                                        title="Editar Bundle"
                                    >
                                        <Edit3 size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBundle(bundle)}
                                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all cursor-pointer"
                                        title="Excluir Bundle"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Componentes do Kit */}
                            <div className="bg-black/50 border border-zinc-850 rounded-xl p-3 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                    Peças Inclusas no Kit:
                                </span>
                                <div className="space-y-1.5">
                                    {bundle.componentes.map(comp => (
                                        <div key={comp.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-900/50 border border-zinc-800/40">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="w-5 h-5 rounded bg-purple-950/60 text-purple-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {comp.quantidade}x
                                                </span>
                                                <span className="font-semibold text-zinc-200 truncate">{comp.nome}</span>
                                                {comp.disponivel === false && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-950/60 text-red-400 border border-red-500/30 shrink-0">
                                                        ⚠️ Inativa
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-zinc-400 shrink-0 font-mono">
                                                <span>🎨 {comp.horas_pintura}h</span>
                                                <span>🧪 {(comp.resina_kg || 0) * 1000}g</span>
                                                {comp.preco_colorido ? (
                                                    <span className="text-emerald-400 font-bold">R$ {comp.preco_colorido}</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Métricas e Precificação Dinâmica */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-2.5">
                                    <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center justify-center gap-1">
                                        <Clock size={11} className="text-orange-400" /> Pintura Total
                                    </div>
                                    <div className="text-sm font-black text-orange-400 mt-1 font-mono">
                                        {bundle.summary.horas_pintura_total} h
                                    </div>
                                </div>
                                <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-2.5">
                                    <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center justify-center gap-1">
                                        <Layers size={11} className="text-blue-400" /> Resina Total
                                    </div>
                                    <div className="text-sm font-black text-blue-400 mt-1 font-mono">
                                        {(bundle.summary.resina_kg_total * 1000).toFixed(0)} g
                                    </div>
                                </div>
                                <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-2.5">
                                    <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center justify-center gap-1">
                                        <DollarSign size={11} className="text-zinc-400" /> Soma Avulsa
                                    </div>
                                    <div className="text-sm font-black text-zinc-400 line-through mt-1 font-mono">
                                        R$ {bundle.summary.preco_cheio_colorido}
                                    </div>
                                    <div className="text-[9px] text-zinc-500 font-bold">
                                        Pintadas
                                    </div>
                                </div>
                                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5">
                                    <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-1">
                                        <Percent size={11} /> Kit Pintado
                                    </div>
                                    <div className="text-base font-black text-emerald-400 mt-0.5 font-mono">
                                        R$ {bundle.summary.preco_bundle_colorido}
                                    </div>
                                    <div className="text-[9px] text-emerald-300 font-bold">
                                        -{bundle.summary.desconto_pct}% OFF
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação / Edição de Bundle */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
                            <div>
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <Sparkles className="text-purple-400" size={20} />
                                    {editingBundle ? 'Editar Bundle de Figuras' : 'Criar Novo Bundle (Combo)'}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Selecione as figuras componentes. Os tempos e custos serão somados automaticamente.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Dados Básicos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-300">Nome do Bundle *</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Attack on Titan - Titans v1"
                                        value={nome}
                                        onChange={e => setNome(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-300">SKU / Código (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: BND-001"
                                        value={codigo}
                                        onChange={e => setCodigo(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Seleção de Componentes (Adicionar Peças ao Combo) */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-zinc-300 block">Adicionar Peças ao Combo</label>
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Digite o nome da figura (ex: Attack on Titan, Berserk, etc)..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
                                    />
                                    {isSearching && (
                                        <Loader2 size={16} className="animate-spin text-purple-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                                    )}

                                    {/* Resultados da Busca */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 z-20 shadow-2xl max-h-60 overflow-y-auto space-y-1">
                                            {searchResults.map(fig => (
                                                <button
                                                    key={fig.id}
                                                    type="button"
                                                    onClick={() => handleAddComponent(fig)}
                                                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/80 transition-colors text-left cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-black shrink-0 relative">
                                                            {fig.imagem_url ? (
                                                                <Image src={fig.imagem_url} alt="" fill className="object-cover" />
                                                            ) : (
                                                                <Package size={14} className="text-zinc-600 m-auto" />
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                                                            {fig.nome}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-purple-400 shrink-0">
                                                        + Adicionar
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Lista de Componentes Selecionados */}
                                {selectedComponents.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                                        Nenhuma figura adicionada ao kit ainda. Use a busca acima para adicionar.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedComponents.map(comp => (
                                            <div
                                                key={comp.id}
                                                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 gap-3"
                                            >
                                                <div className="flex items-center gap-3 truncate">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative">
                                                        {comp.imagem_url && (
                                                            <Image src={comp.imagem_url} alt="" fill className="object-cover" />
                                                        )}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="text-xs font-bold text-white truncate">{comp.nome}</div>
                                                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                                                            <span>Pintura: {comp.horas_pintura}h</span>
                                                            <span>•</span>
                                                            <span>Resina: {(comp.resina_kg || 0) * 1000}g</span>
                                                            {comp.preco_colorido ? (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-emerald-400 font-bold">Pintada: R$ {comp.preco_colorido}</span>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="flex items-center gap-1.5 bg-black border border-zinc-800 rounded-lg p-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(comp.id, -1)}
                                                            className="w-5 h-5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold flex items-center justify-center text-xs cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-6 text-center text-xs font-bold text-white font-mono">
                                                            {comp.quantidade}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(comp.id, 1)}
                                                            className="w-5 h-5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold flex items-center justify-center text-xs cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveComponent(comp.id)}
                                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Gerenciamento Visual da Capa do Bundle (Crop / Colagem / Escolha) */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                        <ImageIcon size={15} className="text-purple-400" />
                                        Imagem de Capa do Bundle
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {/* Botão de Upload Customizado */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingPhoto}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Upload size={13} />
                                            {isUploadingPhoto ? 'Enviando...' : 'Subir Foto do PC'}
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />

                                        {/* Botão de Colagem / Crop Automático */}
                                        {selectedComponents.length >= 2 && (
                                            <button
                                                type="button"
                                                onClick={handleGenerateCollage}
                                                disabled={isGeneratingCollage}
                                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                                            >
                                                {isGeneratingCollage ? <Loader2 size={13} className="animate-spin" /> : <Columns size={13} />}
                                                {isGeneratingCollage ? 'Gerando...' : 'Gerar Colagem das Peças'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Preview da Capa Selecionada */}
                                <div className="flex items-center gap-4 bg-black/40 border border-zinc-850 p-3 rounded-xl">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-black border border-zinc-800 shrink-0 relative">
                                        {capaUrl ? (
                                            <Image src={capaUrl} alt="Capa Bundle" fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-zinc-400">
                                                Capa do Bundle {capaUrl ? '' : '(Opcional - pode colocar depois)'}
                                            </span>
                                            {capaUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCapaUrl('')}
                                                    className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                                >
                                                    ✕ Deixar sem foto
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Deixe vazio para subir sem foto e adicionar depois"
                                            value={capaUrl}
                                            onChange={e => setCapaUrl(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-purple-500 font-mono truncate"
                                        />
                                    </div>
                                </div>

                                {/* Opções de Imagens Disponíveis das Peças Componentes (Principal, Hover e Extras) */}
                                {selectedComponents.length > 0 && (() => {
                                    const allPhotos: { url: string; compName: string; label: string }[] = [];
                                    selectedComponents.forEach(comp => {
                                        if (comp.imagem_url) {
                                            allPhotos.push({ url: comp.imagem_url, compName: comp.nome, label: 'Principal' });
                                        }
                                        if (comp.imagem_secundaria) {
                                            allPhotos.push({ url: comp.imagem_secundaria, compName: comp.nome, label: 'Hover/Secundária' });
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
                                                <span className="text-[11px] font-bold text-zinc-400">
                                                    Fotos disponíveis das peças inclusas ({allPhotos.length} fotos encontradas):
                                                </span>
                                                <span className="text-[10px] text-zinc-500">
                                                    Clique em qualquer foto para definir como Capa
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                {allPhotos.map((photo, pIdx) => {
                                                    const isSelected = capaUrl === photo.url;
                                                    return (
                                                        <button
                                                            key={`${photo.url}-${pIdx}`}
                                                            type="button"
                                                            onClick={() => setCapaUrl(photo.url)}
                                                            className={`relative rounded-xl overflow-hidden border p-1 text-left transition-all cursor-pointer group ${
                                                                isSelected
                                                                    ? 'border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/50'
                                                                    : 'border-zinc-800 bg-black/40 hover:border-zinc-700'
                                                            }`}
                                                        >
                                                            <div className="aspect-square rounded-lg overflow-hidden relative bg-black">
                                                                <Image src={photo.url} alt="" fill className="object-cover" />
                                                                {isSelected && (
                                                                    <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5 shadow">
                                                                        <CheckCircle2 size={14} />
                                                                    </div>
                                                                )}
                                                                <span className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-xs text-[9px] font-bold text-zinc-300 px-1.5 py-0.5 rounded">
                                                                    {photo.label}
                                                                </span>
                                                            </div>
                                                            <div className="p-1 mt-0.5 truncate text-[10px] font-bold text-zinc-300 group-hover:text-white">
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

                            {/* Inteligência de Precificação & Desconto */}
                            <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-wider">
                                    <Sparkles size={16} /> Inteligência de Custos e Desconto do Kit
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                    <div className="bg-black/40 rounded-xl p-2.5 border border-purple-900/40">
                                        <div className="text-[10px] text-zinc-400 uppercase font-bold">Pintura Somada</div>
                                        <div className="text-sm font-black text-white mt-1 font-mono">{totalHorasPintura.toFixed(2)} h</div>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-2.5 border border-purple-900/40">
                                        <div className="text-[10px] text-zinc-400 uppercase font-bold">Resina Somada</div>
                                        <div className="text-sm font-black text-white mt-1 font-mono">{(totalResina * 1000).toFixed(0)} g</div>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-2.5 border border-purple-900/40">
                                        <div className="text-[10px] text-zinc-400 uppercase font-bold">Soma Avulsa (Pintadas)</div>
                                        <div className="text-sm font-black text-zinc-400 line-through mt-1 font-mono">R$ {precoCheioSoma}</div>
                                    </div>
                                    <div className="bg-purple-900/40 rounded-xl p-2.5 border border-purple-500/40">
                                        <div className="text-[10px] text-purple-300 uppercase font-bold">Kit Pintado</div>
                                        <div className="text-base font-black text-purple-300 mt-0.5 font-mono">R$ {precoBundleCalculado}</div>
                                    </div>
                                </div>

                                {/* Controles de Desconto */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                                            <span>Desconto do Combo (%)</span>
                                            <span className="text-purple-400 font-mono font-bold">{safeDesconto}% OFF</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="50"
                                            step="5"
                                            value={descontoPct}
                                            onChange={e => setDescontoPct(Number(e.target.value))}
                                            className="w-full accent-purple-500 cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                            <span>0%</span>
                                            <span>15% (Sugerido)</span>
                                            <span>30%</span>
                                            <span>50%</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-300">Ou Preço Fixo Promocional (R$)</label>
                                        <input
                                            type="number"
                                            placeholder="Sobrescrever com valor fixo..."
                                            value={precoFixo}
                                            onChange={e => setPrecoFixo(e.target.value)}
                                            className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500 font-mono"
                                        />
                                    </div>
                                </div>

                                {economiaCalculada > 0 && (
                                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-2.5">
                                        <Check size={14} />
                                        O cliente economiza R$ {economiaCalculada.toFixed(2)} ao comprar este bundle!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBundle}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {isSaving ? 'Salvando Bundle...' : 'Salvar Bundle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
