'use client';

import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { clsx } from 'clsx';
import { ExternalLink, Tag } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/image-utils';

interface MobileCardProps {
    figure: FiguraDTO;
    onOpenModal: (f: FiguraDTO) => void;
    className?: string;
}

export const MobileCard = ({ figure, onOpenModal, className }: MobileCardProps) => {

    const buildBudgetLink = () => {
        const msg = `Olá! Quero orçamento da figura: ${figure.nome}${figure.categoria ? ` (${figure.categoria})` : ''}.`;
        return `https://wa.me/5511959737551?text=${encodeURIComponent(msg)}`;
    };

    return (
        <div
            className={clsx(
                "w-full flex bg-[#121214] border border-zinc-800 rounded-lg overflow-hidden shadow-sm active:opacity-95 transition-opacity",
                className
            )}
            onClick={() => onOpenModal(figure)}
        >
            {/* Left: Image (Square-ish) */}
            <div className="relative w-36 sm:w-48 aspect-[4/5] bg-zinc-900 border-r border-zinc-800 flex-shrink-0">
                <Image
                    src={getOptimizedImageUrl(figure.imagem_url)}
                    alt={figure.nome}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 33vw, 20vw"
                />

                {/* Available Badge on Image */}
                {figure.disponivel && (
                    <div className="absolute top-2 left-2 z-10">
                        <span className="bg-green-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide shadow-sm">
                            À Venda
                        </span>
                    </div>
                )}
            </div>

            {/* Right: Content */}
            <div className="flex-1 p-3 flex flex-col min-w-0">

                {/* Header Info */}
                <div className="mb-1">
                    <div className="flex items-center gap-2 mb-1">
                        {figure.studio && (
                            <span className="text-[10px] text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900/50">
                                {figure.studio}
                            </span>
                        )}
                        {figure.categoria && (
                            <span className="text-[10px] text-zinc-500 truncate max-w-[50%]">
                                {figure.categoria}
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-100 leading-snug line-clamp-2">
                        {figure.nome}
                    </h3>
                </div>

                {/* Specs (Compact) */}
                <div className="mt-auto space-y-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-400">
                        {figure.altura_cm && <span>H: <span className="text-zinc-300">{figure.altura_cm}cm</span></span>}
                        {figure.largura_cm && <span>W: <span className="text-zinc-300">{figure.largura_cm}cm</span></span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                        <button
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs py-2 rounded font-medium transition-colors border border-zinc-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenModal(figure);
                            }}
                        >
                            Detalhes
                        </button>
                        <a
                            href={buildBudgetLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-orange-600/90 hover:bg-orange-600 text-white text-xs py-2 rounded font-medium text-center transition-colors shadow-sm flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Orçar
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
};
