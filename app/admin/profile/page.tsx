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
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Meu Perfil</h1>
                <p className="text-zinc-400">Gerencie suas credenciais de acesso.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white">
                        {user?.email}
                    </div>
                </div>

                {/* Passkey Section - Hidden until enabled in Supabase Dashboard
                <div className="pt-4 border-t border-zinc-800 opacity-50 pointer-events-none grayscale">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Fingerprint className="text-orange-500" />
                        Passkeys (Biometria)
                    </h2>
                    <p className="text-zinc-400 text-sm mb-6">
                        Funcionalidade indisponível no momento. Aguardando ativação no servidor.
                    </p>
                </div>
                */}
            </div>
        </div>
    );
}
