'use client';

import { useState } from 'react';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { clsx } from 'clsx';
import { ImageIcon, Maximize2, X, Sparkles } from 'lucide-react';

interface FigureCardProps {
    figure: FiguraDTO;
    onOpenModal: (f: FiguraDTO) => void;
}

export const FigureCard = ({ figure, onOpenModal }: FigureCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);

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
                <div className="absolute inset-0 backface-hidden" onClick={(e) => {
                    // If clicking the "Detalhes" badge logic handling or generic click
                    // Wait, usually clicking the Card Opens the Modal
                    // But we have a Flip now.
                    // Let's say: Clicking "Detalhes" -> Flip. Clicking Image -> Open Modal.
                    // Or Clicking Card -> Flip? 
                    // The user said "Toque fora para voltar" on the back.
                    // Previously `onOpenModal` was the main action. 
                    // Let's make: Card Click -> Open Modal. "Detalhes" Click -> Flip.
                    // BUT, the user wants the "Flip" back.
                    // Let's assume Card Click -> Open Modal is standard. 
                    // "Detalhes" Pill -> Trigger Flip.
                    // OR Hover -> Flip? No, user mentioned "Touch".
                    // Let's make the "Detalhes" button trigger the flip.
                }}>
                    <div className="relative w-full h-full bg-[#121214] rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all shadow-lg hover:shadow-xl">
                        <Image
                            src={figure.imagem_url || '/placeholder.png'}
                            alt={figure.nome}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 50vw, 25vw"
                            onClick={() => onOpenModal(figure)}
                        />

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
                            src={figure.imagem_url || '/placeholder.png'}
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

                            <a
                                href={buildBudgetLink()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-3 rounded-md transition-colors shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Pedir orçamento
                            </a>

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
