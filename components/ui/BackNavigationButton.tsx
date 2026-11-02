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
        if (typeof window !== 'undefined') {
            // 1. Se navegou internamente dentro do site, usa o histórico nativo para preservar filtros e scroll
            const hasInternalHistory =
                (window.history.state?.idx !== undefined && window.history.state.idx > 0) ||
                (document.referrer && document.referrer.includes(window.location.host)) ||
                (window.history.length > 1 && !document.referrer);

            if (hasInternalHistory) {
                router.back();
                return;
            }

            // 2. Se abriu em nova aba ou deu F5, resgata a última URL da galeria com todos os filtros
            const savedGalleryUrl = sessionStorage.getItem('franga_last_gallery_url');
            if (savedGalleryUrl) {
                router.push(savedGalleryUrl);
                return;
            }
        }

        router.push(fallbackHref);
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

