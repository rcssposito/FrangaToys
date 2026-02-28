'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Lock, Loader2, ArrowLeft, Fingerprint, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
    // State unused for now: email/password
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'unauthorized') {
            toast.error('Acesso Negado: Seu email não tem permissão de administrador.', {
                duration: 5000,
                // icon: <AlertCircle className="text-red-500" /> // Sonner icons are automatic or tricky with JSX sometimes, let's stick to text for stability or test.
                description: 'Entre em contato com o suporte se acredita ser um erro.'
            });
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            toast.success('Login realizado com sucesso!');
            router.push('/admin');
            router.refresh();

        } catch (err: any) {
            toast.error(err.message || 'Falha no login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${location.origin}/auth/callback?next=/admin`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            toast.error(err.message || 'Erro ao iniciar login com Google');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />

            <Link href="/" className="absolute top-8 left-8 text-[var(--text-muted)] hover:text-orange-500 flex items-center gap-2 transition-all group font-black uppercase text-[10px] tracking-widest">
                <div className="p-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl group-hover:border-orange-500/30 shadow-sm transition-all">
                    <ArrowLeft size={16} strokeWidth={2.5} />
                </div>
                <span>Voltar para a Loja</span>
            </Link>

            <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] p-10 rounded-[2.5rem] shadow-[var(--shadow-xl)] relative z-10 backdrop-blur-sm">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-orange-500/20 rotate-3">
                        <Lock className="text-orange-500" size={36} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Painel Admin</h1>
                    <p className="text-[var(--text-muted)] font-medium mt-2">Autentique-se para gerenciar a FrangaToys</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-[var(--foreground)] hover:bg-[var(--foreground)]/90 text-[var(--background)] font-black py-4.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-[var(--foreground)]/10 text-sm"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                <div className="bg-white p-1 rounded-md">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26..81-.58z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                </div>
                                ENTRAR COM GOOGLE
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-[var(--text-muted)] text-center font-black uppercase tracking-[0.2em] mt-8 opacity-40">
                        Acesso Restrito
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
                <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
