'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, CheckCircle2, X, Lock } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';

export function WishlistAuthModal() {
    const { 
        isAuthModalOpen, 
        closeAuthModal, 
        savedPhone, 
        identifyClient 
    } = useWishlist();

    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPhone = telefone.replace(/\D/g, '');
        
        if (!nome.trim() || nome.trim().length < 2) {
            toast.error('Informe seu nome ou apelido');
            return;
        }

        if (cleanPhone.length < 10) {
            toast.error('Informe um WhatsApp válido com DDD');
            return;
        }

        setIsLoading(true);
        try {
            await identifyClient(nome.trim(), cleanPhone);
            toast.success('Favoritos salvos com sucesso! 🎉', {
                description: 'Sua lista agora está salva permanentemente na sua Área do Cliente.'
            });
            closeAuthModal();
        } catch (err: any) {
            console.error('Erro ao identificar cliente:', err);
            toast.error(err.message || 'Erro ao conectar. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthModalOpen || savedPhone) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeAuthModal}
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
                        onClick={closeAuthModal}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
                        title="Fechar"
                    >
                        <X size={18} />
                    </button>

                    {/* Ícone */}
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-4 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                        <Heart size={24} className="fill-orange-500" />
                    </div>

                    {/* Título & Descrição */}
                    <div className="space-y-1.5 mb-5">
                        <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                            Salvar na sua Lista
                            <Sparkles size={14} className="text-amber-400" />
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                            Identifique-se uma única vez para não perder seus favoritos se fechar o navegador ou trocar de celular.
                        </p>
                    </div>

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="space-y-3">
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
                                className="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                            />
                        </div>

                        <div className="pt-2 space-y-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <span>Salvando...</span>
                                ) : (
                                    <>
                                        <CheckCircle2 size={15} />
                                        <span>Salvar Meus Favoritos</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={closeAuthModal}
                                className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                                Continuar sem salvar por enquanto
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
