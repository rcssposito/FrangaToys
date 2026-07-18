'use client';

import Link from 'next/link';
import { Truck, Flame, Settings, Instagram, LibraryBig, Palette } from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';
import { CartIndicator } from '@/components/Cart/CartIndicator';
import { useCart } from '@/context/CartContext';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';


export default function Header() {
  const { setIsCartOpen } = useCart();
  const pathname = usePathname();

  // Don't show header in admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="w-full">
      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between relative py-4 sm:py-6 px-4 max-w-[95%] mx-auto border-b border-white/5 mb-6">
        {/* Left: Logo */}
        <div className="flex-1 flex justify-start">
          <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
            <img
              src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
              alt="Franga Toys Logo"
              className="h-16 md:h-20 object-contain"
            />
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex items-center gap-8 justify-center">
          <Link
            href="/rastreio"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/rastreio' ? "text-orange-400" : "text-zinc-400 hover:text-orange-400"
            )}
            title="Rastrear meu Pedido"
          >
            <Truck size={16} className="group-hover:animate-bounce" />
            <span className="hidden lg:inline">Rastrear</span>
          </Link>

          <div className="h-4 w-px bg-zinc-800/30 hidden md:block" />

          <Link
            href="/campanha"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/campanha' ? "text-purple-400" : "text-purple-500 hover:text-purple-400"
            )}
          >
            <Flame size={16} className="group-hover:animate-pulse" />
            <span className="hidden lg:inline">Promoções</span>
          </Link>

          <div className="h-4 w-px bg-zinc-800/30 hidden md:block" />

          <Link
            href="/parceiros"
            className={clsx(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group whitespace-nowrap",
              pathname === '/parceiros'
                ? "text-blue-500"
                : "text-zinc-400 hover:text-blue-500"
            )}
          >
            <Palette
              size={16}
              className={clsx(
                pathname === '/parceiros'
                  ? "text-blue-500"
                  : "group-hover:text-blue-500"
              )}
            />
            <span className="hidden lg:inline">Estúdios</span>
          </Link>
        </div>

        {/* Right Menu / Utilities */}
        <div className="flex-1 flex items-center justify-end gap-4 md:gap-6">
          <a
            href="https://www.instagram.com/frangatoys/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-zinc-500 hover:text-pink-500 transition-colors"
            title="Siga no Instagram"
          >
            <Instagram size={18} />
          </a>

          <div className="h-4 w-px bg-zinc-800/50" />

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <CartIndicator
              onClick={() => setIsCartOpen(true)}
              className="hover:bg-zinc-900/10 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg"
            />
            <Link
              href="/admin"
              className="p-2 text-zinc-500 hover:text-orange-500 transition-colors"
              title="Acessar Admin"
            >
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Header (Brand Only) - Filters component handles the rest of the mobile bar */}
      <div className="flex sm:hidden items-center justify-between px-4 py-2 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--card-border)] sticky top-0 z-30">
        <div className="flex-1 flex justify-start items-center gap-3">
          <CartIndicator onClick={() => setIsCartOpen(true)} />
          <Link href="/rastreio" className="p-1 text-orange-500" title="Rastrear Pedido">
            <Truck size={20} />
          </Link>
          <Link href="/campanha" className="p-1 text-purple-500" title="Campanha Especial">
            <Flame size={20} />
          </Link>
        </div>
        <Link href="/" className="flex-shrink-0 flex justify-center">
          <img
            src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
            alt="Logo"
            className="h-10 object-contain"
          />
        </Link>
        <div className="flex-1 flex justify-end items-center gap-3">
          <a href="https://www.instagram.com/frangatoys/" target="_blank" rel="noopener noreferrer" className="p-1 text-pink-500">
            <Instagram size={18} />
          </a>
          <ThemeToggle />
          <Link href="/admin" className="p-1 text-[var(--text-muted)] hover:text-orange-500">
            <Settings size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
