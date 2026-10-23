'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, CheckCircle2, X, Lock, Phone, ArrowRight } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';

export function WishlistAuthModal() {
    const { 
        isAuthModalOpen, 
        closeAuthModal, 
        savedPhone,
        savedNome,
        hasPhone,
        isBindPhoneModalOpen,
        closeBindPhoneModal,
        identifyClient,
        bindPhone,
        loginWithGoogle
    } = useWishlist();

    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    // Formatação de telefone BR (11) 99999-9999
    const formatPhone = (val: string) => {
        const digits = val.replace(/\D/g, '');
        if (digits.length <= 11) {
            return digits
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .substring(0, 15);
        }
        return val.substring(0, 15);
    };

    const isOpen = isAuthModalOpen || isBindPhoneModalOpen;
    const isBindingOnly = isBindPhoneModalOpen || (Boolean(savedNome) && !hasPhone);

    const handleClose = () => {
        closeAuthModal();
        closeBindPhoneModal();
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao conectar com Google');
            setIsGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPhone = telefone.replace(/\D/g, '');

        if (cleanPhone.length < 10) {
            toast.error('Informe um WhatsApp válido com DDD');
            return;
        }

        setIsLoading(true);
        try {
            if (isBindingOnly) {
                await bindPhone(cleanPhone);
                handleClose();
            } else {
                if (!nome.trim() || nome.trim().length < 2) {
                    toast.error('Informe seu nome ou apelido');
                    setIsLoading(false);
                    return;
                }
                await identifyClient(nome.trim(), cleanPhone);
                toast.success('Favoritos salvos com sucesso! 🎉', {
                    description: 'Sua lista agora está salva permanentemente na sua Área do Cliente.'
                });
                handleClose();
            }
        } catch (err: any) {
            console.error('Erro na identificação do cliente:', err);
            toast.error(err.message || 'Erro ao conectar. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;
    // Se o usuário já está completamente logado com telefone, não precisa deste modal
    if (!isBindingOnly && savedPhone) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/85 backdrop-blur-md"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden z-10 text-white"
                >
                    {/* Linha de acento no topo */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />

                    {/* Botão Fechar */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
                        title="Fechar"
                    >
                        <X size={18} />
                    </button>

                    {/* Ícone */}
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-4 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                        {isBindingOnly ? (
                            <Phone size={22} className="text-orange-400" />
                        ) : (
                            <Heart size={24} className="fill-orange-500" />
                        )}
                    </div>

                    {/* Título & Descrição */}
                    <div className="space-y-1.5 mb-5">
                        <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                            {isBindingOnly ? (
                                <>
                                    Vincular WhatsApp
                                    <Sparkles size={14} className="text-amber-400" />
                                </>
                            ) : (
                                <>
                                    Identifique-se na Franga Toys
                                    <Sparkles size={14} className="text-amber-400" />
                                </>
                            )}
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                            {isBindingOnly
                                ? `Olá, ${savedNome?.split(' ')[0] || 'colecionador'}! Informe seu WhatsApp para acompanhar suas encomendas e sincronizar seus pedidos automaticamente.`
                                : 'Acesse com sua conta Google ou WhatsApp para salvar seus favoritos e acompanhar seus pedidos em tempo real.'}
                        </p>
                    </div>

                    {/* Opção 1: Google OAuth (apenas se não estiver no modo de bindPhone) */}
                    {!isBindingOnly && (
                        <div className="space-y-3 mb-4">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isGoogleLoading || isLoading}
                                className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer border border-zinc-200"
                            >
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>{isGoogleLoading ? 'Conectando...' : 'Continuar com o Google'}</span>
                            </button>

                            {/* Divisor */}
                            <div className="relative flex items-center justify-center my-2">
                                <div className="border-t border-zinc-800 w-full" />
                                <span className="bg-zinc-950 px-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">
                                    ou com seu WhatsApp
                                </span>
                                <div className="border-t border-zinc-800 w-full" />
                            </div>
                        </div>
                    )}

                    {/* Formulário WhatsApp */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {!isBindingOnly && (
                            <div>
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1.5">
                                    Como podemos te chamar?
                                </label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    placeholder="Ex: Pedro Henrique"
                                    required
                                    autoFocus
                                    className="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1.5">
                                Seu WhatsApp (com DDD)
                            </label>
                            <input
                                type="tel"
                                value={telefone}
                                onChange={e => setTelefone(formatPhone(e.target.value))}
                                placeholder="(11) 99999-9999"
                                required
                                autoFocus={isBindingOnly}
                                className="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                            />
                        </div>

                        <div className="pt-2 space-y-2">
                            <button
                                type="submit"
                                disabled={isLoading || isGoogleLoading}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <span>Salvando...</span>
                                ) : isBindingOnly ? (
                                    <>
                                        <CheckCircle2 size={15} />
                                        <span>Vincular e Ativar Rastreio</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight size={15} />
                                        <span>Acessar com WhatsApp</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                                {isBindingOnly ? 'Fazer isso mais tarde' : 'Continuar navegando sem salvar'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-center gap-1.5 text-[10px] text-zinc-600 font-medium">
                        <Lock size={11} />
                        <span>Seus dados ficam protegidos no ateliê Franga Toys</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
