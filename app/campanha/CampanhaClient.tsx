'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Tag, Flame, MoveLeft, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import Header from '@/components/common/Header';

export default function CampanhaClient() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatPrice = (val?: number) => {
    if (!val) return 'Sob consulta';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 group text-sm font-black uppercase tracking-widest"
        >
          <MoveLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para a Galeria
        </Link>

        {/* Banner */}
        <div className="relative w-full h-[300px] rounded-3xl overflow-hidden mb-12 bg-gradient-to-r from-purple-900 to-black flex flex-col items-center justify-center text-center border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <Sparkles size={48} className="text-purple-400 mb-4 animate-pulse" />
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300">
            Ofertas Especiais
          </h2>
          <p className="text-purple-300/80 mt-4 max-w-lg text-sm font-medium tracking-wide">
            Aproveite nossos descontos e condições especiais nessas peças selecionadas. Ofertas válidas enquanto durarem os estoques.
          </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {items.map((item) => (
                <div 
                key={item.id}
                className={clsx(
                  "group relative rounded-2xl border overflow-hidden transition-all duration-500",
                  item.disponivel 
                    ? "bg-zinc-900/40 border-white/5 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]"
                    : "bg-zinc-950/80 border-white/5 opacity-75 grayscale hover:grayscale-0"
                )}
                >
                <Link 
                  href={item.disponivel ? `/figura/${item.id}` : '#'}
                  onClick={(e) => !item.disponivel && e.preventDefault()}
                  className="block relative w-full aspect-[4/5] bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer"
                >
                    <div className="relative w-full h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                        <Sparkles className="text-zinc-700" size={40} />
                        </div>
                        <img 
                        src={item.imagem_url || '/icon.png'} 
                        alt={item.nome}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    </div>

                    <div className="absolute top-4 left-4 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                    <Tag size={12} />
                    OFERTA
                    </div>

                    {!item.disponivel && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-10">
                            <div className="bg-red-600 text-white font-black text-xl md:text-2xl uppercase tracking-[0.3em] px-8 py-3 rounded-xl shadow-2xl rotate-[-15deg] border-2 border-red-400/50">
                                ESGOTADO
                            </div>
                        </div>
                    )}
                </Link>

                <div className="p-3 sm:p-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-white mb-1 line-clamp-2 leading-tight">{item.nome}</h3>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-purple-400 font-black text-lg sm:text-xl">{formatPrice(item.precos?.pix_estilizado || 0)}</span>
                        </div>
                    </div>
                    
                    <Link
                      href={item.disponivel ? `/figura/${item.id}` : '#'}
                      onClick={(e) => !item.disponivel && e.preventDefault()}
                      className={clsx(
                        "w-full text-center text-[10px] sm:text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-colors duration-300 block",
                        item.disponivel 
                          ? "bg-white/5 hover:bg-purple-600 text-white" 
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed pointer-events-none"
                      )}
                    >
                      {item.disponivel ? "Fazer Orçamento" : "Indisponível"}
                    </Link>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
}
