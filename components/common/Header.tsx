'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Flame, Palette, Compass, HelpCircle, Instagram, Settings, 
  Menu, X, Truck, MessageCircle, ShoppingBag, ShieldCheck, Moon, Sun, ChevronRight 
} from 'lucide-react';
import { CartIndicator } from '@/components/Cart/CartIndicator';
import { WishlistIndicator } from '@/components/Wishlist/WishlistIndicator';
import UserSessionBadge from '@/components/common/UserSessionBadge';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { setIsCartOpen } = useCart();
  const { setIsWishlistOpen, wishlistCount } = useWishlist();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fecha o menu móvel ao mudar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Trava scroll da página quando o menu móvel estiver aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Don't show header in admin pages or full-screen universe
  if (pathname?.startsWith('/admin') || pathname === '/universo') {
    return null;
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de tirar dúvidas sobre as figures da Franga Toys.')}`;

  const handleHomeClick = () => {
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reset-home-filters'));
    }
  };

  return (
    <header className="w-full">
      {/* =========================================================================
          DESKTOP HEADER
         ========================================================================= */}
      <div className="hidden sm:flex items-center justify-between relative py-4 sm:py-5 px-4 max-w-[95%] mx-auto border-b border-white/5 mb-6">
        {/* Left: Logo */}
        <div className="flex-1 flex justify-start">
          <Link href="/" onClick={handleHomeClick} className="hover:opacity-85 transition-opacity flex-shrink-0">
            <img
              src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
              alt="Franga Toys Logo"
              width={180}
              height={72}
              fetchPriority="high"
              className="h-14 md:h-18 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-6 lg:gap-8 justify-center">
          <Link
            href="/campanha"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/campanha' ? "text-purple-400" : "text-purple-500 hover:text-purple-400"
            )}
            title="Campanhas e Promoções Especiais"
          >
            <Flame size={15} className="group-hover:animate-pulse" />
            <span>Promoções</span>
          </Link>

          <div className="h-3.5 w-px bg-zinc-800/40" />

          <Link
            href="/parceiros"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/parceiros'
                ? "text-blue-400"
                : "text-zinc-400 hover:text-blue-400"
            )}
            title="Nossos Estúdios e Escultores"
          >
            <Palette
              size={15}
              className={clsx(
                pathname === '/parceiros'
                  ? "text-blue-400"
                  : "group-hover:text-blue-400"
              )}
            />
            <span>Estúdios</span>
          </Link>

          <div className="h-3.5 w-px bg-zinc-800/40" />

          <Link
            href="/universo"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/universo'
                ? "text-orange-400"
                : "text-zinc-400 hover:text-orange-400"
            )}
            title="Explorar Universo 3D em Grafo"
          >
            <Compass
              size={15}
              className="text-orange-400 group-hover:rotate-45 transition-transform"
            />
            <span>Universo 3D</span>
          </Link>

          <div className="h-3.5 w-px bg-zinc-800/40" />

          <Link
            href="/faq"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/faq'
                ? "text-amber-400"
                : "text-zinc-400 hover:text-amber-400"
            )}
            title="Dúvidas Frequentes (FAQ)"
          >
            <HelpCircle
              size={15}
              className={clsx(
                pathname === '/faq'
                  ? "text-amber-400"
                  : "group-hover:text-amber-400"
              )}
            />
            <span>FAQ</span>
          </Link>

          <div className="h-3.5 w-px bg-zinc-800/40" />

          <Link
            href="/rastreio"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/rastreio'
                ? "text-emerald-400"
                : "text-zinc-400 hover:text-emerald-400"
            )}
            title="Rastrear Encomenda"
          >
            <Truck size={15} />
            <span>Rastreio</span>
          </Link>
        </nav>

        {/* Right: Utilities / Session / Cart */}
        <div className="flex-1 flex items-center justify-end gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <WishlistIndicator className="hover:bg-zinc-900/10 dark:hover:bg-zinc-800/50 p-2 rounded-lg" />
            <CartIndicator
              onClick={() => setIsCartOpen(true)}
              className="hover:bg-zinc-900/10 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg"
            />
            <a
              href="https://www.instagram.com/frangatoys/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-pink-500 hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center justify-center"
              title="Instagram @frangatoys"
              aria-label="Instagram da Franga Toys"
            >
              <Instagram size={18} />
            </a>
            <Link
              href="/admin"
              prefetch={false}
              className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center justify-center"
              title="Painel Admin"
              aria-label="Acessar Painel Admin"
            >
              <Settings size={18} />
            </Link>
          </div>

          <div className="h-4 w-px bg-zinc-800/40" />

          <UserSessionBadge />
        </div>
      </div>

      {/* =========================================================================
          MOBILE HEADER (Clean, Native App Feel, No Admin Cog)
         ========================================================================= */}
      <div className="flex sm:hidden items-center justify-between px-3.5 py-2.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-30 h-14">
        {/* Left: Hamburger Menu + Logo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Abrir Menu de Navegação"
            title="Menu"
          >
            <Menu size={19} />
          </button>

          <Link href="/" onClick={handleHomeClick} className="flex items-center hover:opacity-85 transition-opacity pl-1">
            <img
              src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
              alt="Franga Toys Logo"
              width={100}
              height={32}
              fetchPriority="high"
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Right: Wishlist, Cart & Session */}
        <div className="flex items-center gap-1.5">
          <WishlistIndicator className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-300" />
          <CartIndicator onClick={() => setIsCartOpen(true)} className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-300" />
          <UserSessionBadge className="text-[11px] scale-90 origin-right" />
        </div>
      </div>

      {/* =========================================================================
          MOBILE SLIDE-OVER DRAWER MENU
         ========================================================================= */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="sm:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />

            {/* Slide-over Menu Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-zinc-950 border-r border-zinc-800 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Header inside Drawer */}
              <div>
                <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-black/40">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                      alt="Franga Toys"
                      className="h-7 object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                    aria-label="Fechar Menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="p-3 space-y-1">
                  <Link
                    href="/"
                    onClick={handleHomeClick}
                    className={clsx(
                      "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/' 
                        ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" 
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag size={17} className={pathname === '/' ? "text-orange-400" : "text-zinc-400"} />
                      <span>Catálogo Completo</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </Link>

                  <Link
                    href="/campanha"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/campanha' 
                        ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" 
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Flame size={17} className="text-purple-400 animate-pulse" />
                      <span>Promoções & Ofertas</span>
                    </div>
                    <span className="text-[8px] bg-purple-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase">
                      OFF
                    </span>
                  </Link>

                  <Link
                    href="/parceiros"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/parceiros' 
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" 
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Palette size={17} className={pathname === '/parceiros' ? "text-blue-400" : "text-zinc-400"} />
                      <span>Nossos Estúdios</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </Link>

                  <Link
                    href="/rastreio"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/rastreio' 
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Truck size={17} className={pathname === '/rastreio' ? "text-emerald-400" : "text-zinc-400"} />
                      <span>Rastrear Pedido</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </Link>

                  <Link
                    href="/faq"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/faq' 
                        ? "bg-zinc-800 text-white border border-zinc-700" 
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle size={17} className="text-zinc-400" />
                      <span>Dúvidas & FAQ</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </Link>
                </div>
              </div>

              {/* Bottom Actions: WhatsApp & Instagram & Guarantee */}
              <div className="p-4 border-t border-zinc-800/80 bg-black/40 space-y-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all"
                >
                  <MessageCircle size={16} />
                  <span>Falar no WhatsApp</span>
                </a>

                <a
                  href="https://www.instagram.com/frangatoys/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Instagram size={15} className="text-pink-500" />
                  <span>Instagram @frangatoys</span>
                </a>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 pt-1 font-medium">
                  <ShieldCheck size={12} className="text-orange-400" />
                  <span>Ateliê 100% Seguro & Garantido</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
