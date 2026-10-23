'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone, ArrowRight, ShieldCheck, User, Heart, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useWishlist } from '@/context/WishlistContext';

export default function TrackingPage() {
    const [phone, setPhone] = useState('');
    const [nome, setNome] = useState('');
    const [step, setStep] = useState<'phone' | 'register'>('phone');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { wishlistIds } = useWishlist();

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 11) {
            return digits
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .substring(0, 15);
        }
        return value.substring(0, 15);
    };

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        const sanitized = phone.replace(/\D/g, '');
        
        if (sanitized.length < 10) {
            toast.error('Informe um WhatsApp válido com DDD');
            return;
        }

        setLoading(true);
        
        try {
            // 1. Verifica se existem pedidos
            const res = await fetch(`/api/public/orders?phone=${sanitized}`);
            const data = await res.json();

            if (data.items && data.items.length > 0) {
                const latestToken = data.items[0].token;
                localStorage.setItem('frangatoys_tracking_phone', sanitized);
                localStorage.setItem('frangatoys_tracking_token', latestToken);
                router.push(`/rastreio/${latestToken}`);
                return;
            }

            // 2. Se não tem pedidos, verifica se já existe cliente cadastrado
            const clientRes = await fetch(`/api/public/client/profile?phone=${sanitized}`);
            const clientData = await clientRes.json();

            if (clientData.exists && clientData.client) {
                localStorage.setItem('frangatoys_tracking_phone', sanitized);
                toast.success(`Bem-vindo de volta, ${clientData.client.nome}!`);
                router.push(`/rastreio/${sanitized}`);
                return;
            }

            // 3. Não tem pedidos nem cliente cadastrado: avança para o cadastro ágil
            setStep('register');
            toast.info('Número novo! Digite seu nome para ativar sua Área do Cliente.');
        } catch (err) {
            toast.error('Erro ao verificar acesso');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const sanitized = phone.replace(/\D/g, '');

        if (!nome.trim() || nome.trim().length < 2) {
            toast.error('Por favor, informe seu nome.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/public/client/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nome.trim(),
                    telefone: sanitized,
                    wishlist: wishlistIds
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao criar cadastro');

            localStorage.setItem('frangatoys_tracking_phone', sanitized);
            toast.success('Área do Cliente ativada com sucesso!');
            router.push(`/rastreio/${sanitized}`);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao ativar cadastro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Efeitos de Fundo */}
            <div className="absolute inset-x-0 top-0 h-[50vh] bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-orange-600/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 space-y-10">
                {/* Header */}
                <div className="text-center space-y-6">
                    <Link href="/" className="inline-block hover:scale-105 transition-transform">
                        <img
                            src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                            alt="Franga Toys Logo"
                            className="h-24 md:h-32 object-contain mx-auto drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                        />
                    </Link>

                    <div className="flex flex-col items-center">
                        <span className="inline-flex items-center text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full mb-4">
                            {step === 'phone' ? 'Painel do Colecionador' : 'Cadastro Ágil'}
                        </span>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.08] text-white">
                            ÁREA DO <br />
                            <span className="text-orange-500">CLIENTE</span>
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium max-w-[300px] mx-auto mt-3.5">
                            {step === 'phone'
                                ? 'Acompanhe seus pedidos e gerencie seus favoritos em tempo real.'
                                : 'Digite seu nome para ativar sua conta e salvar seus Favoritos na nuvem.'}
                        </p>
                    </div>
                </div>

                {/* Form Step 1: Telefone / WhatsApp */}
                {step === 'phone' && (
                    <form onSubmit={handleTrack} className="space-y-4">
                        <div className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors">
                                <Phone size={20} />
                            </div>
                            <input
                                type="tel"
                                placeholder="(00) 00000-0000"
                                value={phone}
                                onChange={(e) => setPhone(formatPhone(e.target.value))}
                                className="w-full bg-zinc-900/40 backdrop-blur-xl border-2 border-zinc-800 rounded-3xl py-6 pl-16 pr-6 outline-none focus:border-orange-500/50 transition-all text-lg font-bold placeholder:text-zinc-700"
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !phone}
                            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(249,115,22,0.2)] active:scale-[0.98] cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    ACESSAR ÁREA DO CLIENTE
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Form Step 2: Cadastro de Nome (para quem não tem pedidos) */}
                {step === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Phone size={14} className="text-orange-400" />
                                <span className="font-mono font-bold text-white">{phone}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep('phone')}
                                className="text-[10px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 cursor-pointer"
                            >
                                Alterar
                            </button>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors">
                                <User size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Seu Nome Completo"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full bg-zinc-900/40 backdrop-blur-xl border-2 border-zinc-800 rounded-3xl py-6 pl-16 pr-6 outline-none focus:border-orange-500/50 transition-all text-lg font-bold placeholder:text-zinc-700"
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        {wishlistIds.length > 0 && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-orange-400">
                                <Heart size={16} className="fill-orange-500 shrink-0" />
                                <span>
                                    {wishlistIds.length} {wishlistIds.length === 1 ? 'peça favorita será salva' : 'peças favoritas serão salvas'} no seu perfil!
                                </span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !nome.trim()}
                            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(249,115,22,0.2)] active:scale-[0.98] cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    ATIVAR MINHA CONTA & FAVORITOS
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('phone')}
                            className="w-full text-zinc-500 hover:text-zinc-300 font-bold text-xs py-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <ArrowLeft size={14} />
                            Voltar
                        </button>
                    </form>
                )}

                {/* Footer / Privacy Note */}
                <div className="pt-6 flex flex-col items-center gap-4 text-center">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-zinc-600 bg-zinc-900/30 px-4 py-2 rounded-full border border-white/5">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        Privacidade Garantida • Sem Senhas Complicadas
                    </div>
                    <p className="text-[10px] text-zinc-700 max-w-[260px] leading-relaxed">
                        Acesso protegido direto pelo seu WhatsApp cadastrado.
                    </p>
                    <Link href="/faq" className="text-[10px] text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1 font-bold uppercase tracking-wider">
                        Dúvidas sobre envio ou prazos? Acesse o FAQ
                    </Link>
                </div>
            </div>
        </div>
    );
}
