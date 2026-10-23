'use client';

import Link from 'next/link';
import { Flame, Palette, Compass, HelpCircle, Instagram, Settings } from 'lucide-react';
import { CartIndicator } from '@/components/Cart/CartIndicator';
import { WishlistIndicator } from '@/components/Wishlist/WishlistIndicator';
import UserSessionBadge from '@/components/common/UserSessionBadge';
import { useCart } from '@/context/CartContext';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

export default function Header() {
  const { setIsCartOpen } = useCart();
  const pathname = usePathname();

  // Don't show header in admin pages or full-screen universe
  if (pathname?.startsWith('/admin') || pathname === '/universo') {
    return null;
  }

  return (
    <header className="w-full">
      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between relative py-4 sm:py-5 px-4 max-w-[95%] mx-auto border-b border-white/5 mb-6">
        {/* Left: Logo */}
        <div className="flex-1 flex justify-start">
          <Link href="/" className="hover:opacity-85 transition-opacity flex-shrink-0">
            <img
              src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
              alt="Franga Toys Logo"
              className="h-14 md:h-18 object-contain"
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

      {/* Mobile Header (Clean & Compact) */}
      <div className="flex sm:hidden items-center justify-between px-4 py-3 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--card-border)] sticky top-0 z-30">
        <Link href="/" className="flex items-center hover:opacity-85 transition-opacity">
          <img
            src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
            alt="Franga Toys Logo"
            className="h-9 object-contain"
          />
        </Link>
        
        <div className="flex items-center gap-2">
          <WishlistIndicator className="p-1.5" />
          <CartIndicator onClick={() => setIsCartOpen(true)} className="p-1.5" />
          <a
            href="https://www.instagram.com/frangatoys/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-400 hover:text-pink-500 rounded-lg transition-colors flex items-center justify-center"
            title="Instagram @frangatoys"
            aria-label="Instagram da Franga Toys"
          >
            <Instagram size={18} />
          </a>
          <Link
            href="/admin"
            prefetch={false}
            className="p-1.5 text-zinc-400 hover:text-orange-500 rounded-lg transition-colors flex items-center justify-center"
            title="Painel Admin"
            aria-label="Acessar Painel Admin"
          >
            <Settings size={18} />
          </Link>
          <UserSessionBadge className="text-[11px]" />
        </div>
      </div>
    </header>
  );
}
