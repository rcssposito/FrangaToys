'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, MoveLeft, Loader2 } from 'lucide-react';
import Header from '@/components/common/Header';
import { FigureCard } from '@/components/Gallery/FigureCard';
import { FiguraDTO } from '@/lib/dto';

export default function CampanhaClient() {
  const [items, setItems] = useState<FiguraDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch('/api/figuras?campanha=true&limit=50', {
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('Falha ao carregar');
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-500">
      <Header />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-24 sm:pb-12">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 group text-sm font-black uppercase tracking-widest"
        >
          <MoveLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para a Galeria
        </Link>

        {/* Compact Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
              <span className="text-purple-400">🔥</span> Ofertas Especiais
            </h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Peças em campanha com descontos especiais
            </p>
          </div>
        </div>

        {loading ? (
           <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin text-purple-500" size={48} />
           </div>
        ) : items.length === 0 ? (
           <div className="text-center py-20 text-zinc-500 font-bold uppercase tracking-widest border border-dashed border-zinc-800 rounded-3xl">
              Nenhuma peça em campanha no momento.
           </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {items.map((item, index) => (
                    <FigureCard key={item.id} figure={item} priority={index < 4} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
