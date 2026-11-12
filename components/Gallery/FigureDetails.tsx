'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, ExternalLink, Sparkles, Instagram, Clock, Truck, ShieldCheck,
    Share2, Paintbrush, Palette, Crown, CheckCircle2, X, HelpCircle, Info,
    Maximize2, ArrowLeft, Tag, MessageCircle,
    ChevronRight, ChevronLeft, Heart, Zap
} from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';

import { ImageMagnifier } from './ImageMagnifier';
import { getFigureTier, getTierBadgeStyle } from '@/lib/pricing';
import { IdleOfferModal } from './IdleOfferModal';

interface FigureDetailsProps {
    figure: FiguraDTO;
    crossSell?: {
        id: number;
        nome: string;
        imagem_url: string;
        slug: string;
        is_campanha: boolean;
    } | null;
}

export function FigureDetails({ figure, crossSell }: FigureDetailsProps) {
    const router = useRouter();
    const { items, addToCart, removeFromCart, updateFinish, isInCart, setIsCartOpen } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const inWishlist = isInWishlist(figure.id);
    // Verificação de campanha super agressiva (Lê da raiz, do objeto precos e por assinatura de valor)
    const isCampanha = !!(
        figure.is_campanha_active ||
        (figure.preco_fixo_campanha && figure.preco_fixo_campanha > 0)
    );

    const cartItem = items.find(i => i.id === figure.id);
    const [selectedFinishOverride, setSelectedFinishOverride] = useState<'estilizado' | 'colorido' | 'premium' | null>(null);
    const selectedFinish = selectedFinishOverride || cartItem?.finish || 'colorido';

    const [showInfo, setShowInfo] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);

    // Reset override when figure changes
    useEffect(() => {
        setSelectedFinishOverride(null);
    }, [figure.id, isCampanha]);

    useEffect(() => {
        // Beacon Analytics - Captura Origem, Dispositivo e Geolocalização
        const fireBeacon = async () => {
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

                const urlParams = new URLSearchParams(window.location.search);
                const source = urlParams.get('ref') || 'direto';
                const isApp = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

                await fetch('/api/analytics/hit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        figureId: figure.id,
                        source,
                        platform: isApp ? 'pwa' : 'web'
                    }),
                    keepalive: true
                });
            } catch (err) {
                // Silently fail
            }
        };

        fireBeacon();
    }, [figure.id]);

    const formatPrice = (val?: number) => {
        if (!val) return 'Sob consulta';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/figura/${figure.id}` : '';
    const shareText = `Confira essa figura na Franga Toys: ${figure.nome}`;

    const shareWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        window.open(url, '_blank');
    };

    const shareLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copiado!');
        } catch (err) {
            toast.error('Erro ao copiar link');
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: figure.nome,
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                // Silently fail
            }
        } else {
            shareWhatsApp();
        }
    };

    const finishOptions = [
        {
            id: 'estilizado',
            label: 'Sem Pintura',
            icon: Paintbrush,
            description: 'Impresso, Limpo & com Primer',
            color: 'text-zinc-400',
            bg: 'bg-zinc-400/10',
            border: 'border-zinc-400/20',
            price: figure.precos?.estilizado,
            pixPrice: figure.precos?.pix_estilizado,
            originalPrice: figure.precos?.original_estilizado,
            originalPixPrice: figure.precos?.original_pix_estilizado,
        },
        {
            id: 'colorido',
            label: 'Colorido',
            icon: Palette,
            description: 'Pintura Premium',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            price: figure.precos?.colorido,
            pixPrice: figure.precos?.pix_colorido,
            originalPrice: figure.precos?.original_colorido,
            originalPixPrice: figure.precos?.original_pix_colorido,
        },
    ] as const;

    // Coleta todas as fotos disponíveis (capa, hover e extras)
    const galleryImages = Array.from(
        new Set([figure.imagem_url, figure.imagem_secundaria, ...(figure.fotos_extras || [])].filter(Boolean))
    ) as string[];

    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Reseta foto ativa ao trocar de figura
    useEffect(() => {
        setActiveImageIndex(0);
    }, [figure.id]);

    // Suporte a teclado (Escape e Setas) e trava de scroll no Zen Mode
    useEffect(() => {
        if (!isZenMode) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsZenMode(false);
            } else if (e.key === 'ArrowLeft' && galleryImages.length > 1) {
                setActiveImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
            } else if (e.key === 'ArrowRight' && galleryImages.length > 1) {
                setActiveImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isZenMode, galleryImages.length]);

    const currentImage = galleryImages[activeImageIndex] || figure.imagem_url || '';
    const currentOptimizedUrl = getOptimizedImageUrl(currentImage);

    const isOutros = Boolean(
        figure.categoria?.toLowerCase() === 'outros' ||
        figure.serie?.toLowerCase() === 'outros' ||
        figure.studio?.toLowerCase() === 'outros' ||
        figure.studio?.toLowerCase() === 'custom'
    );

    const figurePrice = isOutros ? 0 : (figure.precos?.colorido || figure.precos?.estilizado || 0);
    const tier = !isOutros && figure.precos?.colorido ? getFigureTier(figure.precos.colorido) : null;
    const tierStyle = tier ? getTierBadgeStyle(tier) : null;

    const activeFinishOption = finishOptions.find(f => f.id === selectedFinish) || finishOptions[1];
    const activePrice = isOutros ? 0 : (activeFinishOption?.price || figurePrice || figure.preco || 0);
    const activePixPrice = isOutros ? undefined : activeFinishOption?.pixPrice;

    return (
        <div className="relative flex flex-col items-center justify-center min-h-full w-full max-w-6xl mx-auto p-4 md:p-4">

            {/* Zen Mode Overlay */}
            <AnimatePresence>
                {isZenMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
                        onClick={() => setIsZenMode(false)}
                    >
                        <div className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors z-20">
                            <X size={40} strokeWidth={1} />
                        </div>

                        {/* Setas de navegação no Zen Mode */}
                        {galleryImages.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
                                    }}
                                    className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-orange-500 text-white flex items-center justify-center backdrop-blur border border-white/20 transition-all cursor-pointer"
                                    title="Foto anterior"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                                    }}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-orange-500 text-white flex items-center justify-center backdrop-blur border border-white/20 transition-all cursor-pointer"
                                    title="Próxima foto"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </>
                        )}

                        <motion.div
                            key={currentImage}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative w-full h-full"
                        >
                            <Image
                                loader={imageKitLoader}
                                src={(currentImage || '').split('?')[0]}
                                alt={figure.nome}
                                fill
                                className="object-contain"
                                sizes="100vw"
                                priority
                            />
                        </motion.div>

                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-20 flex flex-col items-center gap-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest drop-shadow-2xl">{figure.nome}</h2>
                            {galleryImages.length > 1 && (
                                <div className="flex items-center gap-2 mt-1">
                                    {galleryImages.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveImageIndex(i);
                                            }}
                                            className={clsx(
                                                "w-2.5 h-2.5 rounded-full transition-all cursor-pointer",
                                                i === activeImageIndex ? "bg-orange-500 w-6" : "bg-white/40 hover:bg-white"
                                            )}
                                        />
                                    ))}
                                </div>
                            )}
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.5em]">Clique para sair</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] w-full gap-5 lg:gap-x-8 lg:gap-y-4 items-start relative z-20">

                {/* Title & Metadata Header (Top on Mobile, Right Column Row 1 on Desktop) */}
                <div className="w-full order-1 lg:col-start-2 lg:row-start-1 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-xs sm:text-sm font-black text-blue-500 uppercase tracking-[0.2em]">{figure.studio || 'Studio Indiferente'}</h3>
                        {figure.codigo && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-500 font-black px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">
                                #{figure.codigo}
                            </span>
                        )}
                        {tierStyle && (
                            <span className={clsx(
                                "text-[10px] font-black px-2 py-0.5 rounded border shadow-md uppercase tracking-widest",
                                tierStyle.bg, tierStyle.text, tierStyle.border
                            )}>
                                {tierStyle.label}
                            </span>
                        )}
                        {isCampanha && (
                            <span className="text-[10px] bg-purple-600 text-white font-black px-2.5 py-0.5 rounded-full border border-purple-400 shadow-lg shadow-purple-600/20 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={11} className="fill-white" /> Oferta
                            </span>
                        )}
                        {figure.tem_pintura_real && (
                            <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-full border border-blue-400 shadow-lg shadow-blue-600/20 uppercase tracking-[0.2em] flex items-center gap-1">
                                <Instagram size={10} className="fill-white" /> Ver Fotos
                            </span>
                        )}
                        {(figure.is_bundle || !!figure.precos?.desconto_bundle_pct) && (
                            <span className="text-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-3 py-1 rounded-full border border-purple-400/40 shadow-lg shadow-purple-600/30 uppercase tracking-[0.2em] flex items-center gap-1">
                                <Sparkles size={12} className="fill-white" /> COMBO {figure.precos?.desconto_bundle_pct || figure.desconto_bundle_pct || 20}% OFF
                            </span>
                        )}
                        {figure.pronta_entrega && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-3 py-1 rounded-full border border-amber-500/40 shadow-lg shadow-amber-500/20 uppercase tracking-[0.2em] flex items-center gap-1.5 animate-pulse">
                                <Zap size={12} className="fill-amber-400 text-amber-400" />
                                Pronta Entrega {figure.estoque_pronta_entrega && figure.estoque_pronta_entrega > 0 ? `(${figure.estoque_pronta_entrega} un)` : ''}
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter leading-[0.95]">{figure.nome}</h2>

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-1 rounded-full border border-white/5">
                            <span className="text-zinc-600">H</span> {figure.altura_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-1 rounded-full border border-white/5">
                            <span className="text-zinc-600">W</span> {figure.largura_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-1 rounded-full border border-white/5">
                            <span className="text-zinc-600">D</span> {figure.profundidade_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                        </div>
                    </div>

                    {figure.pronta_entrega && (
                        <div className="mt-4 flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 text-amber-300">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-sm">
                                <Zap size={18} className="fill-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2 flex-wrap text-white">
                                    <span>Envio Imediato em até 24h</span>
                                    {figure.estoque_pronta_entrega && figure.estoque_pronta_entrega > 0 && (
                                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                                            {figure.estoque_pronta_entrega} {figure.estoque_pronta_entrega === 1 ? 'unidade restante' : 'unidades restantes'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Item pronto em estoque! Despachamos em até 24h úteis para todo o Brasil.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Image Container & Gallery (Middle on Mobile, Left Column Row 1-2 on Desktop) */}
                <div className="flex flex-col gap-3.5 w-full order-2 lg:col-start-1 lg:row-start-1 lg:row-span-2">
                    <div
                        className="relative w-full aspect-square flex items-center justify-center p-3 sm:p-4 bg-zinc-900/30 rounded-3xl overflow-hidden shadow-inner transition-all duration-500 hover:bg-zinc-900/50 group cursor-zoom-in border border-zinc-800/50"
                        onClick={() => setIsZenMode(true)}
                    >
                        {/* Pro Magnifier / Image */}
                        <ImageMagnifier
                            key={currentImage}
                            src={currentImage}
                            alt={`${figure.nome} - Foto ${activeImageIndex + 1}`}
                        />

                        {/* Zoom Hint */}
                        <div className="absolute top-3.5 right-3.5 bg-black/70 backdrop-blur-md p-2 rounded-xl border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Maximize2 size={16} className="text-zinc-300" />
                        </div>

                        {/* Setas de navegação rápida sobre a imagem */}
                        {galleryImages.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
                                    }}
                                    className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/75 backdrop-blur border border-white/10 text-white flex items-center justify-center opacity-70 group-hover:opacity-100 hover:opacity-100 transition-all hover:bg-orange-500 hover:border-orange-500 shadow-xl cursor-pointer"
                                    title="Foto anterior"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                                    }}
                                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/75 backdrop-blur border border-white/10 text-white flex items-center justify-center opacity-70 group-hover:opacity-100 hover:opacity-100 transition-all hover:bg-orange-500 hover:border-orange-500 shadow-xl cursor-pointer"
                                    title="Próxima foto"
                                >
                                    <ChevronRight size={18} />
                                </button>

                                {/* Badge de Fotos (ex: 1 / 3) */}
                                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-black tracking-widest text-zinc-300 pointer-events-none">
                                    {activeImageIndex + 1} / {galleryImages.length}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Fileira de Miniaturas (Thumbnails) para Mobile e Desktop */}
                    {galleryImages.length > 1 && (
                        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto p-1 scrollbar-none">
                            {galleryImages.map((img, idx) => {
                                const isActive = idx === activeImageIndex;
                                const thumbUrl = getOptimizedImageUrl(img);

                                return (
                                    <button
                                        key={img + idx}
                                        type="button"
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={clsx(
                                            "relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 transition-all duration-200 cursor-pointer p-1 bg-zinc-950/80 border",
                                            isActive
                                                ? "border-orange-500 ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/20 scale-105"
                                                : "border-zinc-800/80 opacity-60 hover:opacity-100 hover:border-zinc-600"
                                        )}
                                        title={`Ver foto ${idx + 1}`}
                                    >
                                        <Image
                                            loader={imageKitLoader}
                                            src={thumbUrl}
                                            alt={`${figure.nome} thumb ${idx + 1}`}
                                            fill
                                            className="object-contain p-1"
                                            sizes="80px"
                                        />
                                        {idx === 0 && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-wider bg-black/90 px-1 py-0.2 rounded text-zinc-300 border border-white/10">
                                                Capa
                                            </span>
                                        )}
                                        {idx === 1 && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-wider bg-orange-950/90 px-1 py-0.2 rounded text-orange-400 border border-orange-500/30">
                                                Hover
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info & Pricing Panel (Bottom on Mobile, Right Column Row 2 on Desktop) */}
                <div className="w-full order-3 lg:col-start-2 lg:row-start-2 flex flex-col gap-5 pt-0">
                    {/* Finish Selector - Square Cards Layout */}
                    <div className="space-y-2 relative">
                        <div className="flex items-center justify-between ml-1 mb-2">
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Escolha seu acabamento</h4>
                            <button
                                onClick={() => setShowInfo(!showInfo)}
                                className="text-zinc-600 hover:text-blue-500 transition-colors p-1"
                            >
                                <HelpCircle size={14} />
                            </button>
                        </div>

                        {/* Info Overlay */}
                        <AnimatePresence>
                            {showInfo && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute inset-x-0 bottom-full mb-4 z-[60] bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-500 to-amber-500" />
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={12} className="text-blue-500" />
                                            Guia de Pintura
                                        </h5>
                                        <button onClick={() => setShowInfo(false)} className="text-zinc-500 hover:text-white">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <div className="w-1 h-auto bg-zinc-500 rounded-full shrink-0" />
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-0.5">Sem Pintura</p>
                                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                                    A peça é impressa na resina{' '}
                                                    <a
                                                        href="https://3dcure.com.br/produto/resina-3d-cure-acqua-art"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-orange-400 hover:underline font-bold inline-flex items-center gap-0.5"
                                                    >
                                                        Acqua Art da 3dCure
                                                        <ExternalLink size={10} className="inline ml-0.5" />
                                                    </a>
                                                    , passa por limpeza ultra-sônica, cura UV interna e externa e aplicação de primer. É enviada montada ou em partes de encaixe, pronta para pintura.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-1 h-auto bg-amber-500 rounded-full shrink-0" />
                                            <div>
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider mb-0.5">Colorido</p>
                                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">Pintura Premium. Totalmente pintada à mão, com sombreamento completo de estúdio e proteção em verniz.</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-2 gap-2.5">
                            {finishOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedFinishOverride(opt.id);
                                        if (cartItem && cartItem.finish !== opt.id) {
                                            updateFinish(figure.id, opt.id);
                                            toast.success(`Acabamento alterado para ${opt.label} no carrinho!`);
                                        }
                                    }}
                                    className={clsx(
                                        "relative flex flex-col items-center justify-between py-3.5 px-3 sm:py-4 sm:px-4 rounded-2xl border-2 transition-all duration-300 text-center group cursor-pointer",
                                        selectedFinish === opt.id
                                            ? `${opt.border} bg-zinc-900/90 ring-1 ring-white/20 scale-[1.01] shadow-2xl`
                                            : "border-zinc-800/60 bg-zinc-900/40 opacity-60 hover:opacity-100 hover:bg-zinc-900/60"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-xl flex items-center justify-center transition-transform shrink-0",
                                            selectedFinish === opt.id ? "scale-105" : "group-hover:scale-105",
                                            opt.bg,
                                            opt.color
                                        )}>
                                            <opt.icon size={16} />
                                        </div>
                                        <div className="text-left">
                                            <span className={clsx(
                                                "text-[10px] font-black uppercase tracking-wider block leading-tight",
                                                selectedFinish === opt.id ? "text-white" : "text-zinc-400"
                                            )}>
                                                {opt.label}
                                            </span>
                                            <span className="text-[8px] font-bold text-zinc-500 block leading-tight">
                                                {opt.description}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="w-full pt-2 mt-1 border-t border-white/5 flex flex-col items-center">
                                        {!isOutros && opt.price ? (
                                            <>
                                                {opt.originalPrice && opt.originalPrice > opt.price && (
                                                    <span className="text-[9px] text-zinc-500 line-through font-mono leading-none mb-0.5">
                                                        {formatPrice(opt.originalPrice)}
                                                    </span>
                                                )}

                                                <span className={clsx(
                                                    "text-xs sm:text-sm font-black tracking-tight",
                                                    selectedFinish === opt.id ? opt.color : "text-zinc-400"
                                                )}>
                                                    {formatPrice(opt.price)}
                                                </span>

                                                <span className={clsx(
                                                    "text-[10px] font-extrabold tracking-tight mt-0.5",
                                                    selectedFinish === opt.id ? "text-emerald-400" : "text-emerald-500/60"
                                                )}>
                                                    PIX: {formatPrice(opt.pixPrice)}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className={clsx(
                                                    "text-xs sm:text-sm font-black tracking-wider uppercase",
                                                    selectedFinish === opt.id ? "text-orange-400" : "text-zinc-400"
                                                )}>
                                                    A combinar
                                                </span>
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">
                                                    Sob orçamento
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {selectedFinish === opt.id && (
                                        <div className="absolute -top-2 -right-2">
                                            <CheckCircle2 size={22} className="fill-blue-500 text-black border-none drop-shadow-lg" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 mt-4 relative w-full">
                        {figure.is_merchant ? (
                            <button
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 px-4 sm:px-8 py-4 sm:py-5 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all duration-300 shadow-xl active:scale-[0.98] relative z-10",
                                    isInCart(figure.id)
                                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                                        : "bg-white text-black hover:bg-blue-500 hover:text-white"
                                )}
                                onClick={() => isInCart(figure.id) ? setIsCartOpen(true) : addToCart(figure, selectedFinish)}
                            >
                                {isInCart(figure.id) ? "No Carrinho ✓" : (
                                    <>
                                        <ShoppingCart size={17} />
                                        <span>Adicionar ao Carrinho</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <a
                                href={`https://api.whatsapp.com/send?phone=${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}&text=${encodeURIComponent(`Olá! Tenho interesse na figura ${figure.nome} (${selectedFinish}). Poderia me passar mais informações?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-8 py-4 sm:py-5 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all duration-300 shadow-xl active:scale-[0.98] relative z-10 bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                                <MessageCircle size={17} />
                                <span>Falar com o Ateliê</span>
                            </a>
                        )}

                        {figure.tem_pintura_real && (
                            <a
                                href="https://www.instagram.com/frangatoys/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-4 sm:p-5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white rounded-2xl shadow-lg hover:opacity-90 transition-opacity active:scale-[0.98] shrink-0"
                                title="Ver Fotos no Instagram"
                            >
                                <Instagram size={20} />
                            </a>
                        )}

                        <button
                            onClick={handleShare}
                            className="p-4 sm:p-5 bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white rounded-2xl transition-all duration-300 group relative z-10 shrink-0"
                            title="Compartilhar no WhatsApp"
                        >
                            <Share2 size={20} className="group-hover:rotate-12 transition-transform" />
                        </button>

                        <button
                            type="button"
                            onClick={() => toggleWishlist({
                                id: figure.id,
                                nome: figure.nome,
                                imagem_url: figure.imagem_url,
                                codigo: figure.codigo,
                                preco: isOutros ? 0 : (figure.precos?.colorido || figure.preco || 0),
                                precos: isOutros ? null : figure.precos,
                                serie: figure.serie,
                                studio: figure.studio,
                                slug: figure.slug,
                                is_campanha: !isOutros && !!isCampanha,
                                is_merchant: isOutros ? false : figure.is_merchant
                            })}
                            className={clsx(
                                "p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative z-10 cursor-pointer active:scale-[0.95] shrink-0",
                                inWishlist
                                    ? "bg-orange-500/20 border-orange-500/50 text-orange-500 hover:bg-orange-500/30 shadow-lg shadow-orange-500/10"
                                    : "bg-zinc-900 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white"
                            )}
                            title={inWishlist ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                            aria-label={inWishlist ? "Remover dos Favoritos" : "Salvar nos Favoritos"}
                        >
                            <Heart size={20} className={clsx("transition-transform duration-300", inWishlist && "fill-orange-500 scale-110")} />
                        </button>
                    </div>

                    {/* FAQ & Guia de Cuidados Micro-Link */}
                    <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        <HelpCircle size={12} className="text-amber-500" />
                        <span>Dúvidas sobre prazo, pintura ou limpeza?</span>
                        <Link href="/faq" target="_blank" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                            Ver Guia & FAQ
                        </Link>
                    </div>

                    {/* Disclaimer Protetivo Fanart */}
                    <p className="text-[10px] text-zinc-500 text-center leading-relaxed pt-2 border-t border-white/5">
                        Escultura artesanal sob encomenda (tributo fanart de artistas independentes). Não possuímos vínculo ou filiação com detentoras de marcas.
                    </p>
                </div>

                {/* Cross-Sell Section (Full width below both columns so it doesn't unbalance right column height) */}
                {crossSell && (
                    <div className="w-full order-4 lg:col-span-2 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-orange-500" />
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Compre Junto</h4>
                        </div>
                        <div
                            onClick={() => router.push(`/figura/${crossSell.id}?ref=cross_sell`)}
                            className="group flex items-center gap-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 hover:border-orange-500/30 p-3 rounded-2xl cursor-pointer transition-all duration-300"
                        >
                            <div className="relative w-16 h-16 bg-black rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                                <Image
                                    loader={imageKitLoader}
                                    src={getOptimizedImageUrl(crossSell.imagem_url)}
                                    alt={crossSell.nome}
                                    fill
                                    className="object-contain p-1 group-hover:scale-110 transition-transform duration-500"
                                    sizes="64px"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                {crossSell.is_campanha && (
                                    <span className="inline-block text-[8px] bg-purple-600 text-white font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest mb-1 shadow-lg shadow-purple-600/20">
                                        Em Oferta
                                    </span>
                                )}
                                <h5 className="text-sm font-black text-white truncate group-hover:text-orange-500 transition-colors">
                                    {crossSell.nome}
                                </h5>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                    Ver Detalhes <ChevronRight size={10} className="inline -mt-0.5" />
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Mobile Purchase Bar (Always within thumb reach) */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_35px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 truncate">
                        {selectedFinish === 'estilizado' ? 'Sem Pintura' : 'Colorido'}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        {isOutros || (!activePixPrice && !activePrice) ? (
                            <span className="text-sm font-black text-orange-400 uppercase tracking-wider">
                                A combinar
                            </span>
                        ) : activePixPrice ? (
                            <>
                                <span className="text-base font-black text-emerald-400 tracking-tight">
                                    {formatPrice(activePixPrice)}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-500/80 uppercase">no PIX</span>
                            </>
                        ) : (
                            <span className="text-base font-black text-white tracking-tight">
                                {formatPrice(activePrice)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {figure.is_merchant ? (
                        <button
                            type="button"
                            onClick={() => isInCart(figure.id) ? setIsCartOpen(true) : addToCart(figure, selectedFinish)}
                            className={clsx(
                                "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer",
                                isInCart(figure.id)
                                    ? "bg-emerald-500 text-black shadow-emerald-500/20"
                                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25"
                            )}
                        >
                            <ShoppingCart size={16} />
                            <span>{isInCart(figure.id) ? "No Carrinho ✓" : "Adicionar"}</span>
                        </button>
                    ) : (
                        <a
                            href={`https://api.whatsapp.com/send?phone=${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}&text=${encodeURIComponent(`Olá! Tenho interesse na figura ${figure.nome} (${selectedFinish}). Poderia me passar mais informações?`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <MessageCircle size={16} />
                            <span>Falar Ateliê</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Modal de Oferta Especial (Exit-Intent / Idle com trava de 30 dias) */}
            {!isOutros && figure.is_merchant && (
                <IdleOfferModal
                    figure={figure}
                    currentFinish={selectedFinish}
                    onAcceptOffer={() => {
                        addToCart(figure, selectedFinish);
                        setIsCartOpen(true);
                    }}
                />
            )}
        </div>
    );
}
