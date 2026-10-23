'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { User, LogOut, Heart, Truck, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserSessionBadge({ className = '' }: { className?: string }) {
    const { 
        savedNome, 
        savedPhone, 
        wishlistCount, 
        setIsWishlistOpen, 
        openAuthModal, 
        logoutClient 
    } = useWishlist();

    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (!mounted) {
        return (
            <div className={`h-9 w-24 rounded-full bg-zinc-900/40 animate-pulse ${className}`} />
        );
    }

    const primeiroNome = savedNome ? savedNome.trim().split(' ')[0] : null;

    if (!savedNome && !savedPhone) {
        return (
            <button
                onClick={openAuthModal}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-orange-500/40 shadow-sm cursor-pointer active:scale-95 group ${className}`}
                title="Identifique-se para salvar seus favoritos e acompanhar pedidos"
            >
                <div className="w-5 h-5 rounded-full bg-zinc-800 group-hover:bg-orange-500/20 flex items-center justify-center text-zinc-400 group-hover:text-orange-400 transition-colors">
                    <User size={12} />
                </div>
                <span className="hidden sm:inline">Entrar</span>
                <span className="sm:hidden">Entrar</span>
            </button>
        );
    }

    return (
        <div ref={menuRef} className={`relative inline-block ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                    isOpen 
                        ? 'bg-zinc-900 border-orange-500/50 text-white shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                        : 'bg-zinc-950/80 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                }`}
                title={`Conectado como ${savedNome || savedPhone}`}
            >
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-extrabold text-zinc-100 max-w-[110px] truncate">
                    Oi, {primeiroNome || 'Colecionador'}
                </span>
                <ChevronDown size={13} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-400' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-2 z-50 overflow-hidden"
                    >
                        {/* Header do Usuário */}
                        <div className="px-3 py-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl mb-1.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-black text-xs shrink-0">
                                    {(savedNome ? savedNome[0] : 'U').toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-white truncate">
                                        {savedNome || 'Colecionador'}
                                    </p>
                                    {savedPhone && (
                                        <p className="text-[10px] text-zinc-400 font-mono">
                                            {savedPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="space-y-1">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsWishlistOpen(true);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Heart size={14} className="text-pink-400 group-hover:scale-110 transition-transform" />
                                    <span>Meus Favoritos</span>
                                </div>
                                {wishlistCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                        {wishlistCount}
                                    </span>
                                )}
                            </button>

                            <Link
                                href={savedPhone ? `/rastreio/${savedPhone}` : '/rastreio'}
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Truck size={14} className="text-orange-400 group-hover:scale-110 transition-transform" />
                                    <span>Minhas Encomendas</span>
                                </div>
                                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">
                                    Rastreio
                                </span>
                            </Link>

                            <div className="h-px bg-zinc-800/80 my-1" />

                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    logoutClient();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                                <LogOut size={14} />
                                <span>Sair / Trocar Conta</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
