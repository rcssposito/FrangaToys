'use client';

import { useState } from 'react';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { clsx } from 'clsx';
import { Sparkles, Paintbrush, Palette, Crown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import imageKitLoader from '@/lib/image-loader';
import { getOptimizedImageUrl } from '@/lib/image-utils';

interface FigureCardProps {
    figure: FiguraDTO;
    className?: string;
}

export const FigureCard = ({ figure, className }: FigureCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const formatPrice = (val?: number) => {
        if (!val) return 'Sob consulta';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleFlip = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFlipped(!isFlipped);
    };

    const imageUrl = getOptimizedImageUrl(figure.imagem_url);

    return (
        <div
            className={clsx(
                "group flip-card w-full aspect-[4/5] cursor-pointer", 
                isFlipped && "is-flipped",
                className
            )}
            onClick={() => isFlipped && setIsFlipped(false)}
        >
            <div className="flip-card-inner">

                {/* === FRONT FACE (Luxury Design) === */}
                <div className="flip-card-front bg-[#09090b] border border-zinc-800/50 hover:border-blue-500/30 transition-all duration-500 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl group/front">
                    <Link href={`/figura/${figure.id}`} scroll={false} className="absolute inset-0 z-10">
                        <Image
                            loader={imageKitLoader}
                            src={imageUrl}
                            alt={figure.nome}
                            fill
                            className="object-contain p-4 transition-transform duration-700 group-hover/front:scale-110 opacity-90 group-hover/front:opacity-100"
                            sizes="(max-width: 768px) 50vw, 25vw"
                        />
                    </Link>

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 pointer-events-none" />

                    {/* Navigation Hint (Top Right) */}
                    <div
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20"
                        onClick={handleFlip}
                    >
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 text-white/70 text-[9px] sm:text-[10px] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300">
                            Detalhes
                        </div>
                    </div>

                    {/* Status Badges (Top Left) */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-col gap-1.5 sm:gap-2">
                        {figure.disponivel && (
                            <div className="bg-emerald-500 text-black text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm uppercase tracking-tighter shadow-lg shadow-emerald-500/20">
                                Disponível
                            </div>
                        )}
                        {figure.tem_extras && (
                           <div className="bg-amber-400 text-black text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm uppercase tracking-tighter flex items-center gap-1 shadow-lg shadow-amber-400/20">
                                <Sparkles size={10} /> Extras
                           </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 pt-8 bg-gradient-to-t from-black to-transparent pointer-events-none">
                        <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
                            <h3 className="text-[9px] sm:text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">
                                {figure.studio || 'Studio Indiferente'}
                            </h3>
                            <h2 className="text-sm sm:text-base font-black text-white tracking-tight text-center leading-tight line-clamp-1">
                                {figure.nome}
                            </h2>
                            
                            {/* Starting Price Badge */}
                            <div className="mt-2 sm:mt-3 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-blue-400 text-[10px] sm:text-xs font-black tracking-tighter">
                                <span className="text-[8px] sm:text-[9px] text-zinc-500 uppercase font-black mr-1 sm:mr-2 tracking-widest">A partir de</span>
                                {formatPrice(figure.precos?.estilizado)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* === BACK FACE (Price Table & Info) === */}
                <div className="flip-card-back border border-zinc-800 bg-[#09090b] rounded-2xl sm:rounded-3xl overflow-hidden">
                    {/* Darkened Background Image */}
                    <div className="absolute inset-0 opacity-10 filter grayscale">
                        <Image
                            loader={imageKitLoader}
                            src={imageUrl}
                            alt="Background"
                            fill
                            className="object-cover blur-sm"
                        />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full">
                        {/* Header Hint */}
                        <div className="px-4 pt-4 sm:px-6 sm:pt-6 flex justify-between items-center text-zinc-500 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                            <span>Informações</span>
                            <button onClick={() => setIsFlipped(false)} className="hover:text-white transition-colors">Voltar</button>
                        </div>

                        <div className="flex-1 px-4 sm:px-6 flex flex-col justify-center gap-4 sm:gap-6">
                            {/* Dimensions Table */}
                            <div className="grid grid-cols-3 gap-1 sm:gap-2 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] sm:text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Altura</span>
                                    <span className="text-xs sm:text-sm font-black text-white">{figure.altura_cm || '-'}<small className="text-[8px] sm:text-[10px] text-zinc-600 ml-0.5">cm</small></span>
                                </div>
                                <div className="flex flex-col items-center border-x border-zinc-800">
                                    <span className="text-[7px] sm:text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Largura</span>
                                    <span className="text-xs sm:text-sm font-black text-white">{figure.largura_cm || '-'}<small className="text-[8px] sm:text-[10px] text-zinc-600 ml-0.5">cm</small></span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] sm:text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Profund.</span>
                                    <span className="text-xs sm:text-sm font-black text-white">{figure.profundidade_cm || '-'}<small className="text-[8px] sm:text-[10px] text-zinc-600 ml-0.5">cm</small></span>
                                </div>
                            </div>

                            {/* Price Options Table */}
                            <div className="space-y-1.5 sm:space-y-2">
                                <h4 className="text-[8px] sm:text-[9px] text-zinc-500 font-black uppercase tracking-widest ml-1 mb-1 sm:mb-2">Opções de Pintura</h4>
                                
                                {figure.precos ? (
                                    <>
                                        {/* Pack Estilizado (Bronze) */}
                                        <div className="group/row flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-zinc-900/80 border border-zinc-800/50 hover:border-amber-700/50 transition-all">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-amber-900/20 border border-amber-900/30 flex items-center justify-center text-amber-600">
                                                    <Paintbrush size={14} />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tighter">Estilizado</div>
                                                    <div className="hidden sm:block text-[8px] text-zinc-500 uppercase tracking-widest">Base/Sombra</div>
                                                </div>
                                            </div>
                                            <div className="text-xs sm:text-sm font-black text-white">{formatPrice(figure.precos.estilizado)}</div>
                                        </div>

                                        {/* Pack Colorido (Prata) */}
                                        <div className="group/row flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-zinc-900/80 border border-zinc-800/50 hover:border-zinc-400/50 transition-all">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-zinc-500/20 border border-zinc-500/30 flex items-center justify-center text-zinc-400">
                                                    <Palette size={14} />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tighter">Colorido</div>
                                                    <div className="hidden sm:block text-[8px] text-zinc-400 uppercase tracking-widest font-bold">Standard</div>
                                                </div>
                                            </div>
                                            <div className="text-xs sm:text-sm font-black text-white">{formatPrice(figure.precos.colorido)}</div>
                                        </div>

                                        {/* Pack Premium (Elite/Purple) */}
                                        <div className="group/row flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-purple-500/5 border border-purple-500/20 hover:border-purple-500/50 transition-all ring-1 ring-purple-500/10">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                                    <Crown size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] sm:text-[10px] font-black text-purple-300 uppercase tracking-tighter">Premium</div>
                                                    <div className="hidden sm:block text-[8px] text-purple-500 uppercase tracking-widest font-black">2D/Elite</div>
                                                </div>
                                            </div>
                                            <div className="text-xs sm:text-sm font-black text-purple-300">{formatPrice(figure.precos.premium)}</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-4 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800 text-zinc-600 text-[10px] uppercase font-black tracking-widest">
                                        Preços Sob Consulta
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Button (Always visible) */}
                        <div className="p-4 sm:p-6 pt-0">
                            <Link
                                href={`/figura/${figure.id}`}
                                scroll={false}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 sm:py-3.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                            >
                                Detalhes <ChevronRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
