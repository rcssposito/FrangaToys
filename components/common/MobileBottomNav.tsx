'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Flame, Heart, Truck, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems, setIsCartOpen } = useCart();
  const { wishlistCount, setIsWishlistOpen, savedPhone } = useWishlist();

  // Não exibe a barra inferior no Admin, Universo 3D nem na Página do Produto (onde há a barra de compra)
  if (pathname?.startsWith('/admin') || pathname === '/universo' || pathname?.startsWith('/figura/')) {
    return null;
  }

  const isHome = pathname === '/';
  const isCampanha = pathname === '/campanha';
  const isRastreio = Boolean(pathname?.startsWith('/rastreio'));
  const rastreioHref = savedPhone ? `/rastreio/${savedPhone}` : '/rastreio';

  return (
    <nav 
      aria-label="Navegação Principal Mobile"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/92 backdrop-blur-xl border-t border-zinc-800/80 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
        {/* 1. Início */}
        <Link
          href="/"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('reset-home-filters'));
            }
          }}
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 w-full",
            isHome ? "text-orange-500 font-black" : "text-zinc-400 hover:text-white"
          )}
        >
          <div className="relative">
            <Home size={20} className={clsx("transition-transform", isHome && "scale-110")} />
            {isHome && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,1)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none">Início</span>
        </Link>

        {/* 2. Promoções */}
        <Link
          href="/campanha"
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 w-full relative",
            isCampanha ? "text-purple-400 font-black" : "text-zinc-400 hover:text-purple-400"
          )}
        >
          <div className="relative">
            <Flame size={20} className={clsx("transition-transform", isCampanha && "scale-110 text-purple-400 animate-pulse")} />
            <span className="absolute -top-1 -right-2 text-[7px] font-black uppercase tracking-wider bg-purple-600 text-white px-1 py-0.2 rounded-full shadow-sm animate-pulse">
              Off
            </span>
            {isCampanha && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,1)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none">Ofertas</span>
        </Link>

        {/* 3. Favoritos */}
        <button
          type="button"
          onClick={() => setIsWishlistOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90 w-full cursor-pointer"
          title="Ver Favoritos"
          aria-label="Abrir Lista de Desejos"
        >
          <div className="relative">
            <Heart size={20} className={clsx(wishlistCount > 0 && "text-orange-400")} />
            <AnimatePresence>
              {wishlistCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-2 bg-orange-500 text-black font-black text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-md"
                >
                  {wishlistCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[10px] tracking-tight leading-none">Salvos</span>
        </button>

        {/* 4. Rastreio */}
        <Link
          href={rastreioHref}
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 w-full",
            isRastreio ? "text-blue-400 font-black" : "text-zinc-400 hover:text-blue-400"
          )}
        >
          <div className="relative">
            <Truck size={20} className={clsx("transition-transform", isRastreio && "scale-110")} />
            {isRastreio && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none">Rastreio</span>
        </Link>

        {/* 5. Carrinho */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90 w-full relative cursor-pointer"
          title="Ver Carrinho"
          aria-label="Abrir Carrinho de Compras"
        >
          <div className="relative">
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              totalItems > 0 
                ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/25 scale-105" 
                : "text-zinc-300"
            )}>
              <ShoppingCart size={18} className={totalItems > 0 ? "text-black" : "text-current"} />
            </div>
            <AnimatePresence>
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 bg-white text-orange-600 font-black text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-md ring-2 ring-black"
                >
                  {totalItems}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className={clsx("text-[10px] tracking-tight leading-none", totalItems > 0 && "text-orange-400 font-bold")}>
            Carrinho
          </span>
        </button>
      </div>
    </nav>
  );
}
