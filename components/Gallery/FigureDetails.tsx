'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiguraDTO } from '@/lib/dto';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useCart } from '@/context/CartContext';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Share2, Paintbrush, Palette, Crown, CheckCircle2, X, HelpCircle, Info, Sparkles, Maximize2, ArrowLeft, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { ImageMagnifier } from './ImageMagnifier';

interface FigureDetailsProps {
    figure: FiguraDTO;
}

export function FigureDetails({ figure }: FigureDetailsProps) {
    const router = useRouter();
    const { addToCart, removeFromCart, isInCart, setIsCartOpen } = useCart();
    // Verificação de campanha super agressiva (Lê da raiz, do objeto precos e por assinatura de valor)
    const isCampanha = !!(
        figure.is_campanha_active || 
        (figure.preco_fixo_campanha && figure.preco_fixo_campanha > 0)
    );

    const [selectedFinishOverride, setSelectedFinishOverride] = useState<'estilizado' | 'colorido' | 'premium' | null>(null);
    const selectedFinish = selectedFinishOverride || (isCampanha ? 'estilizado' : 'colorido');
    
    const [showInfo, setShowInfo] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);

    // Reset override when figure changes
    useEffect(() => {
        setSelectedFinishOverride(null);
        console.log('Figura carregada:', figure.id, 'Campanha:', isCampanha);
    }, [figure.id, isCampanha]);

    useEffect(() => {
        // Beacon Analytics - Captura Origem, Dispositivo e Geolocalização
        const fireBeacon = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const source = urlParams.get('ref') || 'direto';
                const isApp = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
                
                await fetch('/api/analytics/hit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        figureId: figure.id,
                        source: source,
                        platform: isApp ? 'app' : 'site'
                    }),
                    keepalive: true
                });
            } catch (e) {
                // Silently ignore beacon errors
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
        { id: 'estilizado', label: 'Estilizado', icon: Paintbrush, description: 'OSL / Monocromático', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', price: figure.precos?.estilizado, pixPrice: figure.precos?.pix_estilizado },
        { id: 'colorido', label: 'Colorido', icon: Palette, description: 'Fidelidade Total', color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20', price: figure.precos?.colorido, pixPrice: figure.precos?.pix_colorido },
        { id: 'premium', label: '2D / Premium', icon: Crown, description: 'Estilo Cel-Shaded', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', price: figure.precos?.premium, pixPrice: figure.precos?.pix_premium },
    ] as const;

    const imageUrl = getOptimizedImageUrl(figure.imagem_url);

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
                        <div className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
                            <X size={40} strokeWidth={1} />
                        </div>
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full h-full"
                        >
                            <Image
                                loader={imageKitLoader}
                                src={(figure.imagem_url || '').split('?')[0]}
                                alt={figure.nome}
                                fill
                                className="object-contain"
                                sizes="100vw"
                                priority
                            />
                        </motion.div>
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest drop-shadow-2xl">{figure.nome}</h2>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.5em] mt-2">Arraste para explorar • Clique para sair</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Main Image (Interactive Area) */}
            <div className="lg:hidden absolute inset-x-0 top-0 h-[60vh] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none" />
                <Image
                    loader={imageKitLoader}
                    src={imageUrl}
                    alt={figure.nome}
                    fill
                    className="object-contain p-6 -z-10"
                    sizes="100vw"
                    priority
                />
                {/* Clickable Area for Zen Mode */}
                <div 
                    className="absolute inset-0 z-30 cursor-zoom-in active:bg-white/5 transition-colors"
                    onClick={() => setIsZenMode(true)}
                >
                    <div className="absolute top-10 right-10 bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/20 shadow-2xl">
                        <Maximize2 size={24} className="text-white" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row w-full gap-8 items-start lg:items-center relative z-20">

                {/* Main Image Container (Desktop Only) */}
                <div
                    className="hidden lg:flex relative w-full lg:w-1/2 aspect-square items-center justify-center p-4 bg-zinc-900/20 rounded-3xl overflow-hidden shadow-inner order-1 transition-all duration-500 hover:bg-zinc-900/40 group cursor-zoom-in"
                    onClick={() => setIsZenMode(true)}
                >
                    {/* Desktop: Pro Magnifier */}
                    <ImageMagnifier
                        src={figure.imagem_url || ''}
                        alt={figure.nome}
                        onClick={() => {
                            // Link inside FigureCard prevented propagation but here we want to trigger ZenMode
                        }}
                    />

                    {/* Mobile: Standard Display (Since magnifier is hidden lg:block) */}
                    <div className="lg:hidden w-full h-full relative">
                        <Image
                            loader={imageKitLoader}
                            src={imageUrl}
                            alt={figure.nome}
                            fill
                            className="object-contain p-4 transition-transform duration-700 active:scale-105"
                            sizes="100vw"
                            priority
                        />
                    </div>

                    {/* Zoom Hint */}
                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 size={16} className="text-zinc-400" />
                    </div>
                </div>

                {/* Info & Pricing Panel */}
                <div className="w-full lg:w-1/2 flex flex-col gap-6 order-2 pt-[35vh] sm:pt-[45vh] lg:pt-0">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-sm font-black text-blue-500 uppercase tracking-[0.3em]">{figure.studio || 'Studio Indiferente'}</h3>
                            {figure.codigo && (
                                <span className="text-[10px] bg-zinc-800 text-zinc-500 font-black px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">
                                    #{figure.codigo}
                                </span>
                            )}
                            {isCampanha && (
                                <span className="text-[10px] bg-purple-600 text-white font-black px-3 py-1 rounded-full border border-purple-400 shadow-lg shadow-purple-600/20 uppercase tracking-[0.2em] flex items-center gap-1 animate-pulse">
                                    <Sparkles size={12} className="fill-white" /> Oferta Especial
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-[0.9]">{figure.nome}</h2>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">
                            <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1.5 rounded-full border border-white/5">
                                <span className="text-zinc-600">H</span> {figure.altura_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                            </div>
                            <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1.5 rounded-full border border-white/5">
                                <span className="text-zinc-600">W</span> {figure.largura_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                            </div>
                            <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1.5 rounded-full border border-white/5">
                                <span className="text-zinc-600">D</span> {figure.profundidade_cm || '-'}<small className="text-[8px] ml-0.5 opacity-50">cm</small>
                            </div>
                        </div>
                    </div>

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
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-blue-500 to-purple-500" />
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
                                            <div className="w-1 h-auto bg-amber-500 rounded-full shrink-0" />
                                            <div>
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider mb-0.5">Estilizado</p>
                                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">Arte em contraste. Tons de cinza/prata com efeitos de luz vibrantes (OSL). Realça a escultura.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-1 h-auto bg-zinc-400 rounded-full shrink-0" />
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-200 uppercase tracking-wider mb-0.5">Colorido</p>
                                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">Fidelidade total. Pintura completa com as cores clássicas e sombreamento de estúdio.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-1 h-auto bg-purple-500 rounded-full shrink-0" />
                                            <div>
                                                <p className="text-[9px] font-black text-purple-400 uppercase tracking-wider mb-0.5">2D / Premium</p>
                                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">O ápice da arte. Estilos exclusivos como Cel-Shaded (Anime/Hades), transformando a peça em uma ilustração real.</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-3 gap-2">
                            {finishOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => !isCampanha && setSelectedFinishOverride(opt.id)}
                                    disabled={isCampanha && opt.id !== 'estilizado'}
                                    className={clsx(
                                        "relative flex flex-col items-center justify-center aspect-[1/1.1] p-2 rounded-2xl border-2 transition-all duration-300 text-center group",
                                        selectedFinish === opt.id
                                            ? `${opt.border} bg-zinc-900/80 ring-1 ring-white/20 scale-[1.02] shadow-2xl`
                                            : "border-transparent bg-zinc-900/40 opacity-50 hover:opacity-100 hover:bg-zinc-900/60",
                                        isCampanha && opt.id !== 'estilizado' && "cursor-not-allowed grayscale opacity-30"
                                    )}
                                >
                                    <div className={clsx(
                                        "mb-2 w-10 h-10 rounded-xl flex items-center justify-center transition-transform",
                                        selectedFinish === opt.id ? "scale-110" : "group-hover:scale-105",
                                        opt.bg,
                                        opt.color
                                    )}>
                                        <opt.icon size={20} />
                                    </div>

                                    <span className={clsx(
                                        "text-[9px] font-black uppercase tracking-widest block leading-tight mb-1",
                                        selectedFinish === opt.id ? "text-white" : "text-zinc-500"
                                    )}>
                                        {opt.label}
                                    </span>

                                    <span className={clsx(
                                        "text-xs font-black tracking-tight",
                                        selectedFinish === opt.id ? opt.color : "text-zinc-400"
                                    )}>
                                        {formatPrice(opt.price)}
                                    </span>

                                    <span className={clsx(
                                        "text-[9px] font-bold tracking-tight mt-0.5",
                                        selectedFinish === opt.id ? "text-emerald-500" : "text-emerald-500/50"
                                    )}>
                                        PIX: {formatPrice(opt.pixPrice)}
                                    </span>

                                    {selectedFinish === opt.id && (
                                        <div className="absolute -top-2 -right-2">
                                            <CheckCircle2 size={24} className="fill-blue-500 text-black border-none drop-shadow-lg" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 relative">
                        <button
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-3 w-full px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.3)] active:scale-[0.98] relative z-10",
                                isInCart(figure.id)
                                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                                    : "bg-white text-black hover:bg-blue-500 hover:text-white"
                            )}
                            onClick={() => isInCart(figure.id) ? setIsCartOpen(true) : addToCart(figure, selectedFinish)}
                        >
                            {isInCart(figure.id) ? "No Orçamento ✓" : (
                                <>
                                    <ExternalLink size={18} />
                                    Adicionar ao Orçamento
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleShare}
                            className="p-5 bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white rounded-2xl transition-all duration-300 group relative z-10"
                            title="Compartilhar no WhatsApp"
                        >
                            <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
                        </button>

                        {/* Close Button removed as it was redundant */}
                    </div>
                </div>
            </div>
        </div>
    );
}
