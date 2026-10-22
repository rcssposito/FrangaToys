'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ShoppingBag, ArrowRight, Check, Tag } from 'lucide-react';
import Image from 'next/image';
import imageKitLoader from '@/lib/image-loader';
import { toast } from 'sonner';

interface IdleOfferModalProps {
    figure: {
        id: number;
        nome: string;
        imagem_url?: string | null;
        preco?: number | null;
        precos?: any;
        studio?: string | null;
        serie?: string | null;
        slug?: string | null;
        codigo?: string | null;
    };
    currentFinish?: 'estilizado' | 'colorido' | 'premium';
    onAcceptOffer: (couponCode: string) => void;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const IDLE_TRIGGER_MS = 45 * 1000; // 45 segundos

export function IdleOfferModal({ figure, currentFinish = 'colorido', onAcceptOffer }: IdleOfferModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Trava Anti-Exploit: Verifica se já exibiu nos últimos 30 dias
        const lastSeen = localStorage.getItem('ft_idle_offer_last_seen');
        if (lastSeen) {
            const timeDiff = Date.now() - parseInt(lastSeen, 10);
            if (timeDiff < THIRTY_DAYS_MS) {
                return; // Bloqueado pela trava anti-exploit
            }
        }

        // Verifica se já foi dispensado na sessão atual
        if (sessionStorage.getItem('ft_idle_offer_dismissed')) {
            return;
        }

        let isDismissed = false;

        const triggerOffer = () => {
            if (isDismissed) return;
            setIsOpen(true);
            localStorage.setItem('ft_idle_offer_last_seen', Date.now().toString());
        };

        // 1. Timer de 45 segundos na página
        const timer = setTimeout(() => {
            triggerOffer();
        }, IDLE_TRIGGER_MS);

        // 2. Exit-intent (quando o cursor sai da janela pelo topo no desktop)
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0) {
                triggerOffer();
            }
        };

        // Adiciona listener de exit-intent após 15s de permanência mínima
        const exitIntentDelay = setTimeout(() => {
            document.addEventListener('mouseleave', handleMouseLeave);
        }, 15000);

        return () => {
            isDismissed = true;
            clearTimeout(timer);
            clearTimeout(exitIntentDelay);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        sessionStorage.setItem('ft_idle_offer_dismissed', 'true');
    };

    const handleAccept = () => {
        const coupon = 'RESGATE5';
        navigator.clipboard.writeText(coupon);
        setCopied(true);
        toast.success('Cupom RESGATE5 de 5% OFF copiado e aplicado!');
        setIsOpen(false);
        sessionStorage.setItem('ft_idle_offer_dismissed', 'true');
        onAcceptOffer(coupon);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                        className="absolute inset-0 bg-black/85 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden z-10"
                    >
                        {/* Glowing Background Accent */}
                        <div className="absolute -top-24 -right-24 w-60 h-60 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                            title="Fechar"
                        >
                            <X size={16} />
                        </button>

                        <div className="relative space-y-5">
                            {/* Hero Artwork "Eu Mereço" */}
                            <div className="w-full h-36 sm:h-44 relative rounded-2xl overflow-hidden bg-gradient-to-b from-orange-500/15 via-zinc-900/50 to-transparent flex items-center justify-center">
                                <Image
                                    loader={imageKitLoader}
                                    src="https://pub-ab391b8f43ea4791b533669f933ac2b5.r2.dev/Eu%20Mere%C3%A7o.png"
                                    alt="Eu Mereço - Franga Toys"
                                    fill
                                    className="object-contain p-2 drop-shadow-[0_10px_30px_rgba(249,115,22,0.35)]"
                                    sizes="(max-width: 768px) 100vw, 450px"
                                    priority
                                />
                            </div>

                            {/* Header Tag */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                    <Sparkles size={12} className="animate-spin text-orange-400" />
                                    Condição Especial para Você
                                </span>
                            </div>

                            {/* Headline */}
                            <div className="space-y-1">
                                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                                    Você merece esse colecionável!
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Gostou de <strong className="text-white">{figure.nome}</strong>? Liberamos um cupom relâmpago de <strong className="text-orange-400">5% de desconto</strong> para você garantir seu colecionável hoje.
                                </p>
                            </div>

                            {/* Mini Figure Card Preview */}
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-black border border-zinc-800 relative overflow-hidden shrink-0">
                                    {figure.imagem_url ? (
                                        <Image
                                            loader={imageKitLoader}
                                            src={figure.imagem_url}
                                            alt={figure.nome}
                                            fill
                                            className="object-contain p-1"
                                            sizes="64px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                            <ShoppingBag size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                                        {figure.studio || 'Studio Indiferente'}
                                    </p>
                                    <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                        {figure.nome}
                                    </h4>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                            {currentFinish}
                                        </span>
                                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                                            <Tag size={11} /> Cupom RESGATE5
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Coupon Callout Box */}
                            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/25 rounded-2xl p-4 flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                        Cupom de 5% Desbloqueado
                                    </span>
                                    <div className="text-lg font-black tracking-widest text-orange-400 font-mono">
                                        RESGATE5
                                    </div>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                                    Uso Único
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2.5 pt-1">
                                <button
                                    type="button"
                                    onClick={handleAccept}
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase tracking-wider py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <ShoppingBag size={16} />
                                    Quero Aproveitar 5% OFF
                                    <ArrowRight size={16} />
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    className="w-full text-zinc-500 hover:text-zinc-300 font-bold text-xs py-2 transition-colors cursor-pointer"
                                >
                                    Continuar olhando sem cupom
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
