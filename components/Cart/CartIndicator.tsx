'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface CartIndicatorProps {
    onClick: () => void;
    className?: string;
}

export const CartIndicator = ({ onClick, className }: CartIndicatorProps) => {
    const { totalItems } = useCart();

    return (
        <button
            onClick={onClick}
            className={clsx(
                "relative p-2 rounded-full hover:bg-[var(--input-bg)] transition-colors text-[var(--foreground)]",
                className
            )}
            aria-label="Ver Carrinho"
        >
            <ShoppingCart size={24} className="text-current" />
            <AnimatePresence>
                {totalItems > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 bg-orange-600 text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-[var(--background)]"
                    >
                        {totalItems}
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
};
