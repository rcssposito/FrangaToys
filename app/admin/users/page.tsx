'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function UsersRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/settings?tab=usuarios');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                Redirecionando para Configurações &gt; Equipe...
            </p>
        </div>
    );
}
