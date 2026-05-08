'use client';

import Link from 'next/link';
import { Truck, Flame, Settings } from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';
import { CartIndicator } from '@/components/Cart/CartIndicator';
import { useCart } from '@/context/CartContext';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

export default function Header() {
  const { setIsCartOpen } = useCart();
  const pathname = usePathname();

  // Don't show header in admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="w-full">
      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-center relative py-4 sm:py-8 px-4 max-w-[95%] mx-auto">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <img
            src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
            alt="Franga Toys Logo"
            className="h-24 md:h-32 object-contain"
          />
        </Link>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4 md:gap-6">
          <Link 
            href="/rastreio" 
            className={clsx(
                "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group",
                pathname === '/rastreio' ? "text-orange-400" : "text-orange-500 hover:text-orange-400"
            )}
            title="Rastrear meu Pedido"
          >
            <Truck size={18} className="group-hover:animate-bounce" />
            <span className="hidden lg:inline">Rastrear</span>
          </Link>
          
          <div className="h-4 w-px bg-[var(--card-border)]" />
          
          <Link 
            href="/campanha" 
            className={clsx(
                "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group",
                pathname === '/campanha' ? "text-purple-400" : "text-purple-500 hover:text-purple-400"
            )}
          >
            <Flame size={18} className="group-hover:animate-pulse" />
            <span className="hidden lg:inline">Campanha</span>
          </Link>
          
          <div className="h-4 w-px bg-[var(--card-border)]" />
          
          <Link 
            href="/parceiros" 
            className={clsx(
                "text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group",
                pathname === '/parceiros' ? "text-blue-500" : "text-[var(--text-muted)] hover:text-blue-500"
            )}
          >
            <div className={clsx(
                "w-1.5 h-1.5 rounded-full bg-blue-500",
                pathname === '/parceiros' ? "animate-none" : "group-hover:animate-ping"
            )} />
            <span className="hidden lg:inline">Parceiros</span>
          </Link>
          
          <div className="h-4 w-px bg-[var(--card-border)]" />
          
          <ThemeToggle />
          
          <CartIndicator 
            onClick={() => setIsCartOpen(true)} 
            className="hover:bg-zinc-900/10 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg" 
          />
          
          <Link
            href="/admin/figures"
            className="p-2 text-[var(--text-muted)] hover:text-orange-500 transition-colors"
            title="Acessar Admin"
          >
            <Settings size={20} />
          </Link>
        </div>
      </div>

      {/* Mobile Header (Brand Only) - Filters component handles the rest of the mobile bar */}
      <div className="flex sm:hidden items-center justify-between px-4 py-2 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--card-border)] sticky top-0 z-30">
        <div className="w-16 flex justify-start items-center gap-2">
            <CartIndicator onClick={() => setIsCartOpen(true)} />
            <Link href="/rastreio" className="p-1 text-orange-500" title="Rastrear Pedido">
                <Truck size={20} />
            </Link>
            <Link href="/campanha" className="p-1 text-purple-500" title="Campanha Especial">
                <Flame size={20} />
            </Link>
        </div>
        <Link href="/" className="flex-1 flex justify-center">
            <img
                src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                alt="Logo"
                className="h-12 object-contain"
            />
        </Link>
        <div className="w-16 flex justify-end items-center gap-2">
            <ThemeToggle />
            <Link href="/admin/figures" className="p-1 text-[var(--text-muted)] hover:text-orange-500">
                <Settings size={18} />
            </Link>
        </div>
      </div>
    </header>
  );
}
