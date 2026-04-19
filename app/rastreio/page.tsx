
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Package, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function TrackingPage() {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
            toast.error('Informe um telefone válido com DDD');
            return;
        }

        setLoading(true);
        
        try {
            // Verificação rápida se existe algo antes de navegar
            const res = await fetch(`/api/public/orders?phone=${sanitized}`);
            const data = await res.json();

            if (data.items && data.items.length > 0) {
                // Usamos o token do pedido mais recente como chave de acesso
                const latestToken = data.items[0].token;
                
                // Salva no localStorage para não precisar digitar de novo
                localStorage.setItem('frangatoys_tracking_phone', sanitized);
                localStorage.setItem('frangatoys_tracking_token', latestToken);
                
                router.push(`/rastreio/${latestToken}`);
            } else {
                toast.error('Nenhum pedido encontrado para este telefone.');
            }
        } catch (err) {
            toast.error('Erro ao buscar pedidos');
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
                    <h1 className="text-4xl font-black tracking-tightest leading-none">
                        RASTREIO DE <br />
                        <span className="text-orange-500">PRODUÇÃO</span>
                    </h1>
                    <p className="text-zinc-500 text-sm font-medium max-w-[280px] mx-auto">
                        Acompanhe o status do seu colecionável artesanal em tempo real.
                    </p>
                </div>

                {/* Form */}
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
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !phone}
                        className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(249,115,22,0.2)] active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : (
                            <>
                                ACESSAR PEDIDOS
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer / Privacy Note */}
                <div className="pt-8 flex flex-col items-center gap-4 text-center">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-zinc-600 bg-zinc-900/30 px-4 py-2 rounded-full border border-white/5">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        Privacidade Garantida • Sem Senhas
                    </div>
                    <p className="text-[10px] text-zinc-700 max-w-[200px] leading-relaxed">
                        Use o mesmo telefone informado no momento da compra para validar o acesso.
                    </p>
                </div>
            </div>
        </div>
    );
}
