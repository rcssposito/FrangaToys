import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] p-8 rounded-3xl shadow-xl text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                    <AlertTriangle className="text-red-500" size={32} />
                </div>
                <h1 className="text-2xl font-black text-[var(--foreground)] mb-2">Erro de Autenticação</h1>
                <p className="text-[var(--text-muted)] text-sm mb-6">
                    Não foi possível validar o código de autenticação ou a sessão expirou. Por favor, tente fazer login novamente.
                </p>
                <Link
                    href="/admin/login"
                    className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20"
                >
                    <ArrowLeft size={18} />
                    <span>Voltar ao Login</span>
                </Link>
            </div>
        </div>
    );
}
