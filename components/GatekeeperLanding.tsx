'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, CheckCircle2, Lock, ArrowRight, Loader2, Instagram, Phone, User, ShieldCheck, Sparkles, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface GatekeeperLandingProps {
    onAccessGranted?: () => void;
}

export function GatekeeperLanding({ onAccessGranted }: GatekeeperLandingProps) {
    const supabase = createClient();

    // Modal de Solicitação de Acesso
    const [showAccessModal, setShowAccessModal] = useState(false);

    // Modal de Chave Manual (Já tenho convite)
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [manualKey, setManualKey] = useState('');
    const [isValidatingKey, setIsValidatingKey] = useState(false);

    // Formulário
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [instagram, setInstagram] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.slice(0, 11);
        if (val.length > 6) {
            val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
        } else if (val.length > 2) {
            val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
        }
        setWhatsapp(val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) {
            toast.error('Por favor, informe seu nome completo.');
            return;
        }
        const cleanPhone = whatsapp.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            toast.error('Informe um WhatsApp válido com DDD.');
            return;
        }
        const cleanIg = instagram.trim().replace(/^@/, '');
        if (!cleanIg) {
            toast.error('Por favor, informe seu usuário do Instagram (@seu_perfil).');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/public/access/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nome.trim(),
                    whatsapp: cleanPhone,
                    instagram: cleanIg,
                    mensagem: mensagem.trim() || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao processar solicitação');
            }

            setIsSubmitted(true);
            toast.success('Solicitação enviada com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Falha ao enviar solicitação.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManualKeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualKey.trim()) return;

        setIsValidatingKey(true);
        try {
            const res = await fetch('/api/public/access/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: manualKey.trim() })
            });

            const data = await res.json();
            if (data.ok) {
                toast.success(`Bem-vindo, ${data.nome || 'Colecionador'}!`);
                if (onAccessGranted) {
                    onAccessGranted();
                } else {
                    window.location.reload();
                }
            } else {
                toast.error(data.error || 'Chave de acesso inválida.');
            }
        } catch {
            toast.error('Erro ao validar chave de acesso.');
        } finally {
            setIsValidatingKey(false);
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden fixed inset-0 z-50 bg-black text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black font-sans">
            {/* Banner Oficial Full Screen de Fundo (sem scroll) */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/Franga_Toys_Studio_8K.webp"
                    alt="Ateliê Franga Toys Background"
                    fill
                    quality={100}
                    unoptimized
                    className="object-cover object-center"
                    priority
                />
                {/* Overlay sutil apenas para contraste da leitura */}
                <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/50 pointer-events-none" />
            </div>

            {/* Topo com o Botão Estilizado Centralizado e Chave VIP no canto direito */}
            <header className="w-full z-20 px-4 sm:px-8 py-4 sm:py-6 relative flex items-center justify-center">
                {/* Botão Estilizado de Solicitar Acesso Centralizado no Topo */}
                <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAccessModal(true)}
                    className="group flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-black/80 hover:bg-black/95 backdrop-blur-xl border border-white/15 hover:border-amber-500/50 shadow-2xl shadow-black/90 transition-all text-left cursor-pointer max-w-sm sm:max-w-md mx-auto"
                >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 group-hover:border-amber-400 transition-all">
                        <Lock size={15} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-white group-hover:text-amber-300 transition-colors">
                                SOLICITAR ACESSO
                            </span>
                            <span className="text-[10px] text-zinc-400 hidden xs:inline">• Acesso sob convite</span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5 group-hover:text-zinc-300 transition-colors">
                            Peças em resina sob encomenda. Toque para pedir seu convite.
                        </p>
                    </div>
                    <ArrowRight size={14} className="text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </motion.button>

                {/* Ações no Canto Direito: Instagram + Chave VIP */}
                <div className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <a
                        href="https://www.instagram.com/frangatoys/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 hover:border-pink-500/40 text-xs font-semibold text-zinc-200 hover:text-pink-400 transition-all shadow-xl active:scale-95 group"
                        title="Chamar no Instagram @frangatoys"
                    >
                        <Instagram size={14} className="text-pink-400 group-hover:scale-110 transition-transform" />
                        <span className="hidden md:inline">@frangatoys</span>
                    </a>

                    <button
                        onClick={() => setShowKeyModal(true)}
                        className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-xs font-semibold text-zinc-200 hover:text-white transition-all shadow-xl active:scale-95"
                        title="Já tenho convite"
                    >
                        <Key size={13} className="text-amber-400" />
                        <span className="hidden sm:inline">Já tenho convite</span>
                    </button>
                </div>
            </header>

            {/* Centro da tela: Título Centralizado + Subtítulo */}
            <main className="w-full relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center">
                <div className="flex flex-col items-center space-y-4 max-w-xl mx-auto">
                    {/* Título Centralizado */}
                    <div className="space-y-2 select-none">
                        <div className="flex items-center justify-center gap-2 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-[0.3em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                            <Sparkles size={14} className="text-amber-400" />
                            <span>BEM-VINDO AO ATELIÊ</span>
                            <Sparkles size={14} className="text-amber-400" />
                        </div>

                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
                            FRANGA TOYS
                        </h1>
                        
                        <div className="text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-amber-400 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                            ESCULTURAS & PINTURA ARTESANAL
                        </div>
                    </div>

                    {/* Subtítulo com acabamento de alta definição */}
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-w-lg drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)] font-medium">
                        Peças artesanais com acabamento de alta definição e tiragens sob demanda. A visualização do catálogo é liberada mediante aprovação prévia.
                    </p>
                </div>
            </main>

            {/* Footer com Barra Escura Translúcida para Máxima Legibilidade */}
            <footer className="w-full z-20 px-4 sm:px-8 sm:pr-20 py-3 bg-black/70 backdrop-blur-md border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-200">
                <span className="font-mono text-[11px] sm:text-xs text-zinc-300 font-semibold tracking-wide shrink-0">
                    © {new Date().getFullYear()} FRANGA TOYS — Ateliê Artesanal
                </span>
                <span className="text-[11px] sm:text-xs text-zinc-300 text-center sm:text-right max-w-xl font-medium leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    Esculturas artesanais sob encomenda (fanart / tributo). Não possuímos vínculo ou filiação com detentoras oficiais de marcas.
                </span>
            </footer>

            {/* MODAL 1: SOLICITAR ACESSO (GOOGLE OU WHATSAPP) */}
            <AnimatePresence>
                {showAccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md bg-zinc-950/95 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative backdrop-blur-2xl text-left"
                        >
                            <button
                                onClick={() => setShowAccessModal(false)}
                                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                <X size={18} />
                            </button>

                            {isSubmitted ? (
                                <div className="text-center py-4 space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                                        <CheckCircle2 size={26} />
                                    </div>
                                    <h3 className="text-lg font-black text-white">Solicitação Enviada!</h3>
                                    <p className="text-xs text-zinc-300 leading-relaxed">
                                        Recebemos seus dados. Assim que o ateliê aprovar, seu convite será enviado no WhatsApp: <strong className="text-white font-mono">{whatsapp}</strong>.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setIsSubmitted(false);
                                            setShowAccessModal(false);
                                        }}
                                        className="mt-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 rounded-xl transition-colors"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                                            <Lock size={14} />
                                        </div>
                                        <h3 className="text-base font-black text-white">Solicitar Acesso ao Ateliê</h3>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-5">
                                        Preencha seus dados para análise e liberação do seu convite:
                                    </p>

                                    {/* Formulário de Solicitação */}
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-zinc-300 block mb-1 flex items-center gap-1.5">
                                                <User size={12} className="text-amber-400" />
                                                <span>Nome Completo <span className="text-amber-400">*</span></span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Seu nome"
                                                value={nome}
                                                onChange={(e) => setNome(e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-zinc-300 block mb-1 flex items-center gap-1.5">
                                                <Phone size={12} className="text-amber-400" />
                                                <span>WhatsApp com DDD <span className="text-amber-400">*</span></span>
                                            </label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="(11) 99999-9999"
                                                value={whatsapp}
                                                onChange={handlePhoneChange}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-amber-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-zinc-300 block mb-1 flex items-center gap-1.5">
                                                <Instagram size={12} className="text-pink-400" />
                                                <span>Instagram <span className="text-amber-400">*</span></span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="@seu_perfil"
                                                value={instagram}
                                                onChange={(e) => setInstagram(e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-amber-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-zinc-300 block mb-1 flex items-center gap-1.5">
                                                <MessageSquare size={12} className="text-amber-400" />
                                                <span>Quer facilitar sua aprovação?</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="Deixe uma mensagem (ex: como conheceu o ateliê, peças de interesse...)"
                                                value={mensagem}
                                                onChange={(e) => setMensagem(e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    <span>Enviando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Enviar Solicitação</span>
                                                    <ArrowRight size={14} />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Link direto para quem prefere chamar no Instagram */}
                                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                                        <span>Prefere falar direto?</span>
                                        <a
                                            href="https://www.instagram.com/frangatoys/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-pink-400 hover:text-pink-300 font-bold hover:underline"
                                        >
                                            <Instagram size={13} />
                                            <span>Chamar no Instagram</span>
                                        </a>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: INSERIR CHAVE MANUAL (JÁ TENHO CONVITE) */}
            <AnimatePresence>
                {showKeyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-sm bg-zinc-950/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative backdrop-blur-2xl text-left"
                        >
                            <button
                                onClick={() => setShowKeyModal(false)}
                                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                <X size={18} />
                            </button>

                            <div className="flex items-center gap-2 mb-2">
                                <Key size={16} className="text-amber-400" />
                                <h3 className="text-base font-black text-white">Inserir Chave VIP</h3>
                            </div>

                            <p className="text-xs text-zinc-400 mb-4">
                                Digite seu token ou chave mestre para liberar o acervo:
                            </p>

                            <form onSubmit={handleManualKeySubmit} className="space-y-3">
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: vip_a1b2c3d4..."
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-amber-400"
                                />

                                <button
                                    type="submit"
                                    disabled={isValidatingKey}
                                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isValidatingKey ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <span>Desbloquear Catálogo</span>
                                    )}
                                </button>
                            </form>

                            {/* Ajuda para quem caiu aqui sem chave */}
                            <div className="pt-4 mt-4 border-t border-zinc-800/80 text-center space-y-2.5">
                                <p className="text-xs text-zinc-400">
                                    Não tem um convite ou chave VIP?
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowKeyModal(false);
                                        setShowAccessModal(true);
                                    }}
                                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                                >
                                    <Lock size={12} className="text-amber-400" />
                                    <span>Pedir Acesso ao Ateliê</span>
                                    <ArrowRight size={12} />
                                </button>
                                <div className="text-[11px] text-zinc-500 flex items-center justify-center gap-1 pt-0.5">
                                    <span>Ou fale direto no</span>
                                    <a
                                        href="https://www.instagram.com/frangatoys/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-pink-400 hover:text-pink-300 font-semibold hover:underline inline-flex items-center gap-1"
                                    >
                                        <Instagram size={11} />
                                        @frangatoys
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
