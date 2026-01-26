'use client';

import { useState } from 'react';
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
            className={clsx("group relative w-full aspect-[4/5] perspective-1000 cursor-pointer")}
            onClick={() => isFlipped && setIsFlipped(false)}
        >
            <div className={clsx(
                "relative w-full h-full transition-transform duration-500 transform-style-3d",
                isFlipped && "rotate-y-180"
            )}>

                {/* === FRONT FACE === */}
                <div className="absolute inset-0 backface-hidden">
                    <div className="relative w-full h-full bg-[#121214] rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all shadow-lg hover:shadow-xl">
                        <Link href={`/figura/${figure.slug || figure.id}`} scroll={false}>
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
                        {figure.disponivel && (
                            <div className="absolute top-3 left-3 z-10 pointer-events-none">
                                <span className="bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider shadow-sm">
                                    À Venda
                                </span>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-zinc-900/95 border-t border-white/5 backdrop-blur-sm pointer-events-none">
                            <h3 className="text-sm font-medium text-gray-200 line-clamp-1 text-center truncate">
                                {figure.nome}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* === BACK FACE === */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border border-zinc-700 bg-black">
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

                    {/* Content Overlay */}
                    <div className="relative z-10 flex flex-col h-full bg-black/60 p-4 text-white">

                        {/* Header Hint */}
                        <div className="flex justify-center mb-4">
                            <span className="text-[10px] text-zinc-400 bg-black/50 px-2 py-0.5 rounded cursor-pointer" onClick={() => setIsFlipped(false)}>
                                Toque fora para voltar
                            </span>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">

                            <h3 className="font-bold text-lg leading-tight drop-shadow-md">
                                {figure.nome}
                            </h3>

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
                                    "w-full font-bold py-3 rounded-md transition-colors shadow-lg active:scale-95",
                                    isInCart(figure.id)
                                        ? "bg-green-600 hover:bg-green-700 text-white"
                                        : "bg-orange-600 hover:bg-orange-700 text-white"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    isInCart(figure.id) ? removeFromCart(figure.id) : addToCart(figure);
                                }}
                            >
                                {isInCart(figure.id) ? "Adicionado ✓" : "Adicionar ao Orçamento"}
                            </button>

                        </div>

                        {/* Reflection/Footer Effect (Visual filler) */}
                        <div className="mt-auto opacity-30 text-center transform scale-y-[-1] blur-[1px] select-none pointer-events-none text-zinc-500 text-xs overflow-hidden h-6">
                            {figure.nome}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
