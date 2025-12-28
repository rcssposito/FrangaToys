'use client';

import { useRouter } from 'next/navigation';
import { FiguraDTO } from '@/lib/dto';
import { X } from 'lucide-react';
import { FigureDetails } from '@/components/Gallery/FigureDetails';
import { useEffect } from 'react';

interface InterceptedModalProps {
    figure: FiguraDTO;
}

export function InterceptedModal({ figure }: InterceptedModalProps) {
    const router = useRouter();

    const onClose = () => {
        router.back();
    };

    // Body Scroll Lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-5xl h-[90vh] flex flex-col items-center justify-center p-2 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[110] p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <FigureDetails figure={figure} />
            </div>
        </div>
    );
}
