'use client';
 
import { useState, memo } from 'react';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { clsx } from 'clsx';
import { Sparkles, Paintbrush, Palette, ChevronRight, Instagram, ArrowLeft, ArrowUpDown, ArrowLeftRight, Box, ShoppingCart, Check, Heart, Zap } from 'lucide-react';
import Link from 'next/link';
import imageKitLoader from '@/lib/image-loader';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { getFigureTier, getTierBadgeStyle } from '@/lib/pricing';
import { useWishlist } from '@/context/WishlistContext';
 
interface FigureCardProps {
    figure: FiguraDTO;
    className?: string;
    priority?: boolean;
}
 
export const FigureCard = memo(({ figure, className, priority }: FigureCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [hasFlipped, setHasFlipped] = useState(false);
    const { isInWishlist, toggleWishlist } = useWishlist();
    const inWishlist = isInWishlist(figure.id);

    const formatPrice = (val?: number) => {
        if (!val) return 'Sob consulta';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
 
    const trackClick = async () => {
        try {
            if (typeof window !== 'undefined') {
                const h = window.location.hostname;
                if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || window.location.port === '3000') {
                    return;
                }
            }
            if (typeof document !== 'undefined' && document.cookie.includes('admin_session=')) {
                return;
            }

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
        setHasFlipped(true);
        setIsFlipped(!isFlipped);
    };    const imageUrl = getOptimizedImageUrl(figure.imagem_url);
    const secondaryImageUrl = figure.imagem_secundaria
        ? getOptimizedImageUrl(figure.imagem_secundaria)
        : (figure.fotos_extras && figure.fotos_extras.length > 0)
            ? getOptimizedImageUrl(figure.fotos_extras[0])
            : null;

    const figurePrice = figure.precos?.pix_colorido || figure.precos?.colorido || figure.precos?.pix_estilizado || 0;
    const tier = figure.precos?.colorido ? getFigureTier(figure.precos.colorido) : null;
    const tierStyle = tier ? getTierBadgeStyle(tier) : null;
 
    return (
        <div
            className={clsx(
                "group flip-card w-full aspect-[4/5] cursor-pointer", 
                hasFlipped && "has-flipped",
                isFlipped && "is-flipped",
                className
            )}
            onClick={() => isFlipped && setIsFlipped(false)}
        >
            <div className="flip-card-inner">
 
                {/* === FRONT FACE (Luxury Design) === */}
                <div className="flip-card-front relative bg-[#09090b] border border-zinc-800/40 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-500 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl group/front">
                    <Link 
                        href={`/figura/${figure.slug || figure.id}?ref=vitrine`} 
                        className="absolute inset-0 z-10"
                        onClick={() => trackClick()}
                    />
 
                    {/* Top Right Action Controls (IHC: Prominent, non-overlapping, high-contrast, min 44px ergonomics) */}
                    <div className="absolute top-2 right-2 sm:top-3.5 sm:right-3.5 z-30 flex items-center gap-1.5 sm:gap-2">
                        {/* Navigation Hint (Flip to see details - Desktop only to keep mobile uncluttered) */}
                        <button
                            type="button"
                            onClick={handleFlip}
                            className="hidden sm:inline-block bg-zinc-950/90 border border-white/15 text-white/90 text-[8px] sm:text-[9px] px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 shadow-xl active:scale-95 touch-manipulation cursor-pointer"
                            title="Girar para ver dimensões e opções"
                        >
                            Detalhes
                        </button>

                        {/* Wishlist Heart Button - Always visible on card with high contrast */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleWishlist({
                                    id: figure.id,
                                    nome: figure.nome,
                                    imagem_url: figure.imagem_url,
                                    codigo: figure.codigo,
                                    preco: figurePrice,
                                    precos: figure.precos,
                                    serie: figure.serie,
                                    studio: figure.studio,
                                    slug: figure.slug,
                                    is_campanha: !!(figure.is_campanha_active || (figure.preco_fixo_campanha && figure.preco_fixo_campanha > 0))
                                });
                            }}
                            className={clsx(
                                "w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all duration-300 shadow-xl active:scale-90 cursor-pointer touch-manipulation",
                                inWishlist
                                    ? "bg-orange-950/90 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.35)] scale-105"
                                    : "bg-zinc-950/90 border-white/20 text-white/80 hover:text-orange-400 hover:border-orange-500/50 hover:bg-black hover:scale-105"
                            )}
                            title={inWishlist ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                            aria-label={inWishlist ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                        >
                            <Heart 
                                size={14} 
                                className={clsx(
                                    "transition-all duration-300", 
                                    inWishlist ? "fill-orange-500 text-orange-500 scale-110" : "hover:scale-110"
                                )} 
                            />
                        </button>
                    </div>

                    {/* Mini Indicador de Galeria (Estilo Stories / Luxury - sutil no topo) */}
                    {secondaryImageUrl && (
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 pointer-events-none opacity-40 group-hover/front:opacity-100 transition-all duration-300">
                            <span className="h-0.5 w-2.5 sm:w-3 rounded-full bg-white transition-all duration-300 group-hover/front:bg-white/40 shadow-sm" />
                            <span className="h-0.5 w-2.5 sm:w-3 rounded-full bg-white/40 transition-all duration-300 group-hover/front:bg-orange-500 shadow-sm" />
                        </div>
                    )}

                    {/* Image Area (Primary Image) */}
                    <Image
                        loader={imageKitLoader}
                        src={imageUrl}
                        alt={figure.nome}
                        fill
                        className={clsx(
                            "object-contain p-2 transition-transform duration-700",
                            secondaryImageUrl 
                                ? "group-hover/front:opacity-0 group-hover/front:scale-105" 
                                : "group-hover/front:scale-105"
                        )}
                        sizes="(max-width: 768px) 50vw, 25vw"
                        priority={priority}
                    />

                    {/* Secondary Image (Crossfade suave no Hover) */}
                    {secondaryImageUrl && (
                        <Image
                            loader={imageKitLoader}
                            src={secondaryImageUrl}
                            alt={`${figure.nome} - Vista alternativa`}
                            fill
                            className="object-contain p-2 transition-all duration-700 opacity-0 group-hover/front:opacity-100 group-hover/front:scale-105"
                            sizes="(max-width: 768px) 50vw, 25vw"
                        />
                    )}

                    {/* Status Badges Overlay (Top Left - Curated for Mobile) */}
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 flex flex-col items-start gap-1 sm:gap-2 pointer-events-none max-w-[65%]">
                        {figure.pronta_entrega && (
                            <div className="bg-amber-950/90 text-amber-300 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md border border-amber-500/40">
                                <Zap size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                                <span className="truncate">Envio 24h</span>
                                {figure.estoque_pronta_entrega && figure.estoque_pronta_entrega > 1 ? (
                                    <span className="text-[7px] opacity-80 hidden sm:inline">({figure.estoque_pronta_entrega}un)</span>
                                ) : null}
                            </div>
                        )}
                        {/* Oferta Badge */}
                        {!!(figure.is_campanha_active || (figure.preco_fixo_campanha && figure.preco_fixo_campanha > 0)) && (
                            <div className="bg-purple-950/90 text-purple-300 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md border border-purple-500/40">
                                <Sparkles size={10} className="fill-purple-400 shrink-0" />
                                <span>
                                    Oferta{figure.desconto_campanha && figure.desconto_campanha > 0 ? ` -${figure.desconto_campanha}%` : ''}
                                </span>
                            </div>
                        )}
                        {/* Combo / Bundle Badge */}
                        {!!(figure.is_bundle || figure.precos?.desconto_bundle_pct) && (
                            <div className="bg-gradient-to-r from-purple-950/95 to-indigo-950/95 text-purple-300 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md border border-purple-500/40">
                                <Sparkles size={10} className="fill-purple-400 shrink-0" /> Combo -{figure.precos?.desconto_bundle_pct || figure.desconto_bundle_pct || 20}%
                            </div>
                        )}
                        {figure.disponivel && !figure.pronta_entrega && (
                            <div className="hidden sm:inline-block bg-emerald-950/85 text-emerald-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider border border-emerald-500/30 shadow-md">
                                Disponível
                            </div>
                        )}
                        {tierStyle && (
                            <div className={clsx(
                                "hidden sm:inline-block text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider border shadow-md",
                                tierStyle.bg, tierStyle.text, tierStyle.border
                            )}>
                                {tierStyle.label}
                            </div>
                        )}
                        {figure.tem_pintura_real && (
                            <div className="hidden sm:flex bg-blue-950/85 text-blue-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider items-center gap-1 shadow-md border border-blue-500/30">
                                <Instagram size={10} /> Ver Fotos
                            </div>
                        )}
                        {figure.tem_extras && (
                            <div className="hidden sm:flex bg-amber-950/85 text-amber-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider items-center gap-1 shadow-md border border-amber-500/30">
                                <Sparkles size={10} /> Extras
                            </div>
                        )}
                    </div>

                    {/* Footer Info (Glassmorphism Overlay for Contrast) */}
                    <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-5 pt-8 sm:pt-12 pb-3 sm:pb-6 bg-gradient-to-t from-black via-black/85 to-transparent z-20 pointer-events-none">
                        <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
                            <div className="bg-zinc-950/90 px-2 py-0.5 rounded-full border border-white/10 mb-0.5 sm:mb-1 shadow-2xl">
                                <h3 className="text-[7px] sm:text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] drop-shadow-md truncate max-w-[140px] sm:max-w-none">
                                    {figure.studio || 'Studio Indiferente'}
                                </h3>
                            </div>
                            
                            <h2 className="text-xs sm:text-sm font-black text-white tracking-tight text-center leading-tight line-clamp-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                                {figure.nome}
                            </h2>
                            
                            {/* Starting Price Badge (High Visibility & Always Shows Price) */}
                            {(figure.precos || figure.preco) && (
                                <div className="mt-1 sm:mt-3 bg-zinc-950/95 border border-orange-500/25 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-tighter shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-1 sm:gap-1.5">
                                    <span className="text-[7px] sm:text-[8px] text-zinc-400 uppercase font-black mr-0.5 tracking-widest hidden sm:inline">A partir de</span>
                                    {figure.precos?.original_pix_colorido && figurePrice < figure.precos.original_pix_colorido && (
                                        <span className="text-[8px] sm:text-[9px] text-zinc-500 line-through font-mono">
                                            {formatPrice(figure.precos.original_pix_colorido)}
                                        </span>
                                    )}
                                    <span className="text-orange-400 font-extrabold">{formatPrice(figurePrice || figure.preco || 0)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
 
                {/* === BACK FACE (Price Table & Info) === */}
                <div className="flip-card-back border border-zinc-800 bg-[#09090b] rounded-2xl sm:rounded-3xl overflow-hidden">
                    {/* Darkened Background Image (lazy-rendered only when flipped) */}
                    {(isFlipped || hasFlipped) && (
                        <div className="absolute inset-0 opacity-10 filter grayscale">
                            <Image
                                loader={imageKitLoader}
                                src={imageUrl}
                                alt="Background"
                                fill
                                className="object-cover blur-sm"
                                sizes="(max-width: 768px) 50vw, 25vw"
                            />
                        </div>
                    )}
 
                    <Link 
                        href={`/figura/${figure.slug || figure.id}?ref=vitrine`}
                        className="relative z-10 flex flex-col h-full cursor-pointer"
                        onClick={() => trackClick()}
                    >
                        {/* Header Hint */}
                        <div className="px-4 pt-4 sm:px-5 sm:pt-5 flex justify-between items-center text-zinc-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest relative z-20">
                            <span>Informações</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleWishlist({
                                            id: figure.id,
                                            nome: figure.nome,
                                            imagem_url: figure.imagem_url,
                                            codigo: figure.codigo,
                                            preco: figurePrice,
                                            precos: figure.precos,
                                            serie: figure.serie,
                                            studio: figure.studio,
                                            slug: figure.slug,
                                            is_campanha: !!(figure.is_campanha_active || (figure.preco_fixo_campanha && figure.preco_fixo_campanha > 0))
                                        });
                                    }}
                                    className={clsx(
                                        "p-1.5 rounded-full transition-all duration-200 border cursor-pointer",
                                        inWishlist
                                            ? "bg-orange-500/20 border-orange-500/60 text-orange-400"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                    )}
                                    title={inWishlist ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                                    aria-label="Adicionar aos Favoritos"
                                >
                                    <Heart size={12} className={clsx(inWishlist && "fill-orange-500 text-orange-500")} />
                                </button>
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
                        </div>
 
                        <div className="flex-1 px-4 sm:px-5 flex flex-col justify-between py-4 sm:py-5 gap-4">
                            {/* Dimensions Grid */}
                            <div className="space-y-1.5">
                                <h4 className="text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest ml-0.5">Dimensões</h4>
                                <div className="grid grid-cols-3 gap-1.5">
                                    <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 p-1.5 sm:p-2 rounded-xl">
                                        <div className="w-5.5 h-5.5 bg-orange-500/10 border border-orange-500/20 rounded-md flex items-center justify-center text-orange-400 flex-shrink-0">
                                            <ArrowUpDown size={10} className="stroke-[2.5]" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] sm:text-[9px] text-zinc-400 font-extrabold uppercase tracking-tight leading-none mb-0.5 truncate">Altura</span>
                                            <span className="text-xs sm:text-sm font-black text-white leading-none">{figure.altura_cm || '-'}<small className="text-[9px] sm:text-[10px] text-zinc-400 font-bold ml-0.5">cm</small></span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 p-1.5 sm:p-2 rounded-xl">
                                        <div className="w-5.5 h-5.5 bg-orange-500/10 border border-orange-500/20 rounded-md flex items-center justify-center text-orange-400 flex-shrink-0">
                                            <ArrowLeftRight size={10} className="stroke-[2.5]" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] sm:text-[9px] text-zinc-400 font-extrabold uppercase tracking-tight leading-none mb-0.5 truncate">Largura</span>
                                            <span className="text-xs sm:text-sm font-black text-white leading-none">{figure.largura_cm || '-'}<small className="text-[9px] sm:text-[10px] text-zinc-400 font-bold ml-0.5">cm</small></span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-white/10 p-1.5 sm:p-2 rounded-xl">
                                        <div className="w-5.5 h-5.5 bg-orange-500/10 border border-orange-500/20 rounded-md flex items-center justify-center text-orange-400 flex-shrink-0">
                                            <Box size={10} className="stroke-[2.5]" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] sm:text-[9px] text-zinc-400 font-extrabold uppercase tracking-tight leading-none mb-0.5 truncate">Profund.</span>
                                            <span className="text-xs sm:text-sm font-black text-white leading-none">{figure.profundidade_cm || '-'}<small className="text-[9px] sm:text-[10px] text-zinc-400 font-bold ml-0.5">cm</small></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Options */}
                            <div className="space-y-2 flex-1 flex flex-col justify-center">
                                <h4 className="text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-widest ml-0.5">Opções de Pintura</h4>
                                
                                {figure.precos ? (
                                    <div className="space-y-2.5">
                                        {/* Sem Pintura */}
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/10 hover:border-orange-500/20 transition-all">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                                                    <Paintbrush size={14} className="stroke-[2.5]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tight">Sem Pintura</div>
                                                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider leading-none truncate mt-0.5">Impresso, Limpo & Com Primer</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs sm:text-sm font-black text-white leading-none">{formatPrice(figure.precos.estilizado)}</div>
                                                <div className="text-[9px] font-extrabold text-emerald-400 tracking-tight mt-1">PIX: {formatPrice(figure.precos.pix_estilizado)}</div>
                                            </div>
                                        </div>

                                        {/* Colorido */}
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-orange-500/30 hover:border-orange-500/50 transition-all relative shadow-[0_0_20px_rgba(249,115,22,0.06)]">
                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-black border border-[#09090b] shadow-md z-30">
                                                <Check size={9} className="stroke-[4]" />
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                                                    <Palette size={14} className="stroke-[2.5]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tight">Colorido</div>
                                                    <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider leading-none truncate mt-0.5">Pintura Premium</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs sm:text-sm font-black text-white leading-none">{formatPrice(figure.precos.colorido)}</div>
                                                <div className="text-[9px] font-extrabold text-emerald-400 tracking-tight mt-1">PIX: {formatPrice(figure.precos.pix_colorido)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-zinc-950/60 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-[9px] uppercase font-black tracking-widest">
                                        Preços Sob Consulta
                                    </div>
                                )}
                            </div>

                            {/* CTA Action Button */}
                            <div className="w-full mt-auto pt-1">
                                <div className="w-full flex items-center justify-center bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 sm:py-4 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/15 hover:from-orange-400 hover:to-amber-400 active:scale-98 transition-all">
                                    <span>{figure.is_merchant ? 'Detalhes' : 'Falar com o Ateliê'}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
});
FigureCard.displayName = 'FigureCard';
