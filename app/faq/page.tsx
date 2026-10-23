'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, 
  ArrowLeft, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Package, 
  Clock, 
  Palette, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp, 
  Heart,
  Droplets,
  Sun,
  Flame,
  Zap,
  Box,
  ExternalLink
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface FaqItem {
  id: string;
  category: 'cuidados' | 'acabamentos' | 'envio' | 'prazos' | 'garantia';
  pergunta: string;
  resposta: string | React.ReactNode;
  destaque?: boolean;
}

const FAQ_DATA: FaqItem[] = [
  // Cuidados com a Peça
  {
    id: 'limpeza-dia-a-dia',
    category: 'cuidados',
    pergunta: 'Como limpar e tirar o pó do meu colecionável?',
    destaque: true,
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <p>
          A melhor maneira de manter sua peça impecável é usando um <strong className="text-white">pincel de maquiagem novo de cerdas ultrassuaves</strong> ou um espanador macio de microfibra, passando delicadamente sobre os relevos e frestas uma vez por semana.
        </p>
        <p>
          Para poeiras mais resistentes em peças com verniz protetor, você pode utilizar um pano de microfibra levemente umedecido em <strong className="text-white">água mineral fria</strong>, secando imediatamente sem esfregar com força.
        </p>
      </div>
    )
  },
  {
    id: 'produtos-proibidos',
    category: 'cuidados',
    pergunta: 'Quais produtos NUNCA devo passar na estátua?',
    destaque: true,
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-350 flex items-start gap-2.5 mb-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-red-350">PROIBIDO:</strong> Álcool (inclusive gel ou 70%), acetona, desengordurantes, lustra-móveis, solventes químicos ou qualquer sabão abrasivo.
          </span>
        </div>
        <p>
          O álcool e a acetona dissolvem instantaneamente as camadas de tinta acrílica e o verniz de proteção, podendo também fragilizar a estrutura molecular da resina fotopolímera.
        </p>
      </div>
    )
  },
  {
    id: 'sol-calor',
    category: 'cuidados',
    pergunta: 'A luz solar ou calor podem danificar a peça?',
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <p>
          <strong className="text-white">Sim!</strong> Evite expor seus colecionáveis à luz solar direta (próximo a janelas) ou a fontes intensas de calor (fontes de luz halógenas, gabinetes de computador muito quentes ou saídas de ar condicionado).
        </p>
        <p>
          A radiação UV do sol pode amarelar a resina com o passar dos anos e desbotar os pigmentos da pintura artesanal. O calor contínuo também pode amolecer partes muito finas (como pontas de espadas ou mechas finas de cabelo).
        </p>
      </div>
    )
  },

  // Acabamentos
  {
    id: 'sem-pintura-vs-colorido',
    category: 'acabamentos',
    pergunta: 'Qual a diferença entre "Sem Pintura" e "Colorido"?',
    destaque: true,
    resposta: (
      <div className="space-y-3 text-zinc-350 text-sm leading-relaxed">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Box size={14} /> Sem Pintura (Estilizado)
            </span>
            <p className="text-xs text-zinc-400">
              A peça é impressa na resina{' '}
              <a
                href="https://3dcure.com.br/produto/resina-3d-cure-acqua-art"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2 inline-flex items-center gap-0.5"
              >
                Acqua Art da 3dCure
                <ExternalLink size={12} className="shrink-0" />
              </a>
              , passa por limpeza ultra-sônica, cura UV interna e externa e aplicação de primer. É enviada montada ou em partes de encaixe, pronta para pintura.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Palette size={14} /> Colorido (Pintura de Estúdio)
            </span>
            <p className="text-xs text-zinc-350">
              Pintura 100% artesanal realizada em nosso ateliê com aerógrafo e pincel profissional. Inclui preparação de primer, sombreado profundo, highlights dinâmicos, texturização realista e acabamento com verniz fosco e acetinado de alta durabilidade.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'resina-qualidade',
    category: 'acabamentos',
    pergunta: 'Qual tipo de resina é utilizada na impressão?',
    resposta: (
      <div className="space-y-3 text-zinc-350 text-sm leading-relaxed">
        <p>
          Trabalhamos exclusivamente com a resina premium{' '}
          <a
            href="https://3dcure.com.br/produto/resina-3d-cure-acqua-art"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2 inline-flex items-center gap-1"
          >
            Acqua Art da 3D Cure
            <ExternalLink size={13} className="shrink-0" />
          </a>
          , referência nacional em insumos para colecionáveis e estatuetas de alta definição (resolução 8K/12K).
        </p>
        <p>
          A linha Acqua Art combina propriedades semiflexíveis e micro-detalhamento de estúdio, garantindo maior resistência mecânica contra quedas leves e impactos, além de capturar com extrema fidelidade texturas anatômicas, dobras de tecido, fios de cabelo e expressões faciais sem marcas de camadas.
        </p>
      </div>
    )
  },

  // Prazos & Produção
  {
    id: 'como-funciona-prazo',
    category: 'prazos',
    pergunta: 'Como funciona o prazo de produção sob demanda?',
    resposta: (
      <div className="space-y-3 text-zinc-350 text-sm leading-relaxed">
        <p>
          Por ser um processo 100% artesanal de alto padrão, cada estátua passa por uma esteira rigorosa:
        </p>
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300">
          Fila e Impressão • Cura, Lixamento & Ajuste de Encaixes • Pintura e Verniz • Secagem Completa & Embalagem
        </div>
        <p>
          O prazo médio total para envio é de <strong className="text-white">30 a 45 dias</strong> para encomendas, podendo ser acelerado caso o cliente apresente pedido para atender uma data específica.
        </p>
        <p className="text-xs text-zinc-400">
          Você pode acompanhar cada etapa com fotos e atualizações de status direto na nossa{' '}
          <Link href="/rastreio" className="text-orange-400 hover:underline font-bold">
            Área do Cliente
          </Link>.
        </p>
      </div>
    )
  },
  {
    id: 'pronta-entrega-envio',
    category: 'prazos',
    pergunta: 'O que significa a tag "⚡ Pronta Entrega (Envio em 24h)"?',
    destaque: true,
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <p>
          Peças marcadas com a tag <strong className="text-amber-400">⚡ Pronta Entrega</strong> já estão 100% impressas, curadas e prontas no estoque físico do ateliê.
        </p>
        <p>
          Assim que o pagamento for confirmado, realizamos a conferência, colocamos na embalagem e postamos na transportadora ou Correios em até <strong className="text-white">24 horas úteis</strong>!
        </p>
      </div>
    )
  },

  // Envio & Embalagem
  {
    id: 'embalagem-seguranca',
    category: 'envio',
    pergunta: 'Como as peças são embaladas para não quebrarem na viagem?',
    destaque: true,
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <p>
          A peça (ou suas partes) é bem envolvida em camadas de <strong className="text-white">plástico bolha</strong> e acomodada com proteção em uma <strong className="text-white">caixa de papelão</strong> bem lacrada com fita, garantindo que chegue protegida e firme até você.
        </p>
      </div>
    )
  },
  {
    id: 'rastreio-acompanhamento',
    category: 'envio',
    pergunta: 'Como recebo o código de rastreamento do envio?',
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <p>
          Assim que o pacote é despachado na agência, enviamos o código de rastreio oficial diretamente para o seu <strong className="text-white">WhatsApp</strong> e atualizamos o status do seu pedido.
        </p>
        <p>
          Você também pode consultar o status a qualquer momento inserindo seu telefone na <Link href="/rastreio" className="text-orange-400 hover:underline font-bold">Área do Cliente</Link>.
        </p>
      </div>
    )
  },

  // Garantia & Reposição
  {
    id: 'peca-quebrada-transporte',
    category: 'garantia',
    pergunta: 'E se a estátua chegar danificada pelo transporte?',
    destaque: true,
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 flex items-start gap-2.5 mb-2">
          <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">Garantia Total Franga Toys:</strong> Você nunca fica no prejuízo! Se houver qualquer avaria no trajeto, nós reimprimimos e reenviamos a peça sem custo algum.
          </span>
        </div>
        <p>
          Basta gravar um vídeo rápido abrindo a caixa no dia do recebimento (unboxing) e nos enviar pelo WhatsApp com fotos do dano. Nossa equipe avaliará e providenciará a reposição da parte avariada ou da figura completa com prioridade máxima.
        </p>
      </div>
    )
  },
  {
    id: 'pedidos-personalizados',
    category: 'garantia',
    pergunta: 'Vocês imprimem personagens que não estão no site?',
    resposta: (
      <div className="space-y-2 text-zinc-350 text-sm leading-relaxed">
        <p>
          <strong className="text-white">Com certeza, porém no limite do possível!</strong> Temos parceria com diversos estúdios de modelagem 3D do mundo e podemos avaliar projetos que você encontrou em suas buscas pela figure perfeita.
        </p>
        <p>
          Chame nosso ateliê no{' '}
          <a
            href="https://wa.me/5511988781670?text=Ol%C3%A1!%20Gostaria%20de%20um%20or%C3%A7amento%20personalizado."
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline font-bold"
          >
            WhatsApp
          </a>{' '}
          informando o personagem, tamanho desejado e acabamento para receber um orçamento exclusivo.
        </p>
      </div>
    )
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Todas as Dúvidas', icon: HelpCircle },
  { id: 'cuidados', label: 'Cuidados & Limpeza', icon: Sparkles },
  { id: 'acabamentos', label: 'Pintura & Resina', icon: Palette },
  { id: 'prazos', label: 'Prazos & Pronta Entrega', icon: Clock },
  { id: 'envio', label: 'Embalagem & Frete', icon: Package },
  { id: 'garantia', label: 'Garantia & Reposição', icon: ShieldCheck },
] as const;

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'limpeza-dia-a-dia': true,
    'produtos-proibidos': true,
    'sem-pintura-vs-colorido': true
  });

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFaq = useMemo(() => {
    return FAQ_DATA.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchQuestion = item.pergunta.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      return matchQuestion || matchId;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-orange-400 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar ao Acervo
          </Link>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <HelpCircle size={12} /> Central de Ajuda
          </span>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/60 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-inner">
            <Sparkles size={14} className="text-orange-400" />
            <span>Guia Oficial do Colecionador</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3">
            Como podemos <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">te ajudar?</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
            Tire todas as dúvidas sobre conservação de peças, pinturas, prazos de envio e a garantia blindada Franga Toys.
          </p>

          {/* Search Box */}
          <div className="relative mt-6 max-w-xl mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquise por: limpeza, álcool, prazo, quebrado, verniz..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 text-white placeholder:text-zinc-600 text-sm outline-none transition-all shadow-xl"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border shrink-0 cursor-pointer",
                  isActive
                    ? "bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20 scale-[1.02]"
                    : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <Icon size={14} className={isActive ? "text-white" : "text-orange-400"} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaq.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/20 border border-white/5 rounded-3xl">
              <HelpCircle size={40} className="mx-auto text-zinc-600 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Nenhum resultado encontrado</h3>
              <p className="text-xs text-zinc-500 mb-4">Não encontramos respostas para "{searchQuery}". Quer tirar sua dúvida diretamente?</p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}?text=${encodeURIComponent(`Olá! Tenho uma dúvida: ${searchQuery}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all"
              >
                <MessageCircle size={16} />
                Chamar no WhatsApp
              </a>
            </div>
          ) : (
            filteredFaq.map(item => {
              const isOpen = !!openItems[item.id];
              return (
                <div 
                  key={item.id}
                  className={clsx(
                    "rounded-2xl border transition-all duration-300 overflow-hidden",
                    isOpen 
                      ? "bg-zinc-900/50 border-orange-500/30 shadow-xl" 
                      : "bg-zinc-950/40 border-white/5 hover:border-white/15"
                  )}
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full p-4 md:p-5 flex items-center justify-between gap-4 text-left cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.destaque && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                      )}
                      <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
                        {item.pergunta}
                      </h3>
                    </div>
                    <div className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isOpen ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-zinc-500"
                    )}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="p-4 md:p-5 pt-0 border-t border-white/5">
                          {item.resposta}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-1">
              <Sparkles size={20} />
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Limpeza com Pincel</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Use apenas pincel de cerdas macias. Jamais utilize álcool ou produtos químicos que reagem com a pintura acrílica.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-1">
              <Package size={20} />
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Embalagem Blindada</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Caixa dupla reforçada, berço de espuma e multicamadas de plástico bolha para viagens 100% seguras.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Garantia Franga Toys</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Teve avaria no transporte? Sem burocracia: reposição imediata da sua peça sem qualquer custo adicional.
            </p>
          </div>
        </div>

        {/* Human Contact Banner */}
        <div className="mt-12 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-orange-500/15 via-zinc-900/60 to-zinc-900/40 border border-orange-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
              <MessageCircle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Não encontrou o que procurava?</h3>
              <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
                Nossos artesãos e equipe de suporte respondem direto no WhatsApp com rapidez e atenção.
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}?text=${encodeURIComponent('Olá! Estive no FAQ da Franga Toys e gostaria de tirar uma dúvida sobre colecionáveis.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-95 shrink-0"
          >
            <MessageCircle size={18} />
            Falar no WhatsApp
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
