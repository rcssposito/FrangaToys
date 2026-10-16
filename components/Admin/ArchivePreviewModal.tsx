'use client';

import { useState, useEffect } from 'react';
import { 
    X, 
    Star, 
    Image as ImageIcon, 
    Sparkles, 
    Check, 
    Loader2, 
    Download,
    Eye,
    Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface InnerImage {
    innerPath: string;
    fileName: string;
    type: 'render_color' | 'render_grey' | 'technical' | 'test_print' | 'other';
    score: number;
    isSuggestedCover?: boolean;
    isSuggestedHover?: boolean;
}

interface ArchivePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    archivePath: string;
    figureName: string;
    categoryName?: string;
    onSaved?: (coverPath: string, hoverPath?: string) => void;
}

export default function ArchivePreviewModal({
    isOpen,
    onClose,
    archivePath,
    figureName,
    categoryName,
    onSaved
}: ArchivePreviewModalProps) {
    const [loading, setLoading] = useState(true);
    const [images, setImages] = useState<InnerImage[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    
    // Seleções
    const [selectedCover, setSelectedCover] = useState<string | null>(null);
    const [selectedHover, setSelectedHover] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Carrega imagens do compactado
    useEffect(() => {
        if (!isOpen || !archivePath) return;

        setLoading(true);
        setSelectedCover(null);
        setSelectedHover(null);

        fetch(`/api/admin/automation/inspect-archive?archivePath=${encodeURIComponent(archivePath)}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    toast.error(data.error);
                    setImages([]);
                } else {
                    const imgs: InnerImage[] = data.images || [];
                    setImages(imgs);

                    // Pré-seleciona apenas a Capa sugerida pela IA
                    const suggestedCover = imgs.find(i => i.isSuggestedCover);
                    if (suggestedCover) setSelectedCover(suggestedCover.innerPath);
                    // Hover começa vazio (100% opcional)
                }
            })
            .catch(err => {
                toast.error('Erro ao inspecionar compactado: ' + err.message);
                setImages([]);
            })
            .finally(() => setLoading(false));
    }, [isOpen, archivePath]);

    if (!isOpen) return null;

    // Filtros
    const filteredImages = images.filter(img => {
        if (filterType === 'all') return true;
        if (filterType === 'color') return img.type === 'render_color';
        if (filterType === 'grey') return img.type === 'render_grey';
        if (filterType === 'print') return img.type === 'test_print';
        if (filterType === 'technical') return img.type === 'technical';
        return true;
    });

    // Salvar e extrair
    const handleSave = async () => {
        if (!selectedCover) {
            toast.error('Selecione pelo menos uma imagem para ser a Capa.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/automation/extract-chosen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    archivePath,
                    figureName,
                    categoryName: categoryName || 'Random',
                    coverInnerPath: selectedCover,
                    hoverInnerPath: selectedHover
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao extrair imagem.');

            toast.success(`Foto extraída para a pasta da figura! Agora basta rodar a etapa de otimização/Script.ps1.`);
            if (onSaved) onSaved(data.coverExtracted, data.hoverExtracted);
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Falha ao salvar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-card border border-border/70 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-border/40 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold flex items-center gap-2">
                                Escolher Imagem da Pasta (Substitui Ação Manual)
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300">
                                    Preview Instantâneo
                                </span>
                            </h2>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-xl mt-0.5" title={archivePath}>
                                {figureName} ({images.length} fotos encontradas)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !selectedCover}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {saving ? 'Extraindo Foto...' : 'Extrair para Pasta da Figura'}
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filtros e Legenda */}
                <div className="px-5 py-3 border-b border-border/30 bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                        <span className="text-muted-foreground font-medium mr-1 text-[11px]">Filtrar:</span>
                        {[
                            { id: 'all', label: `Todas (${images.length})` },
                            { id: 'color', label: `Coloridas (${images.filter(i => i.type === 'render_color').length})` },
                            { id: 'grey', label: `Clay/Cinza (${images.filter(i => i.type === 'render_grey').length})` },
                            { id: 'print', label: `Testes Impressão (${images.filter(i => i.type === 'test_print').length})` },
                            { id: 'technical', label: `Técnicas (${images.filter(i => i.type === 'technical').length})` }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterType(f.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${filterType === f.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            ⭐ Capa Principal
                        </span>
                        {selectedHover ? (
                            <button
                                onClick={() => setSelectedHover(null)}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 font-medium hover:bg-rose-950/50 hover:border-rose-500/30 hover:text-rose-300 transition-all"
                                title="Clique para remover imagem de hover"
                            >
                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                                🖼️ Hover Ativo (Remover ✕)
                            </button>
                        ) : (
                            <span className="flex items-center gap-1.5 text-muted-foreground/70 font-normal">
                                <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                🖼️ Sem Hover (Opcional)
                            </span>
                        )}
                    </div>
                </div>

                {/* Conteúdo / Grade de Fotos */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                            <p className="text-sm font-medium">Lendo índice interno do compactado sem descompactar...</p>
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-20">
                            <ImageIcon className="w-10 h-10 stroke-[1.5] text-muted-foreground/40" />
                            <p className="text-sm font-medium">Nenhuma imagem encontrada nesta categoria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredImages.map((img, idx) => {
                                const isCover = selectedCover === img.innerPath;
                                const isHover = selectedHover === img.innerPath;
                                const thumbnailUrl = `/api/admin/automation/archive-thumbnail?archivePath=${encodeURIComponent(archivePath)}&innerPath=${encodeURIComponent(img.innerPath)}`;

                                return (
                                    <div
                                        key={idx}
                                        className={`group relative rounded-xl border overflow-hidden bg-black/40 flex flex-col transition-all ${
                                            isCover 
                                                ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10' 
                                                : isHover 
                                                ? 'border-blue-400 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10' 
                                                : 'border-border/60 hover:border-border'
                                        }`}
                                    >
                                        {/* Badges de Status */}
                                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                            {isCover && (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[10px] shadow-md flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-black" />
                                                    CAPA
                                                </span>
                                            )}
                                            {isHover && (
                                                <span className="px-2 py-0.5 rounded-md bg-blue-500 text-white font-extrabold text-[10px] shadow-md flex items-center gap-1">
                                                    <Eye className="w-3 h-3" />
                                                    HOVER
                                                </span>
                                            )}
                                        </div>

                                        {/* Imagem Stream */}
                                        <div className="aspect-square w-full relative bg-muted/20 flex items-center justify-center overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={thumbnailUrl}
                                                alt={img.fileName}
                                                loading="lazy"
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>

                                        {/* Detalhes e Botões de Ação */}
                                        <div className="p-2.5 bg-card flex flex-col justify-between flex-1 gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-mono text-foreground/90 truncate" title={img.fileName}>
                                                    {img.fileName}
                                                </p>
                                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                                    {img.type.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/30">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCover(img.innerPath);
                                                        if (selectedHover === img.innerPath) setSelectedHover(null);
                                                    }}
                                                    className={`py-1 rounded text-[10px] font-bold transition-all ${
                                                        isCover
                                                            ? 'bg-amber-500 text-black shadow-sm'
                                                            : 'bg-muted/40 hover:bg-amber-500/20 text-foreground/80 hover:text-amber-300'
                                                    }`}
                                                >
                                                    {isCover ? '⭐ Capa' : 'Virar Capa'}
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (isHover) {
                                                            setSelectedHover(null);
                                                        } else {
                                                            setSelectedHover(img.innerPath);
                                                            if (selectedCover === img.innerPath) setSelectedCover(null);
                                                        }
                                                    }}
                                                    className={`py-1 rounded text-[10px] font-bold transition-all ${
                                                        isHover
                                                            ? 'bg-blue-500 text-white shadow-sm hover:bg-rose-600'
                                                            : 'bg-muted/40 hover:bg-blue-500/20 text-muted-foreground hover:text-blue-300'
                                                    }`}
                                                    title={isHover ? 'Clique para desmarcar e ficar sem hover' : 'Definir como imagem secundária (opcional)'}
                                                >
                                                    {isHover ? '✕ Tirar Hover' : '+ Hover (Opcional)'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
