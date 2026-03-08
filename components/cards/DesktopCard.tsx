'use client';

import { useState } from 'react';
import { ImageIcon, Maximize2, X, Sparkles } from 'lucide-react';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { clsx } from 'clsx';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

interface FigureCardProps {
    figure: FiguraDTO;
}

export const DesktopCard = ({ figure }: FigureCardProps) => {
    const { addToCart, removeFromCart, isInCart } = useCart();
    const [isFlipped, setIsFlipped] = useState(false);

    const imageUrl = getOptimizedImageUrl(figure.imagem_url);

    const buildBudgetLink = () => {
        const msg = `Olá! Quero orçamento da figura: ${figure.nome}${figure.categoria ? ` (${figure.categoria})` : ''}.`;
        return `https://wa.me/5511959737551?text=${encodeURIComponent(msg)}`;
    };

    const handleFlip = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFlipped(!isFlipped);
    };

    return (
        <div
            className={clsx("group flip-card w-full aspect-[4/5] cursor-pointer", isFlipped && "is-flipped")}
            onClick={() => isFlipped && setIsFlipped(false)}
        >
            <div className="flip-card-inner">

                {/* === FRONT FACE === */}
                <div className="flip-card-front">
                    <div className="relative w-full h-full bg-[var(--card-bg)] rounded-lg overflow-hidden border border-[var(--card-border)] hover:border-orange-500/50 transition-all shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]">
                        <Link href={`/figura/${figure.id}`} scroll={false} className="absolute inset-0 z-10 block">
                            <Image
                                loader={imageKitLoader}
                                src={imageUrl}
                                alt={figure.nome}
                                fill
                                className="object-contain transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 768px) 50vw, 25vw"
                            />
                        </Link>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />

                        {/* Detalhes Button (Triggers Flip) */}
                        <div
                            className="absolute top-3 right-3 z-20 cursor-pointer"
                            onClick={handleFlip}
                        >
                            <span className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] sm:text-xs px-2.5 py-1 rounded-full border border-white/10 font-medium hover:bg-black/80 transition-colors">
                                Detalhes
                            </span>
                        </div>

                        {/* Badge */}
                        <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1 items-start">
                            {figure.disponivel && (
                                <div className="relative flex items-center bg-green-500/90 text-white text-[10px] font-bold pl-2 pr-3 py-0.5 shadow-md self-start"
                                    style={{
                                        clipPath: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%)',
                                        borderTopLeftRadius: '0.25rem',
                                        borderBottomLeftRadius: '0.25rem'
                                    }}>
                                    <span className="uppercase tracking-wider">Disponível</span>
                                    {/* The Hole */}
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 bg-black/40 rounded-full" />
                                </div>
                            )}
                            {figure.tem_extras && (
                                <div className="relative flex items-center gap-1 bg-gradient-to-r from-purple-600/90 to-fuchsia-600/90 text-white text-[10px] font-bold pl-2 pr-3 py-0.5 shadow-md self-start"
                                    style={{
                                        clipPath: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%)',
                                        borderTopLeftRadius: '0.25rem',
                                        borderBottomLeftRadius: '0.25rem'
                                    }}>
                                    <Sparkles className="w-3 h-3 text-purple-200" />
                                    <span className="uppercase tracking-wider">Com Extras</span>
                                    {/* The Hole */}
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 bg-black/40 rounded-full" />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-[var(--card-bg)]/90 border-t border-[var(--card-border)] backdrop-blur-md pointer-events-none group-hover:bg-orange-500/5 transition-all">
                            <h3 className="text-sm font-bold text-[var(--foreground)] line-clamp-1 text-center truncate tracking-tight">
                                {figure.nome}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* === BACK FACE === */}
                <div className="flip-card-back rounded-lg overflow-hidden border border-zinc-700 bg-black shadow-[var(--shadow-lg)]">
                    {/* Background Image (Blurred/Darkened) */}
                    <div className="absolute inset-0 opacity-30">
                        <Image
                            loader={imageKitLoader}
                            src={imageUrl}
                            alt="Background"
                            fill
                            className="object-cover blur-sm"
                        />
                    </div>

                    {/* Full Card Link Wrapper */}
                    <Link href={`/figura/${figure.id}`} scroll={false} className="absolute inset-0 z-0 block cursor-pointer" />

                    {/* Content Overlay */}
                    <div className="relative z-10 flex flex-col h-full bg-black/60 p-4 text-white pointer-events-none">

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 mt-4">

                            <h3 className="font-bold text-lg leading-tight drop-shadow-md">
                                {figure.nome}
                            </h3>
                            {figure.codigo && (
                                <span className="text-[10px] font-mono text-orange-500/80 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                    {figure.codigo}
                                </span>
                            )}

                            <div className="w-full text-sm font-medium space-y-2 px-2">
                                <div className="flex justify-between border-b border-white/10 pb-1">
                                    <span className="text-zinc-300">Altura</span>
                                    <span>{figure.altura_cm ? `${figure.altura_cm} cm` : '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-1">
                                    <span className="text-zinc-300">Largura</span>
                                    <span>{figure.largura_cm ? `${figure.largura_cm} cm` : '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-1">
                                    <span className="text-zinc-300">Profund.</span>
                                    <span>{figure.profundidade_cm ? `${figure.profundidade_cm} cm` : '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-1">
                                    <span className="text-zinc-300">Estúdio</span>
                                    <span className="text-orange-400">{figure.studio || '-'}</span>
                                </div>
                            </div>

                            <button
                                className={clsx(
                                    "w-full font-bold py-3 rounded-md transition-colors shadow-lg active:scale-95 pointer-events-auto",
                                    isInCart(figure.id)
                                        ? "bg-green-600 hover:bg-green-700 text-white"
                                        : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                                )}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    isInCart(figure.id) ? removeFromCart(figure.id) : addToCart(figure);
                                }}
                            >
                                {isInCart(figure.id) ? "Adicionado ✓" : "Adicionar ao Orçamento"}
                            </button>

                        </div>

                        {/* Reflection/Footer Effect (Visual filler) */}
                        <div className="mt-auto opacity-30 text-center transform scale-y-[-1] blur-[1px] select-none text-zinc-500 text-xs overflow-hidden h-6">
                            {figure.nome}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
