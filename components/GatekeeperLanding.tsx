'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Sparkles, Key, CheckCircle2, Lock, ArrowRight, Loader2, Instagram, Phone, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface GatekeeperLandingProps {
    onAccessGranted?: () => void;
}

export function GatekeeperLanding({ onAccessGranted }: GatekeeperLandingProps) {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const isGooglePending = searchParams.get('google_auth') === 'pending';
    const googleName = searchParams.get('name') || '';
    const googleEmail = searchParams.get('email') || '';

    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [instagram, setInstagram] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoggingGoogle, setIsLoggingGoogle] = useState(false);

    // Notifica se houve erro no callback do Google
    useEffect(() => {
        const authError = searchParams.get('error');
        const authDesc = searchParams.get('error_description');
        if (authError) {
            toast.error('Erro na autenticação Google', {
                description: authDesc ? decodeURIComponent(authDesc) : (authError === 'auth_callback_failed' ? 'Código de login inválido ou expirado.' : decodeURIComponent(authError))
            });
        }
    }, [searchParams]);

    // Modal de Chave Manual
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [manualKey, setManualKey] = useState('');
    const [isValidatingKey, setIsValidatingKey] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoggingGoogle(true);
        try {
            const redirectUrl = `${window.location.origin}/auth/callback?next=/`;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl
                }
            });
            if (error) throw error;
        } catch (err: any) {
            toast.error(err.message || 'Erro ao conectar com Google');
            setIsLoggingGoogle(false);
        }
    };

    // Formata WhatsApp enquanto digita
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

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/public/access/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nome.trim(),
                    whatsapp: cleanPhone,
                    instagram: instagram.trim() || undefined
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
        <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-orange-500 selection:text-black relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-orange-600/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[450px] h-[300px] bg-purple-600/5 blur-3xl pointer-events-none" />

            {/* Topbar Minimalista */}
            <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-black shadow-lg shadow-orange-500/20">
                        FT
                    </div>
                    <div>
                        <span className="text-sm font-black tracking-widest uppercase text-white block">Franga Toys</span>
                        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Ateliê de Esculturas 3D</span>
                    </div>
                </div>

                <button
                    onClick={() => setShowKeyModal(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-bold text-zinc-400 hover:text-white transition-all shadow-inner"
                >
                    <Key size={13} className="text-orange-500" />
                    <span>Já tenho convite</span>
                </button>
            </header>

            {/* Conteúdo Central */}
            <main className="w-full max-w-xl mx-auto px-6 py-8 relative z-10 flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    {isGooglePending ? (
                        <motion.div
                            key="google-pending-view"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-zinc-950/80 border border-amber-500/30 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">
                                <Lock size={32} />
                            </div>

                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                Identificação Google Registrada
                            </span>

                            <h2 className="text-2xl font-black text-white mt-4 mb-2">
                                Olá, {googleName || 'Colecionador'}!
                            </h2>

                            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto mb-6">
                                Sua conta Google <strong className="text-white font-mono">{googleEmail}</strong> foi verificada com sucesso. A sua solicitação de acesso está sob análise do ateliê.
                            </p>

                            <div className="pt-4 border-t border-zinc-900 text-[11px] text-zinc-500">
                                Assim que seu acesso for aprovado, ao recarregar a página o catálogo abrirá automaticamente para você.
                            </div>
                        </motion.div>
                    ) : !isSubmitted ? (
                        <motion.div
                            key="form-view"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.4 }}
                        >
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-4">
                                <Lock size={11} />
                                Ateliê Fechado • Acesso por Convite
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
                                Esculturas em Resina sob Encomenda
                            </h1>

                            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                                Peças artesanais com acabamento de alta definição e tiragens sob demanda. A visualização do catálogo é liberada mediante aprovação prévia.
                            </p>

                            {/* Caixa Central de Acesso */}
                            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
                                {/* Botão de Acesso Rápido com Google */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        disabled={isLoggingGoogle}
                                        className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 text-white font-bold text-xs uppercase tracking-wider py-4 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/40 group disabled:opacity-50"
                                    >
                                        {isLoggingGoogle ? (
                                            <Loader2 size={16} className="animate-spin text-orange-500" />
                                        ) : (
                                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                            </svg>
                                        )}
                                        <span>Solicitar Acesso com o Google</span>
                                    </button>
                                </div>

                                <div className="relative flex items-center justify-center">
                                    <div className="border-t border-zinc-800 w-full" />
                                    <span className="bg-zinc-950 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest relative z-10 shrink-0">
                                        Ou solicite via WhatsApp
                                    </span>
                                    <div className="border-t border-zinc-800 w-full" />
                                </div>

                                {/* Formulário WhatsApp */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center gap-1.5">
                                            <User size={13} className="text-orange-500" />
                                            Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Seu nome"
                                            value={nome}
                                            onChange={(e) => setNome(e.target.value)}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center gap-1.5">
                                            <Phone size={13} className="text-orange-500" />
                                            WhatsApp com DDD (para envio do convite)
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="(11) 99999-9999"
                                            value={whatsapp}
                                            onChange={handlePhoneChange}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center gap-1.5">
                                            <Instagram size={13} className="text-orange-500" />
                                            Perfil no Instagram (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="@seu_perfil"
                                            value={instagram}
                                            onChange={(e) => setInstagram(e.target.value)}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                        />
                                        <span className="text-[10px] text-zinc-500 mt-1 block">
                                            Colecionadores com perfil ativo no Instagram têm aprovação prioritária.
                                        </span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-sm uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Enviando Solicitação...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Solicitar Convite de Acesso</span>
                                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-view"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-zinc-950/80 border border-emerald-500/30 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">
                                <CheckCircle2 size={36} />
                            </div>

                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                Solicitação em Análise
                            </span>

                            <h2 className="text-2xl font-black text-white mt-4 mb-2">
                                Obrigado, {nome.split(' ')[0]}!
                            </h2>

                            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto mb-6">
                                Sua solicitação foi recebida pelo nosso ateliê. Assim que for validada, seu convite exclusivo será enviado diretamente no seu WhatsApp: <strong className="text-white font-mono">{whatsapp}</strong>.
                            </p>

                            <div className="pt-4 border-t border-zinc-900 text-[11px] text-zinc-500">
                                Dúvidas? Fale conosco diretamente pelo Instagram oficial <strong className="text-zinc-400">@frangatoys</strong>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer Minimalista */}
            <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-[11px] text-zinc-600 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>© {new Date().getFullYear()} Franga Toys — Ateliê de Escultura & Pintura 3D</span>
                <span className="flex items-center gap-1 text-zinc-500">
                    <ShieldCheck size={13} className="text-orange-500" />
                    Acesso Criptografado & Restrito
                </span>
            </footer>

            {/* Modal de Inserção de Chave Manual */}
            <AnimatePresence>
                {showKeyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowKeyModal(false)}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xs font-bold"
                            >
                                ✕
                            </button>

                            <div className="flex items-center gap-2 mb-3">
                                <Key size={16} className="text-orange-500" />
                                <h3 className="text-base font-black text-white">Inserir Chave VIP</h3>
                            </div>

                            <p className="text-xs text-zinc-400 mb-4">
                                Se você já recebeu seu link com token de acesso ou chave mestre, digite abaixo para liberar o catálogo:
                            </p>

                            <form onSubmit={handleManualKeySubmit} className="space-y-3">
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: vip_a1b2c3d4e5f6..."
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-orange-500"
                                />

                                <button
                                    type="submit"
                                    disabled={isValidatingKey}
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isValidatingKey ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <span>Desbloquear Acervo</span>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

