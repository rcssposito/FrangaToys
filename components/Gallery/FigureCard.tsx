'use client';
 
import { useState } from 'react';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { clsx } from 'clsx';
import { Sparkles, Paintbrush, Palette, ChevronRight, Instagram, ArrowLeft, ArrowUpDown, ArrowLeftRight, Box, Shield, Award, ShieldCheck, ShoppingCart, Check } from 'lucide-react';
import Link from 'next/link';
import imageKitLoader from '@/lib/image-loader';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { getFigureTier, getTierBadgeStyle } from '@/lib/pricing';
 
interface FigureCardProps {
    figure: FiguraDTO;
    className?: string;
    priority?: boolean;
}
 
export const FigureCard = ({ figure, className, priority }: FigureCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
 
    const formatPrice = (val?: number) => {
        if (!val) return 'Sob consulta';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
 
    const trackClick = async () => {
        try {
            await fetch('/api/analytics/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ figureId: figure.id, source: 'vitrine', platform: 'site' }),
                keepalive: true // Crucial: mantém o sinal vivo mesmo mudando de página
            });
        } catch (e) {
            console.error('Analytics tracking failed', e);
        }
    };
 
    const handleFlip = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        trackClick(); // Conta como interesse mesmo se só girar
        setIsFlipped(!isFlipped);
    };
 
    const imageUrl = getOptimizedImageUrl(figure.imagem_url);
    const figurePrice = figure.precos?.estilizado || 0;
    const tier = figure.precos?.colorido ? getFigureTier(figure.precos.colorido) : null;
    const tierStyle = tier ? getTierBadgeStyle(tier) : null;
 
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
                <div className="flip-card-front relative bg-[#09090b] border border-zinc-800/40 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-500 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl group/front [transform:translateZ(0)]">
                    <Link 
                        href={`/figura/${figure.slug || figure.id}?ref=vitrine`} 
                        scroll={false} 
                        className="absolute inset-0 z-10"
                        onClick={() => trackClick()}
                    />
 
                    {/* Navigation Hint (Top Right) - Stacking context child of flip-card-front */}
                    <div
                        className="absolute top-0 right-0 p-2 sm:p-4 z-30"
                        onClick={handleFlip}
                    >
                        <div className="bg-black/80 backdrop-blur-xl border border-white/10 text-white text-[8px] sm:text-[9px] px-3 py-1.5 sm:px-3 sm:py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 shadow-2xl active:scale-95 touch-manipulation cursor-pointer">
                            Detalhes
                        </div>
                    </div>

                    {/* Image Area (Full bleed background) */}
                    <Image
                        loader={imageKitLoader}
                        src={imageUrl}
                        alt={figure.nome}
                        fill
                        className="object-contain p-2 transition-transform duration-700 group-hover/front:scale-105 opacity-90 group-hover/front:opacity-100"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        priority={priority}
                    />

                    {/* Status Badges Overlay (Top Left) */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-col gap-1.5 sm:gap-2 pointer-events-none">
                        {figure.disponivel && (
                            <div className="bg-emerald-950/40 backdrop-blur-md text-emerald-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider border border-emerald-500/20 shadow-md">
                                Disponível
                            </div>
                        )}
                        {tierStyle && (
                            <div className={clsx(
                                "text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider border shadow-md",
                                tierStyle.bg, tierStyle.text, tierStyle.border
                            )}>
                                {tierStyle.label}
                            </div>
                        )}
                        {figure.tem_pintura_real && (
                           <div className="bg-blue-950/40 backdrop-blur-md text-blue-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md border border-blue-500/20">
                                <Instagram size={10} /> Pintura Real
                           </div>
                        )}
                        {figure.tem_extras && (
                           <div className="bg-amber-950/40 backdrop-blur-md text-amber-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md border border-amber-500/20">
                                <Sparkles size={10} /> Extras
                           </div>
                        )}
                        {/* Oferta Badge */}
                        {!!(figure.is_campanha_active || (figure.preco_fixo_campanha && figure.preco_fixo_campanha > 0)) && (
                           <div className="bg-purple-950/40 backdrop-blur-md text-purple-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md border border-purple-500/20 animate-pulse">
                                <Sparkles size={10} className="fill-purple-400" /> Oferta
                           </div>
                        )}
                    </div>
 
                    {/* Footer Info (Glassmorphism Overlay for Contrast) */}
                    <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 pt-12 pb-4 sm:pb-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none">
                        <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
                            <div className="backdrop-blur-md bg-black/40 px-2 py-0.5 rounded-full border border-white/10 mb-1 shadow-2xl">
                                <h3 className="text-[7px] sm:text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] drop-shadow-md">
                                    {figure.studio || 'Studio Indiferente'}
                                </h3>
                            </div>
                            
                            <h2 className="text-xs sm:text-sm font-black text-white tracking-tight text-center leading-tight line-clamp-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                                {figure.nome}
                            </h2>
                            
                            {/* Starting Price Badge (High Visibility) */}
                            {figure.precos && (
                                <div className="mt-2 sm:mt-3 bg-zinc-950/80 backdrop-blur-xl border border-orange-500/20 px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-tighter shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                    <span className="text-[7px] sm:text-[8px] text-zinc-500 uppercase font-black mr-1.5 tracking-widest">A partir de</span>
                                    <span className="text-orange-400 font-extrabold">{formatPrice(figurePrice)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
 
                {/* === BACK FACE (Price Table & Info) === */}
                <div className="flip-card-back border border-zinc-800 bg-[#09090b] rounded-2xl sm:rounded-3xl overflow-hidden [transform:rotateY(180deg)_translateZ(0)]">
                    {/* Darkened Background Image */}
                    <div className="absolute inset-0 opacity-10 filter grayscale">
                        <Image
                            loader={imageKitLoader}
                            src={imageUrl}
                            alt="Background"
                            fill
                            className="object-cover blur-sm"
                            sizes="(max-width: 768px) 100vw, 33vw"
                        />
                    </div>
 
                    <Link 
                        href={`/figura/${figure.slug || figure.id}?ref=vitrine`}
                        scroll={false}
                        className="relative z-10 flex flex-col h-full cursor-pointer"
                        onClick={() => trackClick()}
                    >
                        {/* Header Hint */}
                        <div className="px-4 pt-4 sm:px-5 sm:pt-5 flex justify-between items-center text-zinc-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest relative z-20">
                            <span>Informações</span>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsFlipped(false);
                                }} 
                                className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors font-black uppercase tracking-widest"
                            >
                                <ArrowLeft size={11} className="stroke-[3]" /> Voltar
                            </button>
                        </div>
 
                        <div className="flex-1 px-4 sm:px-5 flex flex-col justify-between py-4 sm:py-5 gap-3">
                            {/* Dimensions Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex items-center gap-2 bg-zinc-950/40 border border-white/5 p-1.5 rounded-xl">
                                    <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-orange-400 flex-shrink-0">
                                        <ArrowUpDown size={13} className="stroke-[2.5]" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[6px] sm:text-[7px] text-zinc-500 font-bold uppercase tracking-wider leading-none mb-0.5">Altura</span>
                                        <span className="text-[10px] sm:text-xs font-black text-white leading-none">{figure.altura_cm || '-'}<small className="text-[8px] text-zinc-500 font-bold ml-0.5">cm</small></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-950/40 border border-white/5 p-1.5 rounded-xl">
                                    <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-orange-400 flex-shrink-0">
                                        <ArrowLeftRight size={13} className="stroke-[2.5]" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[6px] sm:text-[7px] text-zinc-500 font-bold uppercase tracking-wider leading-none mb-0.5">Largura</span>
                                        <span className="text-[10px] sm:text-xs font-black text-white leading-none">{figure.largura_cm || '-'}<small className="text-[8px] text-zinc-500 font-bold ml-0.5">cm</small></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-zinc-950/40 border border-white/5 p-1.5 rounded-xl">
                                    <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-orange-400 flex-shrink-0">
                                        <Box size={13} className="stroke-[2.5]" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[6px] sm:text-[7px] text-zinc-500 font-bold uppercase tracking-wider leading-none mb-0.5">Profund.</span>
                                        <span className="text-[10px] sm:text-xs font-black text-white leading-none">{figure.profundidade_cm || '-'}<small className="text-[8px] text-zinc-500 font-bold ml-0.5">cm</small></span>
                                    </div>
                                </div>
                            </div>
 
                            {/* Price Options */}
                            <div className="space-y-1.5">
                                <h4 className="text-[8px] sm:text-[9px] text-zinc-400 font-black uppercase tracking-widest ml-1 mb-0.5">Opções de Pintura</h4>
                                
                                {figure.precos ? (
                                    <div className="space-y-1.5">
                                        {/* Sem Pintura */}
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-white/5 hover:border-orange-500/10 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                                                    <Paintbrush size={13} className="stroke-[2.5]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tighter">Sem Pintura</div>
                                                    <div className="text-[7px] text-zinc-500 uppercase tracking-wider leading-none truncate">Apenas Impresso & Limpo</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[11px] sm:text-xs font-black text-white leading-none">{formatPrice(figure.precos.estilizado)}</div>
                                                <div className="text-[8px] font-extrabold text-emerald-500 tracking-tighter mt-0.5">PIX: {formatPrice(figure.precos.pix_estilizado)}</div>
                                            </div>
                                        </div>
  
                                        {/* Colorido */}
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-orange-500/20 hover:border-orange-500/40 transition-all relative shadow-[0_0_15px_rgba(249,115,22,0.03)]">
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-black border border-[#09090b] shadow-md z-30">
                                                <Check size={8} className="stroke-[4]" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 flex-shrink-0">
                                                    <Palette size={13} className="stroke-[2.5]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tighter">Colorido</div>
                                                    <div className="text-[7px] text-zinc-400 font-bold uppercase tracking-wider leading-none truncate">Pintura Premium</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[11px] sm:text-xs font-black text-white leading-none">{formatPrice(figure.precos.colorido)}</div>
                                                <div className="text-[8px] font-extrabold text-emerald-500 tracking-tighter mt-0.5">PIX: {formatPrice(figure.precos.pix_colorido)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-3 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 text-zinc-600 text-[8px] uppercase font-black tracking-widest">
                                        Preços Sob Consulta
                                    </div>
                                )}
                            </div>
 
                            {/* Diferenciais Grid */}
                            <div className="grid grid-cols-4 gap-1.5 border border-white/5 bg-zinc-950/20 rounded-xl p-2">
                                <div className="flex flex-col items-center text-center">
                                    <Shield size={12} className="text-orange-400 mb-0.5 stroke-[2.5]" />
                                    <span className="text-[5px] sm:text-[6px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Qualidade</span>
                                    <span className="text-[6px] sm:text-[7px] text-orange-400 font-black uppercase tracking-wider leading-none mt-0.5">Premium</span>
                                </div>
                                <div className="flex flex-col items-center text-center border-l border-white/5">
                                    <Sparkles size={12} className="text-orange-400 mb-0.5 stroke-[2.5]" />
                                    <span className="text-[5px] sm:text-[6px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Acabamento</span>
                                    <span className="text-[6px] sm:text-[7px] text-orange-400 font-black uppercase tracking-wider leading-none mt-0.5">Detalhado</span>
                                </div>
                                <div className="flex flex-col items-center text-center border-l border-white/5">
                                    <Award size={12} className="text-orange-400 mb-0.5 stroke-[2.5]" />
                                    <span className="text-[5px] sm:text-[6px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Pintura</span>
                                    <span className="text-[6px] sm:text-[7px] text-orange-400 font-black uppercase tracking-wider leading-none mt-0.5">Artesanal</span>
                                </div>
                                <div className="flex flex-col items-center text-center border-l border-white/5">
                                    <ShieldCheck size={12} className="text-orange-400 mb-0.5 stroke-[2.5]" />
                                    <span className="text-[5px] sm:text-[6px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Embalagem</span>
                                    <span className="text-[6px] sm:text-[7px] text-orange-400 font-black uppercase tracking-wider leading-none mt-0.5">Segura</span>
                                </div>
                            </div>
 
                            {/* CTA Action Button */}
                            <div className="w-full mt-auto">
                                <div className="w-full flex items-center justify-center bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 sm:py-4 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/15 hover:from-orange-400 hover:to-amber-400 active:scale-98 transition-all">
                                    <span>{figure.is_merchant ? 'Detalhes Completos' : 'Falar com o Ateliê'}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};
