
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ArrowLeft, Search, Trash2, X, ExternalLink, Image as ImageIcon, Minus, Plus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Upload, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
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
    imagem_secundaria?: string | null;
    fotos_extras?: string[];
    altura_cm: number | string;
    largura_cm: number | string;
    profundidade_cm: number | string;
    resina_kg: number | string;
    horas_impressao: number | string;
    horas_pintura: number | string;
    escala: number | string;
    tem_extras?: boolean;
    tem_pintura_real?: boolean;
    disponivel?: boolean;
    sinonimos?: string;
    slug?: string;
    is_campanha?: boolean;
    is_campanha_active?: boolean;
    desconto_campanha?: number;
    preco_fixo_campanha?: number;
    vendas_count?: number;
    faturamento_gerado?: number;
    badge_desempenho?: 'Estrela' | 'Lento' | 'Encalhado';
    studio_id?: number | string | null;
    studios?: { nome: string } | null;
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

const FigureCard = ({
    f, prices, canEdit, savingId, deletingId, hasRole,
    handleChange, handleSave, handleDelete, handleDownloadImage, setPreviewImage, setPhotoManagerFigure
}: any) => {
    const [expanded, setExpanded] = useState(false);

    const totalFotos = (f.imagem_url ? 1 : 0) + (f.imagem_secundaria ? 1 : 0) + (f.fotos_extras?.length || 0);

    return (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-orange-500/30 transition-all">
            {/* Cabecalho */}
            <div className="flex gap-3 justify-between items-start">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {f.imagem_url && (
                            <button
                                type="button"
                                onClick={() => setPhotoManagerFigure ? setPhotoManagerFigure(f) : setPreviewImage({ url: f.imagem_url, nome: f.nome })}
                                className="p-1 hover:bg-orange-500/10 rounded text-orange-500 transition-colors shrink-0 relative cursor-pointer"
                                title="Gerenciar e Reordenar Fotos da Peça"
                            >
                                <ImageIcon size={14} />
                                {totalFotos > 1 && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
                                        {totalFotos}
                                    </span>
                                )}
                            </button>
                        )}
                        <input
                            type="text"
                            value={f.nome || ''}
                            placeholder="Nome da figura"
                            disabled={!canEdit}
                            onChange={e => handleChange(f.id, 'nome', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-[var(--input-border)] focus:border-orange-500/50 rounded px-1.5 py-0.5 text-sm font-bold text-[var(--foreground)] focus:bg-[var(--input-bg)] outline-none transition-all truncate"
                        />
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 px-1.5 flex items-center gap-1.5 flex-wrap">
                        <span>{f.categoria}</span>
                        <span className="text-zinc-600 font-bold">•</span>
                        <span>{f.serie}</span>
                        {f.studios?.nome && (
                            <>
                                <span className="text-zinc-600 font-bold">•</span>
                                <span className="text-[10px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded shadow-sm">
                                    {f.studios.nome}
                                </span>
                            </>
                        )}
                    </div>
                    <span className="font-mono text-[10px] bg-[var(--input-bg)] text-[var(--text-muted)] px-2 py-0.5 rounded-sm border border-[var(--input-border)] mt-1.5 inline-block">
                        SKU: {f.codigo || '--'}
                    </span>
                </div>

                {/* Desempenho de Vendas */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                    {f.badge_desempenho === 'Estrela' && (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse">
                            ★ Estrela ({f.vendas_count} pçs)
                        </span>
                    )}
                    {f.badge_desempenho === 'Lento' && (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1 shadow-[0_0_8px_rgba(59,130,246,0.1)]">
                            🔄 Lento ({f.vendas_count} pçs)
                        </span>
                    )}
                    {f.badge_desempenho === 'Encalhado' && (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-950/80 border border-zinc-900/60 text-zinc-550 flex items-center gap-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                            ❄️ Encalhado
                        </span>
                    )}
                    {f.faturamento_gerado && f.faturamento_gerado > 0 ? (
                        <span className="text-[10px] font-black text-emerald-500">
                            R$ {f.faturamento_gerado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Tabela de Preços Renovada (Visual Dashboard) */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-950/40 rounded-xl p-3 border border-zinc-900/60 shadow-inner">
                {/* Sem Pintura */}
                <div className="flex flex-col items-center justify-between text-center py-0.5 border-r border-zinc-900/60 pr-2">
                    <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Sem Pintura</span>
                    <span className="text-xs font-black text-emerald-400 mt-1">R$ {prices.basic}</span>
                    <span className="text-[9px] font-bold text-zinc-500/70">Cartão R$ {prices.basicCredito}</span>
                </div>
                
                {/* Colorido */}
                <div className="flex flex-col items-center justify-between text-center py-0.5 pl-2">
                    <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Colorido</span>
                    <span className="text-xs font-black text-fuchsia-400 mt-1">R$ {prices.premium}</span>
                    <span className="text-[9px] font-bold text-zinc-500/70">Cartão R$ {prices.premiumCredito}</span>
                </div>
            </div>

            {/* Ações Rápidas & Expandir */}
            <div className="flex justify-between items-center pt-2 border-t border-[var(--card-border)] mt-1">
                <div className="flex gap-2">
                    <button
                        onClick={() => handleDownloadImage(f.id, f.nome)}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-md transition-all border border-blue-500/20 shadow-sm active:scale-95"
                    >
                        <ImageIcon size={14} />
                    </button>
                    {hasRole('admin') && (
                        <button
                            onClick={() => handleDelete(f.id, f.nome)}
                            disabled={deletingId === f.id}
                            className="p-2 bg-orange-400/10 hover:bg-orange-400/20 text-orange-400 rounded-md transition-all disabled:opacity-50 border border-orange-400/20 shadow-sm active:scale-95"
                        >
                            {deletingId === f.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 ${
                        expanded 
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                        : 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20'
                    }`}
                >
                    {expanded ? 'Fechar' : 'Editar'}
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
                            <div className="relative flex items-center">
                                <input
                                    type="number" step="0.001"
                                    value={f.resina_kg ?? ''}
                                    placeholder="0.000"
                                    disabled={!canEdit}
                                    onChange={e => handleChange(f.id, 'resina_kg', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm pl-2 pr-8 py-1.5 text-left text-xs font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                                />
                                <span className="absolute right-2 text-[9px] font-black text-zinc-600 select-none pointer-events-none uppercase">KG</span>
                            </div>
                        </div>

                        {/* Horas Impressao */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">H. Impres.</label>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    value={f.horas_impressao ?? ''}
                                    placeholder="0"
                                    disabled={!canEdit}
                                    onChange={e => handleChange(f.id, 'horas_impressao', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm pl-2 pr-6 py-1.5 text-left text-xs font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                                />
                                <span className="absolute right-2 text-[9px] font-black text-zinc-650 select-none pointer-events-none uppercase">h</span>
                            </div>
                        </div>

                        {/* Horas Pintura */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">H. Pintura</label>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    value={f.horas_pintura ?? ''}
                                    placeholder="0"
                                    disabled={!canEdit}
                                    onChange={e => handleChange(f.id, 'horas_pintura', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm pl-2 pr-6 py-1.5 text-left text-xs font-bold text-[var(--foreground)] outline-none focus:border-orange-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                                />
                                <span className="absolute right-2 text-[9px] font-black text-zinc-650 select-none pointer-events-none uppercase">h</span>
                            </div>
                        </div>
                    </div>

                    {/* Medidas */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Medidas (CM) - Altura, Largura, Prof.</label>
                        <div className="flex gap-2">
                            <div className="relative flex items-center w-1/3">
                                <span className="absolute left-2.5 text-[10px] font-black text-zinc-550 select-none pointer-events-none">A:</span>
                                <input
                                    type="number" step="0.1"
                                    value={f.altura_cm ?? ''}
                                    placeholder="0"
                                    disabled={!canEdit}
                                    onChange={e => handleChange(f.id, 'altura_cm', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm pl-6 pr-2 py-1.5 text-center text-xs font-black text-[var(--foreground)] outline-none disabled:opacity-50"
                                />
                            </div>
                            <div className="relative flex items-center w-1/3">
                                <span className="absolute left-2.5 text-[10px] font-black text-zinc-550 select-none pointer-events-none">L:</span>
                                <input
                                    type="number" step="0.1"
                                    value={f.largura_cm ?? ''}
                                    placeholder="0"
                                    disabled={!canEdit}
                                    onChange={e => handleChange(f.id, 'largura_cm', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm pl-6 pr-2 py-1.5 text-center text-xs font-black text-[var(--foreground)] outline-none disabled:opacity-50"
                                />
                            </div>
                            <div className="relative flex items-center w-1/3">
                                <span className="absolute left-2.5 text-[10px] font-black text-zinc-550 select-none pointer-events-none">P:</span>
                                <input
                                    type="number" step="0.1"
                                    value={f.profundidade_cm ?? ''}
                                    placeholder="0"
                                    disabled={!canEdit}
                                    onChange={e => handleChange(f.id, 'profundidade_cm', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-sm pl-6 pr-2 py-1.5 text-center text-xs font-black text-[var(--foreground)] outline-none disabled:opacity-50"
                                />
                            </div>
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
                            <span className="text-xs font-medium text-[var(--text-muted)]">Vitrine</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={f.tem_extras}
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'tem_extras', e.target.checked)}
                                className="w-5 h-5 rounded-sm border-[var(--input-border)] text-orange-500 bg-[var(--input-bg)] focus:ring-0"
                            />
                            <span className="text-xs font-medium text-[var(--text-muted)]">Extras</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={f.tem_pintura_real}
                                disabled={!canEdit}
                                onChange={e => handleChange(f.id, 'tem_pintura_real', e.target.checked)}
                                className="w-5 h-5 rounded-sm border-[var(--input-border)] text-pink-500 bg-[var(--input-bg)] focus:ring-0"
                            />
                            <span className="text-xs font-medium text-[var(--text-muted)]">Feito?</span>
                        </label>

                        <button
                            onClick={() => handleSave(f)}
                            disabled={savingId === f.id || !canEdit}
                            className="px-2.5 py-1.5 bg-orange-500/10 text-orange-500 rounded-md hover:bg-orange-500 hover:text-[var(--background)] transition-all disabled:opacity-50 font-semibold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                        >
                            {savingId === f.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

import { useSearchParams, useRouter } from 'next/navigation';

interface ImageInspectorModalProps {
    imageUrl: string;
    title: string;
    onClose: () => void;
}

const ImageInspectorModal = ({ imageUrl, title, onClose }: ImageInspectorModalProps) => {
    // Carrega a imagem original do estúdio em máxima definição (remove transformações de compressão/tamanho)
    const rawUrl = (imageUrl || '').split('?')[0];
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleZoomIn = () => setScale(prev => Math.min(Number((prev + 0.35).toFixed(2)), 4.5));
    const handleZoomOut = () => setScale(prev => Math.max(Number((prev - 0.35).toFixed(2)), 0.5));
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            setScale(prev => Math.min(Number((prev + 0.2).toFixed(2)), 4.5));
        } else {
            setScale(prev => Math.max(Number((prev - 0.2).toFixed(2)), 0.5));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[150] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            {/* Top Toolbar */}
            <div
                className="p-4 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between gap-4 z-20 shrink-0"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0 flex items-center gap-1.5">
                        <ZoomIn size={12} /> Inspeção de Pintura HD
                    </span>
                    <h3 className="font-bold text-sm text-white truncate">{title}</h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Zoom Controls */}
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            disabled={scale <= 0.5}
                            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                            title="Diminuir Zoom"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-orange-400 min-w-[50px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            disabled={scale >= 4.5}
                            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                            title="Aumentar Zoom"
                        >
                            <ZoomIn size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer text-[10px] font-bold"
                            title="Resetar Zoom (100%)"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>

                    <a
                        href={rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Abrir arquivo em nova aba"
                    >
                        <ExternalLink size={14} />
                        <span className="hidden sm:inline">Original</span>
                    </a>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Fechar inspeção (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Viewport de Zoom Interativo */}
            <div
                className={`flex-1 relative overflow-hidden flex items-center justify-center ${
                    scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
                }`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={e => {
                    e.stopPropagation();
                    if (scale === 1) handleZoomIn();
                }}
            >
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    }}
                    className="relative max-w-full max-h-full flex items-center justify-center p-4"
                >
                    <img
                        src={rawUrl}
                        alt={title}
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-none"
                    />
                </div>
            </div>

            {/* Footer com Dicas de Precificação */}
            <div className="p-3 bg-zinc-950/80 border-t border-zinc-800/60 text-center text-[11px] text-zinc-400 z-20 shrink-0">
                <span>
                    💡 <strong>Dica de Precificação:</strong> Gire a roda do mouse para aproximar/afastar e clique + arraste para inspecionar olhos, sombras, texturas e detalhes finos da pintura.
                </span>
            </div>
        </div>
    );
};

async function compressImageForUpload(file: File, maxDim = 1920, quality = 0.80): Promise<File> {
    return new Promise((resolve) => {
        // Se já for um WebP leve (< 300KB), não precisa reprocessar
        if (file.type === 'image/webp' && file.size < 300 * 1024) {
            resolve(file);
            return;
        }

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Redimensiona proporcionalmente se passar de maxDim (1920px)
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }

            // Renderização bilinear suave em alta definição
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                    const compressedFile = new File([blob], newFileName, { type: 'image/webp' });
                    resolve(compressedFile);
                },
                'image/webp',
                quality
            );
        };

        img.onerror = () => {
            resolve(file);
        };

        reader.readAsDataURL(file);
    });
}

interface PhotoManagerModalProps {
    figure: Figure;
    onClose: () => void;
    onSaved: (updated: Partial<Figure>) => void;
}

const PhotoManagerModal = ({ figure, onClose, onSaved }: PhotoManagerModalProps) => {
    // Coleta todas as imagens existentes da figura em ordem
    const [images, setImages] = useState<string[]>(() => {
        const list = [figure.imagem_url, figure.imagem_secundaria, ...(figure.fotos_extras || [])].filter(Boolean) as string[];
        return Array.from(new Set(list));
    });
    const [newUrl, setNewUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [inspectImageUrl, setInspectImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleMove = (index: number, direction: 'left' | 'right') => {
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= images.length) return;
        const newArr = [...images];
        const [moved] = newArr.splice(index, 1);
        newArr.splice(targetIndex, 0, moved);
        setImages(newArr);
    };

    const handleSetCover = (index: number) => {
        if (index === 0) return;
        const newArr = [...images];
        const [moved] = newArr.splice(index, 1);
        newArr.unshift(moved);
        setImages(newArr);
    };

    const handleSetHover = (index: number) => {
        if (index === 1 || images.length < 2) return;
        const newArr = [...images];
        const [moved] = newArr.splice(index, 1);
        newArr.splice(1, 0, moved);
        setImages(newArr);
    };

    const handleRemove = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleAddImage = () => {
        const trimmed = newUrl.trim();
        if (!trimmed) return;
        if (images.includes(trimmed)) {
            toast.error('Essa imagem já está adicionada');
            return;
        }
        setImages([...images, trimmed]);
        setNewUrl('');
    };

    const handleFilesUpload = async (filesToUpload: FileList | File[]) => {
        const filesArray = Array.from(filesToUpload).filter(f => f.type.startsWith('image/'));
        if (filesArray.length === 0) {
            toast.error('Selecione arquivos de imagem válidos');
            return;
        }

        setIsUploading(true);
        let currentImages = [...images];

        try {
            for (let i = 0; i < filesArray.length; i++) {
                const rawFile = filesArray[i];
                const nextIndex = currentImages.length + 1;
                
                setUploadStatus(`Otimizando foto ${i + 1} de ${filesArray.length} para WebP...`);
                const optimizedFile = await compressImageForUpload(rawFile, 1920, 0.80);
                
                const originalKb = Math.round(rawFile.size / 1024);
                const compressedKb = Math.round(optimizedFile.size / 1024);
                setUploadStatus(`Enviando foto ${i + 1} (${compressedKb}KB) para o ImageKit...`);

                const formData = new FormData();
                formData.append('file', optimizedFile);
                formData.append('figureName', figure.nome);
                formData.append('categoria', figure.categoria || 'Random');
                formData.append('index', String(nextIndex));

                const res = await fetch('/api/admin/figures/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || `Falha ao subir ${rawFile.name}`);
                }

                const data = await res.json();
                if (data.url) {
                    currentImages.push(data.url);
                    setImages([...currentImages]);
                }
            }

            toast.success(`${filesArray.length} foto(s) extra(s) otimizada(s) e salva(s) no ImageKit!`);
        } catch (err: any) {
            toast.error(err.message || 'Erro durante o upload');
        } finally {
            setIsUploading(false);
            setUploadStatus(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedPayload: Partial<Figure> = {
                id: figure.id,
                imagem_url: images[0] || '',
                imagem_secundaria: images[1] || null,
                fotos_extras: images.slice(2),
            };

            const res = await fetch('/api/admin/figures', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao salvar');
            }

            toast.success('Fotos e ordem salvas com sucesso!');
            onSaved(updatedPayload);
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar fotos');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative max-w-4xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/50">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                Galeria da Peça
                            </span>
                            <span className="text-xs font-mono text-zinc-500">ID #{figure.id}</span>
                        </div>
                        <h3 className="font-black text-lg md:text-xl text-white mt-1 truncate max-w-xl">
                            {figure.nome}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Explicativo das Posições */}
                <div className="px-6 py-3 bg-zinc-900/30 border-b border-zinc-800/60 flex items-center gap-4 text-[11px] flex-wrap">
                    <span className="text-zinc-400 font-bold">Regras da Vitrine:</span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <strong>#1</strong> Capa Principal (Vitrine)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-orange-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <strong>#2</strong> Foto de Hover (Ao passar o mouse)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <strong>#3+</strong> Galeria do Modal de Detalhes
                    </span>
                </div>

                {/* Corpo: Grade de Fotos para Reordenar */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {images.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                            Nenhuma foto cadastrada para esta figura.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {images.map((url, idx) => {
                                const isCover = idx === 0;
                                const isHover = idx === 1;

                                return (
                                    <div
                                        key={url + idx}
                                        className={`relative bg-zinc-900/80 border rounded-2xl p-3 flex flex-col gap-3 transition-all ${
                                            isCover 
                                                ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' 
                                                : isHover 
                                                    ? 'border-orange-500/60 shadow-lg shadow-orange-500/10' 
                                                    : 'border-zinc-800 hover:border-zinc-700'
                                        }`}
                                    >
                                        {/* Badge de Posição */}
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                isCover 
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                    : isHover 
                                                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                            }`}>
                                                {isCover ? '⭐ 1. Capa Oficial' : isHover ? '⚡ 2. Efeito Hover' : `#${idx + 1} Galeria`}
                                            </span>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectImageUrl(url)}
                                                    className="text-zinc-400 hover:text-orange-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                                                    title="Inspecionar Pintura em Alta Resolução (Zoom HD)"
                                                >
                                                    <ZoomIn size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(idx)}
                                                    className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                                                    title="Remover foto"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preview da Imagem com Zoom */}
                                        <div
                                            onClick={() => setInspectImageUrl(url)}
                                            className="aspect-[4/5] bg-black rounded-xl overflow-hidden relative flex items-center justify-center p-2 border border-zinc-800/80 cursor-zoom-in group/img transition-all hover:border-orange-500/50"
                                            title="Clique para dar Zoom em Alta Resolução e inspecionar a pintura"
                                        >
                                            <img
                                                src={url}
                                                alt={`Foto ${idx + 1}`}
                                                className="object-contain w-full h-full rounded transition-transform duration-300 group-hover/img:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <span className="bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 backdrop-blur">
                                                    <ZoomIn size={12} /> Inspecionar Pintura (HD)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Ações de Reordenação */}
                                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/60">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => handleMove(idx, 'left')}
                                                    className="px-2 py-1 text-xs font-bold rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                                    title="Mover para a esquerda"
                                                >
                                                    ◀
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === images.length - 1}
                                                    onClick={() => handleMove(idx, 'right')}
                                                    className="px-2 py-1 text-xs font-bold rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                                    title="Mover para a direita"
                                                >
                                                    ▶
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {!isCover && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetCover(idx)}
                                                        className="px-2 py-1 text-[10px] font-black uppercase rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
                                                        title="Tornar esta foto a capa principal"
                                                    >
                                                        Tornar Capa
                                                    </button>
                                                )}
                                                {!isHover && images.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetHover(idx)}
                                                        className="px-2 py-1 text-[10px] font-black uppercase rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer"
                                                        title="Tornar esta foto a imagem de hover"
                                                    >
                                                        Tornar Hover
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Área de Upload Direto para ImageKit (Drag & Drop + Arquivo do Windows) */}
                    <div className="space-y-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            className="hidden"
                            onChange={e => e.target.files && handleFilesUpload(e.target.files)}
                        />

                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={e => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files) handleFilesUpload(e.dataTransfer.files);
                            }}
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                                isDragging 
                                    ? 'border-orange-500 bg-orange-500/10' 
                                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
                            } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={24} className="animate-spin text-orange-500" />
                                    <span className="text-xs font-bold text-orange-400">{uploadStatus}</span>
                                    <span className="text-[10px] text-zinc-500">Enviando e renomeando no ImageKit...</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                        <Upload size={18} />
                                    </div>
                                    <div className="text-xs font-bold text-zinc-200">
                                        Arraste fotos extras aqui ou <span className="text-orange-400 underline underline-offset-2">clique para selecionar do PC</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 max-w-md">
                                        Pode subir com qualquer nome bruto do estúdio (ex: <code className="text-zinc-400">BS_01.png</code>, <code className="text-zinc-400">Colored_01.png</code>). O sistema renomeia automaticamente e envia para o ImageKit.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Adicionar Foto via URL Direta (Fallback) */}
                    <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-3.5 space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 block">
                            Ou adicione via URL direta / ImageKit já existente
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="https://ik.imagekit.io/frangatoys/..."
                                value={newUrl}
                                onChange={e => setNewUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                                className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={handleAddImage}
                                disabled={!newUrl.trim()}
                                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                            >
                                + Adicionar URL
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer com Salvar */}
                <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                        {images.length} {images.length === 1 ? 'foto vinculada' : 'fotos vinculadas'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSaving ? 'Salvando...' : 'Salvar Ordem das Fotos'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Zoom HD para Inspeção de Pintura */}
            {inspectImageUrl && (
                <ImageInspectorModal
                    imageUrl={inspectImageUrl}
                    title={`${figure.nome}`}
                    onClose={() => setInspectImageUrl(null)}
                />
            )}
        </div>
    );
};

function DataGridContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const studioParam = searchParams.get('studio');

    const [figures, setFigures] = useState<Figure[]>([]);
    const [allOriginalFigures, setAllOriginalFigures] = useState<Record<number, Figure>>({});
    const [pendingChanges, setPendingChanges] = useState<Record<number, Partial<Figure>>>({});
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [settings, setSettings] = useState<PricingSettings | null>(null);
    const [studiosList, setStudiosList] = useState<{ id: number; nome: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null>(null);

    const { hasRole } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');

    const [previewImage, setPreviewImage] = useState<{ url: string, nome: string } | null>(null);
    const [photoManagerFigure, setPhotoManagerFigure] = useState<Figure | null>(null);

    // Fetch settings & studios on mount
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
        const fetchStudiosList = async () => {
            try {
                const res = await fetch('/api/admin/studios');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setStudiosList(
                        data
                            .map((s: any) => ({ id: s.id, nome: s.nome }))
                            .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
                    );
                }
            } catch (err) {
                console.error('Erro ao carregar lista de estúdios:', err);
            }
        };
        fetchSettings();
        fetchStudiosList();
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
            } else if (catId !== null && catId !== undefined && catId !== '') {
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
            setAllOriginalFigures(prev => {
                const next = { ...prev };
                formattedData.forEach((f: Figure) => {
                    next[f.id] = f;
                });
                return next;
            });
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
        setPendingChanges(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSave = async (figure: Figure) => {
        setSavingId(figure.id);

        // Ensure values are numbers for API, or null if empty
        const toNumberOrNull = (val: any) => {
            if (val === '' || val === null || val === undefined) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        };

        // Strip campaign-related fields, sales metrics and related object to prevent payload pollution
        const { 
            is_campanha, is_campanha_active, desconto_campanha, preco_fixo_campanha, 
            studios, vendas_count, faturamento_gerado, badge_desempenho,
            ...restFigure 
        } = figure;

        const payload = {
            ...restFigure,
            resina_kg: toNumberOrNull(figure.resina_kg),
            horas_impressao: toNumberOrNull(figure.horas_impressao),
            horas_pintura: toNumberOrNull(figure.horas_pintura),
            altura_cm: toNumberOrNull(figure.altura_cm),
            largura_cm: toNumberOrNull(figure.largura_cm),
            profundidade_cm: toNumberOrNull(figure.profundidade_cm),
            escala: toNumberOrNull(figure.escala) || 100,
            tem_extras: !!figure.tem_extras,
            tem_pintura_real: !!figure.tem_pintura_real,
            sinonimos: figure.sinonimos || '',
        };

        try {
            const res = await fetch('/api/admin/figures', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Erro ao salvar');
            const data = await res.json();
            
            if (data.updatedMeta) {
                const m = data.updatedMeta;
                const formattedMeta = {
                    resina_kg: Number(m.resina_kg) === 0 ? '' : (m.resina_kg ?? ''),
                    horas_impressao: Number(m.horas_impressao) === 0 ? '' : (m.horas_impressao ?? ''),
                    horas_pintura: Number(m.horas_pintura) === 0 ? '' : (m.horas_pintura ?? ''),
                    altura_cm: Number(m.altura_cm) === 0 ? '' : (m.altura_cm ?? ''),
                    largura_cm: Number(m.largura_cm) === 0 ? '' : (m.largura_cm ?? ''),
                    profundidade_cm: Number(m.profundidade_cm) === 0 ? '' : (m.profundidade_cm ?? ''),
                    escala: m.escala ?? 100
                };
                setFigures(prev => {
                    if (selectedCategoryId === 'sem_preco' && Number(m.resina_kg) > 0) {
                        return prev.filter(f => f.id !== figure.id);
                    }
                    return prev.map(f => f.id === figure.id ? { 
                        ...f, 
                        ...figure,
                        ...formattedMeta
                    } : f);
                });
                setAllOriginalFigures(prev => {
                    const next = { ...prev };
                    if (next[figure.id]) {
                        next[figure.id] = {
                            ...next[figure.id],
                            ...figure,
                            ...formattedMeta
                        };
                    }
                    return next;
                });
            }
            // Remove from pendingChanges
            setPendingChanges(prev => {
                const next = { ...prev };
                delete next[figure.id];
                return next;
            });
            toast.success('Alterações salvas!');
        } catch (err) {
            toast.error('Erro ao salvar');
        } finally {
            setSavingId(null);
        }
    };

    const handleSaveAll = async () => {
        const dirtyIds = Object.keys(pendingChanges).map(Number);
        if (dirtyIds.length === 0) return;
        setIsSavingAll(true);
        
        const figuresToSave = dirtyIds.map(id => {
            const baseFigure = allOriginalFigures[id] || figures.find(f => f.id === id) || { id } as Figure;
            return {
                ...baseFigure,
                ...pendingChanges[id]
            };
        });
        
        // Ensure values are numbers for API, or null if empty
        const toNumberOrNull = (val: any) => {
            if (val === '' || val === null || val === undefined) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        };

        const promises = figuresToSave.map(async (figure) => {
            const { 
                is_campanha, is_campanha_active, desconto_campanha, preco_fixo_campanha, 
                studios, vendas_count, faturamento_gerado, badge_desempenho,
                ...restFigure 
            } = figure;
            const payload = {
                ...restFigure,
                resina_kg: toNumberOrNull(figure.resina_kg),
                horas_impressao: toNumberOrNull(figure.horas_impressao),
                horas_pintura: toNumberOrNull(figure.horas_pintura),
                altura_cm: toNumberOrNull(figure.altura_cm),
                largura_cm: toNumberOrNull(figure.largura_cm),
                profundidade_cm: toNumberOrNull(figure.profundidade_cm),
                escala: toNumberOrNull(figure.escala) || 100,
                tem_extras: !!figure.tem_extras,
                tem_pintura_real: !!figure.tem_pintura_real,
                sinonimos: figure.sinonimos || '',
            };

            const res = await fetch('/api/admin/figures', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(`Erro ao salvar a figura "${figure.nome || 'desconhecida'}"`);
            return res.json();
        });

        try {
            const results = await Promise.all(promises);
            
            // Apply updates to figures and original figures cache
            setFigures(prev => {
                let updated = prev.map(f => {
                    const idx = figuresToSave.findIndex(saveFig => saveFig.id === f.id);
                    if (idx !== -1 && results[idx] && results[idx].updatedMeta) {
                        const m = results[idx].updatedMeta;
                        return {
                            ...f,
                            ...figuresToSave[idx],
                            resina_kg: Number(m.resina_kg) === 0 ? '' : (m.resina_kg ?? ''),
                            horas_impressao: Number(m.horas_impressao) === 0 ? '' : (m.horas_impressao ?? ''),
                            horas_pintura: Number(m.horas_pintura) === 0 ? '' : (m.horas_pintura ?? ''),
                            altura_cm: Number(m.altura_cm) === 0 ? '' : (m.altura_cm ?? ''),
                            largura_cm: Number(m.largura_cm) === 0 ? '' : (m.largura_cm ?? ''),
                            profundidade_cm: Number(m.profundidade_cm) === 0 ? '' : (m.profundidade_cm ?? ''),
                            escala: m.escala ?? 100
                        };
                    }
                    return f;
                });

                if (selectedCategoryId === 'sem_preco') {
                    updated = updated.filter(f => {
                        const idx = figuresToSave.findIndex(saveFig => saveFig.id === f.id);
                        if (idx !== -1 && results[idx] && results[idx].updatedMeta) {
                            const m = results[idx].updatedMeta;
                            return Number(m.resina_kg) === 0 || !m.resina_kg;
                        }
                        return Number(f.resina_kg) === 0 || !f.resina_kg;
                    });
                }
                return updated;
            });

            setAllOriginalFigures(prev => {
                const next = { ...prev };
                figuresToSave.forEach((figure, idx) => {
                    if (results[idx] && results[idx].updatedMeta) {
                        const m = results[idx].updatedMeta;
                        const formattedMeta = {
                            resina_kg: Number(m.resina_kg) === 0 ? '' : (m.resina_kg ?? ''),
                            horas_impressao: Number(m.horas_impressao) === 0 ? '' : (m.horas_impressao ?? ''),
                            horas_pintura: Number(m.horas_pintura) === 0 ? '' : (m.horas_pintura ?? ''),
                            altura_cm: Number(m.altura_cm) === 0 ? '' : (m.altura_cm ?? ''),
                            largura_cm: Number(m.largura_cm) === 0 ? '' : (m.largura_cm ?? ''),
                            profundidade_cm: Number(m.profundidade_cm) === 0 ? '' : (m.profundidade_cm ?? ''),
                            escala: m.escala ?? 100
                        };
                        next[figure.id] = {
                            ...(next[figure.id] || figure),
                            ...figure,
                            ...formattedMeta
                        };
                    }
                });
                return next;
            });

            setPendingChanges({});
            toast.success('Todas as alterações foram salvas com sucesso!');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao salvar alterações');
        } finally {
            setIsSavingAll(false);
        }
    };

    const handleDiscardAll = () => {
        setPendingChanges({});
        toast.info('Alterações descartadas.');
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

            const data = await res.json();
            if (data.sheets?.deleted) {
                toast.success(`Figura e linha da planilha (${data.sheets.sheet} / Linha ${data.sheets.row}) excluídas!`);
            } else {
                toast.success('Figura removida com sucesso');
            }
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
        if (!settings) return { basic: 0, premium: 0, basicCredito: 0, premiumCredito: 0 };

        const h_imp = Number(f.horas_impressao);
        const res_kg = Number(f.resina_kg);
        const h_pint = Number(f.horas_pintura);

        // Custo Sem Pintura: Apenas produção, sem tempo de pintura
        const custoBaseEstilizado =
            (h_imp * settings.custo_h_impressao) +
            (res_kg * settings.custo_resina_kg);

        const custoBase =
            (h_imp * settings.custo_h_impressao) +
            (res_kg * settings.custo_resina_kg) +
            (h_pint * settings.custo_h_pintura);

        // Round up to nearest multiple of 5
        const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

        const mEstilizado = settings.margem_pobre || 1.15;
        const mColorido = settings.margem_basica || 1.30;

        return {
            basic: roundTo5(custoBaseEstilizado * mEstilizado),
            premium: roundTo5(custoBase * mColorido),
            basicCredito: roundTo5(custoBaseEstilizado * mEstilizado * (settings.taxa_cartao || 1.15)),
            premiumCredito: roundTo5(custoBase * mColorido * (settings.taxa_cartao || 1.15))
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
        { id: 0, label: 'Outros' },
    ];

    // Check for duplicate keys in figures (Accessing state)
    const duplicateIds = figures.map(f => f.id).filter((item, index, arr) => arr.indexOf(item) !== index);
    if (duplicateIds.length > 0) console.error('Duplicate IDs detected:', duplicateIds);

    return (
        <div className="w-full text-[var(--foreground)] relative transition-colors duration-300">
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
                    {/* Seletor de Estúdio & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="relative min-w-[200px]">
                            <select
                                value={studioParam || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val) {
                                        router.push(`/admin/figures?studio=${val}`);
                                    } else {
                                        router.push('/admin/figures');
                                    }
                                }}
                                className="w-full bg-[var(--card-bg)] border border-[var(--input-border)] text-xs font-bold text-[var(--foreground)] rounded-xl px-3 py-3 outline-none focus:border-orange-500 cursor-pointer shadow-sm appearance-none pr-8"
                            >
                                <option value="">Todos os Estúdios ({studiosList.length})</option>
                                {studiosList.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar figura..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-[var(--card-bg)] border border-[var(--input-border)] rounded-xl pl-10 pr-4 py-3 outline-none focus:border-orange-500 transition-all shadow-[var(--shadow-sm)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] text-sm"
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
                            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategoryId === null ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]'}`}
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
                <div className="w-full">

                    {/* Grade de Figuras (Cards) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-0 text-[var(--foreground)] bg-transparent w-full">
                        {figures.map(rawFigure => {
                            const f = { ...rawFigure, ...(pendingChanges[rawFigure.id] || {}) };
                            const prices = calculatePrices(f);
                            return (
                                <FigureCard
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
                                    setPhotoManagerFigure={setPhotoManagerFigure}
                                />
                            );
                        })}
                    </div>
                    {/* Botão Carregar Mais */}
                    {nextCursor !== undefined && (
                        <div className="flex justify-center p-6 w-full mt-6">
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

            {/* Photo Manager & Reorder Modal */}
            {photoManagerFigure && (
                <PhotoManagerModal
                    figure={photoManagerFigure}
                    onClose={() => setPhotoManagerFigure(null)}
                    onSaved={(updated) => {
                        setFigures(prev => prev.map(f => f.id === photoManagerFigure.id ? { ...f, ...updated } : f));
                    }}
                />
            )}
            {/* Barra Flutuante de Salvar Alterações */}
            {Object.keys(pendingChanges).length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-zinc-950/95 backdrop-blur border border-orange-500/30 px-6 py-4 rounded-2xl flex items-center gap-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-orange-500 animate-pulse" size={18} />
                        <span className="text-xs font-semibold text-zinc-200">
                            Você possui <strong className="text-orange-500">{Object.keys(pendingChanges).length}</strong> {Object.keys(pendingChanges).length === 1 ? 'figura com alterações pendentes.' : 'figuras com alterações pendentes.'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleDiscardAll}
                            disabled={isSavingAll}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                            Descartar
                        </button>
                        <button
                            onClick={handleSaveAll}
                            disabled={isSavingAll}
                            className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-black rounded-xl text-xs font-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                        >
                            {isSavingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Salvar Tudo
                        </button>
                    </div>
                </div>
            )}
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
