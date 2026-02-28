'use client';

import { usePermission } from '@/hooks/usePermission';
import { Fingerprint, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Authenticator {
    id: string;
    friendly_name: string;
    factor_type: 'totp' | 'webauthn';
    status: 'verified' | 'unverified';
    created_at: string;
    updated_at: string;
}

export default function ProfilePage() {
    const { user } = usePermission();
    const [isLoading, setIsLoading] = useState(false);
    const [authenticators, setAuthenticators] = useState<Authenticator[]>([]);
    const supabase = createClient();

    const fetchAuthenticators = async () => {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (data?.all) {
            setAuthenticators(data.all as Authenticator[]);
        }
    };

    useEffect(() => {
        fetchAuthenticators();
    }, []);

    const handleRegisterPasskey = async () => {
        setIsLoading(true);
        try {
            // 1. Enroll call initiates the browser native prompt
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'webauthn',
            });

            if (error) throw error;

            // 2. Challenge is handled automatically by the SDK for WebAuthn in recent versions?
            // If strictly needing verification step immediately (MFA):
            // await supabase.auth.mfa.challenge({ factorId: data.id });
            // await supabase.auth.mfa.verify(...)

            // However, for "Passkey" (Login), enrollment usually suffices or requires a second step 
            // depending on SDK version. Supabase JS v2.8+ usually does it all.

            toast.success('Passkey cadastrada com sucesso!');
            fetchAuthenticators();

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao cadastrar Passkey.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFactor = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta chave?')) return;
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
            if (error) throw error;
            toast.success('Chave removida.');
            fetchAuthenticators();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="space-y-10 max-w-2xl transition-colors duration-300">
            <div className="flex items-center gap-4">
                <div className="p-3.5 bg-orange-500/10 text-orange-500 rounded-2xl shadow-sm border border-orange-500/20">
                    <Fingerprint size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Meu Perfil</h1>
                    <p className="text-[var(--text-muted)] text-sm font-medium mt-1">Gerencie suas credenciais de acesso e segurança.</p>
                </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 space-y-8 shadow-[var(--shadow-md)]">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block ml-1">Email de Acesso</label>
                    <div className="p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] font-black text-lg shadow-inner">
                        {user?.email}
                    </div>
                </div>

                <div className="pt-6 border-t border-[var(--card-border)]">
                    <h2 className="text-xl font-black text-[var(--foreground)] mb-4 flex items-center gap-3 tracking-tight opacity-50">
                        <Fingerprint className="text-orange-500" size={24} />
                        Passkeys (Biometria)
                    </h2>
                    <div className="p-6 bg-[var(--background)]/50 border border-dashed border-[var(--card-border)] rounded-2xl text-center">
                        <p className="text-[var(--text-muted)] text-sm font-black uppercase tracking-widest opacity-40">
                            Funcionalidade em desenvolvimento
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
