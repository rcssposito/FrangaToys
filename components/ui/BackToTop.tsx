'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

export const BackToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={clsx(
                "fixed bottom-20 right-4 z-50 bg-[#ea580c] hover:bg-[#c2410c] text-white px-4 py-2 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 font-medium active:scale-95",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
            )}
            aria-label="Voltar ao topo"
        >
            <ArrowUp size={18} />
            <span>Topo</span>
        </button>
    );
};
