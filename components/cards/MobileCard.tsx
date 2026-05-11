'use client';

import { useState } from 'react';
import { FiguraDTO } from '@/lib/dto';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

interface MobileCardProps {
    figure: FiguraDTO;
    className?: string;
}

export const MobileCard = ({ figure, className }: MobileCardProps) => {
    const { addToCart, removeFromCart, isInCart } = useCart();

    return (
        <div
            className={clsx(
                "w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-hidden shadow-[var(--shadow-sm)] active:opacity-95 transition-all",
                className
            )}
        >
            <Link href={`/figura/${figure.slug || figure.id}`} scroll={false} className="flex w-full">
                {/* Left: Image (Square-ish) */}
                <div className="relative w-36 sm:w-48 aspect-[4/5] bg-[var(--input-bg)] border-r border-[var(--card-border)] flex-shrink-0">
                    <Image
                        loader={imageKitLoader}
                        src={getOptimizedImageUrl(figure.imagem_url)}
                        alt={figure.nome}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 33vw, 20vw"
                    />

                    {/* Available Badge on Image */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                        {figure.disponivel && (
                            <div className="relative flex items-center bg-green-600/90 text-white text-[9px] font-bold pl-1.5 pr-2.5 py-0.5 shadow-md self-start"
                                style={{
                                    clipPath: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%)',
                                    borderTopLeftRadius: '0.25rem',
                                    borderBottomLeftRadius: '0.25rem'
                                }}>
                                <span className="uppercase tracking-wide">Disponível</span>
                                {/* The Hole */}
                                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-0.5 bg-black/40 rounded-full" />
                            </div>
                        )}
                        {figure.tem_extras && (
                            <div className="relative flex items-center gap-1 bg-gradient-to-r from-purple-600/90 to-fuchsia-600/90 text-white text-[9px] font-bold pl-1.5 pr-2.5 py-0.5 shadow-md self-start"
                                style={{
                                    clipPath: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%)',
                                    borderTopLeftRadius: '0.25rem',
                                    borderBottomLeftRadius: '0.25rem'
                                }}>
                                <Sparkles className="w-2.5 h-2.5 text-purple-200" />
                                <span className="uppercase tracking-wide">Com Extras</span>
                                {/* The Hole */}
                                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-0.5 bg-black/40 rounded-full" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Content */}
                <div className="flex-1 p-3 flex flex-col min-w-0">

                    {/* Header Info */}
                    <div className="mb-1">
                        <div className="flex items-center gap-2 mb-1">
                            {figure.studio && (
                                <span className="text-[10px] text-[var(--text-muted)] border border-[var(--card-border)] px-1.5 py-0.5 rounded bg-[var(--input-bg)] font-medium">
                                    {figure.studio}
                                </span>
                            )}
                            {figure.codigo && (
                                <span className="text-[10px] text-orange-500 font-mono font-bold">
                                    #{figure.codigo}
                                </span>
                            )}
                            {figure.categoria && (
                                <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[50%] font-medium">
                                    {figure.categoria}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug line-clamp-2 uppercase tracking-tight">
                            {figure.nome}
                        </h3>
                    </div>

                    {/* Specs (Compact) */}
                    <div className="mt-auto space-y-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)] font-medium">
                            {figure.altura_cm && <span>H: <span className="text-[var(--foreground)] font-bold">{figure.altura_cm}cm</span></span>}
                            {figure.largura_cm && <span>W: <span className="text-[var(--foreground)] font-bold">{figure.largura_cm}cm</span></span>}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                            <div
                                className="flex-1 bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-muted)] text-xs py-2 rounded font-bold transition-all border border-[var(--input-border)] text-center shadow-sm"
                            >
                                Detalhes
                            </div>
                            <button
                                className={clsx(
                                    "flex-1 text-white text-xs py-2 rounded font-medium text-center transition-colors shadow-sm flex items-center justify-center gap-1",
                                    isInCart(figure.id)
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-orange-600/90 hover:bg-orange-600"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    isInCart(figure.id) ? removeFromCart(figure.id) : addToCart(figure);
                                }}
                            >
                                {isInCart(figure.id) ? "Adicionado ✓" : "Adicionar"}
                            </button>
                        </div>
                    </div>

                </div>
            </Link>
        </div>
    );
};
