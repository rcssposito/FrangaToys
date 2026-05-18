'use client';

import { usePermission } from '@/hooks/usePermission';
import { ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

interface AuthGuardProps {
    children: ReactNode;
    allowedRoles: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const { hasRole, loading, user } = usePermission();

    if (loading) {
        return (
            <div className="flex-1 min-h-screen flex items-center justify-center bg-[var(--background)]">
                <Loader2 className="animate-spin text-orange-500 w-12 h-12" />
            </div>
        );
    }

    if (!user) {
        // Redirecionamento é tratado no usePermission (onAuthStateChange)
        return null; 
    }

    // Verifica se o usuário tem alguma das roles permitidas
    // O hook usePermission já considera 'admin' como curinga para todas as rotas
    const hasAccess = allowedRoles.some(role => hasRole(role));

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldAlert className="text-red-500 w-12 h-12" />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight text-center">
                    Acesso Negado
                </h1>
                
                <p className="text-zinc-400 mb-8 max-w-md text-center font-medium">
                    Sua credencial de nível <span className="text-orange-500 font-bold uppercase">{user.roles?.[0] || 'Desconhecido'}</span> não possui autorização para acessar esta área do sistema.
                </p>

                <Link 
                    href="/admin" 
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-black tracking-widest text-sm uppercase rounded-2xl transition-all border border-zinc-800 hover:border-zinc-700 active:scale-95 shadow-sm"
                >
                    <ArrowLeft size={18} />
                    Retornar ao Início
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
