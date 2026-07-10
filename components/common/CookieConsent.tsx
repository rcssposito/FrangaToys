'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck } from 'lucide-react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        // Check if consent already exists
        const consent = localStorage.getItem('cookie-consent');
        const gaId = process.env.NEXT_PUBLIC_GA_ID;

        if (consent === 'rejected' && gaId) {
            // Disable Google Analytics if consent was rejected
            (window as any)[`ga-disable-${gaId}`] = true;
        }

        if (!consent) {
            // Show banner after 1.5 seconds delay
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const handleReject = () => {
        localStorage.setItem('cookie-consent', 'rejected');
        const gaId = process.env.NEXT_PUBLIC_GA_ID;
        if (gaId) {
            (window as any)[`ga-disable-${gaId}`] = true;
        }
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50"
                >
                    <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 shadow-2xl shadow-black/50 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1 flex-1">
                                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 flex-wrap">
                                    Aviso de Cookies 
                                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" /> LGPD
                                    </span>
                                </h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Nós usamos cookies e tecnologias semelhantes para personalizar conteúdo, anúncios e analisar o tráfego do nosso site de acordo com a nossa política.
                                </p>
                            </div>
                            <div className="shrink-0 self-center">
                                {!imgError ? (
                                    <div className="w-20 h-20 relative flex items-center justify-center overflow-hidden rounded-2xl">
                                        <img 
                                            src="/mascot_cookie.png" 
                                            alt="Franguinha" 
                                            className="w-full h-full object-cover"
                                            onError={() => setImgError(true)}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                                        <Cookie className="w-8 h-8 animate-pulse" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 justify-end text-xs font-medium">
                            <button
                                onClick={handleReject}
                                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                            >
                                Recusar
                            </button>
                            <button
                                onClick={handleAccept}
                                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 cursor-pointer active:scale-95"
                            >
                                Aceitar Todos
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
