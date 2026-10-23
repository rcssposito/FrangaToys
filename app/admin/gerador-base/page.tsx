'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function RedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const params = searchParams ? searchParams.toString() : '';
        const target = params ? `/admin/automation?tab=base&${params}` : '/admin/automation?tab=base';
        router.replace(target);
    }, [router, searchParams]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Redirecionando para Automações & IA...
            </p>
        </div>
    );
}

export default function AdminGeradorBasePage() {
    return (
        <Suspense fallback={null}>
            <RedirectContent />
        </Suspense>
    );
}
