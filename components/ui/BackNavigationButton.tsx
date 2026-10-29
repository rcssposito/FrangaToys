'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackNavigationButtonProps {
    fallbackHref?: string;
    label?: string;
}

export function BackNavigationButton({
    fallbackHref = '/',
    label = 'Voltar para a Galeria',
}: BackNavigationButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        if (
            typeof window !== 'undefined' &&
            window.history.length > 1 &&
            document.referrer &&
            document.referrer.includes(window.location.host)
        ) {
            router.back();
        } else {
            router.push(fallbackHref);
        }
    };

    return (
        <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 group text-sm font-black uppercase tracking-widest cursor-pointer"
        >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            {label}
        </button>
    );
}

