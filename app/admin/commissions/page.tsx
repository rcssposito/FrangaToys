'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CommissionsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/sales?tab=comissoes');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
            <p className="text-xs uppercase font-black tracking-widest text-zinc-500">
                Redirecionando para Vendas & Comissões...
            </p>
        </div>
    );
}
