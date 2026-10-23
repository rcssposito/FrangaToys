'use client';

import { useState, useEffect } from 'react';
import { Search, X, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';

interface FigureItem {
    id: number;
    nome: string;
    imagem_url?: string;
    imagem_secundaria?: string;
    fotos_extras?: string[];
    studio?: { nome: string };
    estudio?: { nome: string };
}

interface FigureCatalogPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFigure: (figure: { nome: string; studioName: string; imageUrl: string }) => void;
}

export default function FigureCatalogPickerModal({
    isOpen,
    onClose,
    onSelectFigure
}: FigureCatalogPickerModalProps) {
    const [figures, setFigures] = useState<FigureItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchFigures = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/figures?limit=60&search=${encodeURIComponent(search)}`);
                if (res.ok) {
                    const data = await res.json();
                    setFigures(data.figures || data.items || []);
                }
            } catch (err) {
                console.error('Erro ao buscar catálogo de figuras:', err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchFigures, 250);
        return () => clearTimeout(timer);
    }, [isOpen, search]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-white">
                                Selecionar Arte do Catálogo
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Escolha uma figure para importar a ilustração e o estúdio na base
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/30">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nome da figure, personagem ou anime..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Figures List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                                Carregando catálogo...
                            </p>
                        </div>
                    ) : figures.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                            <ImageIcon className="w-10 h-10 text-zinc-700 mx-auto" />
                            <p className="text-sm font-bold text-zinc-400">Nenhuma figure encontrada</p>
                            <p className="text-xs text-zinc-600">Tente buscar com outro termo</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {figures.map((fig) => {
                                const studioName = fig.studio?.nome || fig.estudio?.nome || 'Franga Toys';
                                const imgUrl = fig.imagem_url || fig.imagem_secundaria || '';

                                return (
                                    <div
                                        key={fig.id}
                                        onClick={() => {
                                            if (imgUrl) {
                                                onSelectFigure({
                                                    nome: fig.nome,
                                                    studioName,
                                                    imageUrl: imgUrl
                                                });
                                                onClose();
                                            }
                                        }}
                                        className="group relative rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-900/40 hover:border-orange-500/50 hover:bg-zinc-900 transition-all cursor-pointer flex flex-col"
                                    >
                                        <div className="aspect-square w-full bg-zinc-950 overflow-hidden relative">
                                            {imgUrl ? (
                                                <img
                                                    src={imgUrl}
                                                    alt={fig.nome}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                                    <ImageIcon size={24} />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                                                <span className="text-[10px] font-black uppercase text-orange-400">
                                                    Usar Arte →
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                                            <p className="text-xs font-bold text-zinc-200 line-clamp-1 group-hover:text-orange-400 transition-colors">
                                                {fig.nome}
                                            </p>
                                            <span className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                                                {studioName}
                                            </span>
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
