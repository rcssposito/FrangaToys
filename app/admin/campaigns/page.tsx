'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CampaignsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/coupons?tab=campanhas');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                Redirecionando para Promoções & Marketing...
            </p>
        </div>
    );
}
