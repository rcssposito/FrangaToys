'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Instagram, Mail, MessageSquare, Truck, Flame, Palette, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Don't show footer in admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const cnpj = process.env.NEXT_PUBLIC_CNPJ || '67.566.499/0001-70';
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511988781670';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20as%20figures%20personalizadas.`;

  return (
    <footer className="w-full border-t border-zinc-200/50 dark:border-zinc-800/50 bg-[var(--background)] mt-16 transition-colors duration-500">
      <div className="max-w-[95%] mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-5 flex flex-col gap-4">
            <Link href="/" className="hover:opacity-80 transition-opacity self-start">
              <img
                src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                alt="Franga Toys Logo"
                className="h-14 md:h-16 object-contain dark:brightness-100 brightness-95"
              />
            </Link>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mt-2">
              Ateliê de Impressão 3D e Pintura de Colecionáveis de Alto Padrão. Figures e estátuas personalizadas sob encomenda, pintadas à mão com atenção máxima aos detalhes.
            </p>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-500/10 self-start px-3 py-1 rounded">
              <ShieldCheck size={14} />
              <span>Compra Segura & Entrega Garantida</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="col-span-1 md:col-span-3 flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-200">
              Navegação
            </h4>
            <nav className="flex flex-col gap-3">
              <Link
                href="/rastreio"
                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-2"
              >
                <Truck size={14} />
                Rastrear Pedido
              </Link>
              <Link
                href="/campanha"
                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-purple-500 transition-colors flex items-center gap-2"
              >
                <Flame size={14} />
                Promoções Especiais
              </Link>
              <Link
                href="/parceiros"
                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-blue-500 transition-colors flex items-center gap-2"
              >
                <Palette size={14} />
                Estúdios Parceiros
              </Link>
            </nav>
          </div>

          {/* Contact & Social Column */}
          <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-200">
              Contato & Redes Sociais
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 transition-colors flex items-center gap-2 self-start"
              >
                <MessageSquare size={14} className="text-emerald-500" />
                WhatsApp: (11) 98878-1670
              </a>
              <a
                href="mailto:contato@frangatoys.com.br"
                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-2 self-start"
              >
                <Mail size={14} />
                contato@frangatoys.com.br
              </a>
              <a
                href="https://www.instagram.com/frangatoys/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-pink-500 transition-colors flex items-center gap-2 self-start"
              >
                <Instagram size={14} className="text-pink-500" />
                @frangatoys no Instagram
              </a>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800/60 my-8 md:my-10" />

        {/* Bottom Legal / Copyright Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] md:text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Franga Toys – Ateliê de Impressão 3D e Pintura de Colecionáveis
            </p>
            <p className="text-[10px] md:text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              CNPJ: {cnpj} | São Paulo - SP
            </p>
          </div>
          
          <div className="flex flex-col md:flex-end gap-1 items-center md:items-end">
            <p className="text-[10px] md:text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold flex items-center gap-1">
              <span>© {currentYear} Franga Toys. Todos os direitos reservados.</span>
            </p>
            <p className="text-[9px] text-zinc-400 dark:text-zinc-500/80 flex items-center gap-1">
              <span>Feito com</span>
              <Heart size={8} className="text-red-500 fill-red-500" />
              <span>para colecionadores</span>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}
