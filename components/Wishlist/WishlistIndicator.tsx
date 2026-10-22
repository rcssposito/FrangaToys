'use client';

import { Heart } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface WishlistIndicatorProps {
    onClick?: () => void;
    className?: string;
}

export const WishlistIndicator = ({ onClick, className }: WishlistIndicatorProps) => {
    const { wishlistCount, setIsWishlistOpen } = useWishlist();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            setIsWishlistOpen(true);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={clsx(
                "relative p-2 rounded-full hover:bg-[var(--input-bg)] transition-colors text-[var(--foreground)] cursor-pointer group",
                className
            )}
            aria-label="Ver Favoritos"
            title="Meus Favoritos"
        >
            <Heart
                size={22}
                className={clsx(
                    "transition-all duration-300",
                    wishlistCount > 0 ? "text-orange-500 fill-orange-500/20 group-hover:fill-orange-500" : "text-current group-hover:text-orange-400"
                )}
            />
            <AnimatePresence>
                {wishlistCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 bg-orange-500 text-black font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-[var(--background)]"
                    >
                        {wishlistCount}
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
};
