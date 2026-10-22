'use client';

import { useState, useEffect } from 'react';
import { 
    PackageOpen, RefreshCw, Loader2, DollarSign, Users, CheckCircle2, 
    AlertCircle, MessageCircle, Copy, Check, Tag, Clock, ArrowUpRight, 
    ChevronDown, ShoppingBag, Percent
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import imageKitLoader from '@/lib/image-loader';

interface CartItem {
    id: number;
    nome: string;
    imagem_url?: string;
    finish?: string;
    quantity?: number;
    preco?: number;
}

interface AbandonedCart {
    id: string;
    cliente_nome: string | null;
    cliente_contato: string;
    itens: CartItem[];
    itens_count: number;
    valor_total: number;
    cupom_gerado: string | null;
    resgatado: boolean;
    status: 'abandonado' | 'contatado' | 'recuperado';
    created_at: string;
    updated_at: string;
}

interface CartStats {
    totalCarts: number;
    totalValue: number;
    recoveredCount: number;
    contactedCount: number;
    recoveryRate: number;
}

export default function AbandonedCartsPage() {
    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [stats, setStats] = useState<CartStats>({
        totalCarts: 0,
        totalValue: 0,
        recoveredCount: 0,
        contactedCount: 0,
        recoveryRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [selectedDiscounts, setSelectedDiscounts] = useState<Record<string, number>>({});
    const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

    const formatBRL = (val?: number) => {
        if (!val) return 'R$ 0,00';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const fetchCarts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/abandoned-carts?status=${statusFilter}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao carregar carrinhos');
            setCarts(data.items || []);
            if (data.stats) setStats(data.stats);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao carregar carrinhos abandonados');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCarts();
    }, [statusFilter]);

    const handleGenerateRescueCoupon = async (cart: AbandonedCart) => {
        setGeneratingId(cart.id);
        const discountPct = selectedDiscounts[cart.id] || 5;

        try {
            const res = await fetch('/api/admin/abandoned-carts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartId: cart.id,
                    discountPct
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao gerar cupom');

            toast.success(`Cupom ${data.coupon} criado com validade de 24h! 🎟️`);

            // Atualiza estado local imediatamente
            setCarts(prev => prev.map(c => {
                if (c.id === cart.id) {
                    return { ...c, status: 'contatado', cupom_gerado: data.coupon };
                }
                return c;
            }));

            // Abre o WhatsApp em nova aba
            if (data.whatsappUrl) {
                window.open(data.whatsappUrl, '_blank');
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao gerar cupom de resgate');
        } finally {
            setGeneratingId(null);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPhone(id);
        toast.success('Telefone copiado!');
        setTimeout(() => setCopiedPhone(null), 2500);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-500/10 border border-orange-500/20 px-3 py-0.5 rounded-full">
                            Anti-Abandono & Resgate
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                        <PackageOpen className="text-orange-500" size={28} />
                        Carrinhos Abandonados
                    </h1>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                        Recupere vendas gerando cupons temporários de 24h e contatando clientes no WhatsApp.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCarts}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Total de Abandonos</span>
                        <ShoppingBag size={18} className="text-orange-500" />
                    </div>
                    <div className="text-2xl font-black text-white">{stats.totalCarts}</div>
                    <p className="text-[10px] text-zinc-500 mt-1">Leads que preencheram dados</p>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Valor em Aberto</span>
                        <DollarSign size={18} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-400">{formatBRL(stats.totalValue)}</div>
                    <p className="text-[10px] text-zinc-500 mt-1">Potencial bruto de recuperação</p>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Contatados</span>
                        <MessageCircle size={18} className="text-purple-400" />
                    </div>
                    <div className="text-2xl font-black text-purple-400">{stats.contactedCount}</div>
                    <p className="text-[10px] text-zinc-500 mt-1">Com cupom de 24h enviado</p>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Taxa de Resgate</span>
                        <CheckCircle2 size={18} className="text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black text-emerald-400">{stats.recoveryRate}%</div>
                    <p className="text-[10px] text-zinc-500 mt-1">{stats.recoveredCount} vendas recuperadas</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
                {[
                    { id: 'all', label: 'Todos os Carrinhos' },
                    { id: 'abandonado', label: 'Pendentes de Contato' },
                    { id: 'contatado', label: 'Cupom Enviado' },
                    { id: 'recuperado', label: 'Recuperados' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                            statusFilter === tab.id
                                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Carts List */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="animate-spin text-orange-500" />
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Carregando registros de carrinhos...
                    </p>
                </div>
            ) : carts.length === 0 ? (
                <div className="bg-zinc-950/60 border border-dashed border-zinc-850 rounded-3xl p-16 text-center space-y-3">
                    <PackageOpen size={40} className="mx-auto text-zinc-700" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">
                        Nenhum carrinho encontrado neste filtro
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Quando visitantes preencherem o checkout e não finalizarem, eles aparecerão aqui para resgate automático via WhatsApp.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {carts.map(cart => {
                        const isGenerating = generatingId === cart.id;
                        const discount = selectedDiscounts[cart.id] || 5;

                        return (
                            <div
                                key={cart.id}
                                className="bg-zinc-950/80 border border-zinc-850 rounded-3xl p-5 sm:p-6 shadow-xl hover:border-zinc-800 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                            >
                                {/* Left Info: Client & Timing */}
                                <div className="space-y-3 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h3 className="text-base font-black text-white">
                                            {cart.cliente_nome || 'Cliente Anônimo'}
                                        </h3>

                                        {/* Status Badge */}
                                        {cart.status === 'abandonado' && (
                                            <span className="bg-amber-950/50 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                <AlertCircle size={10} />
                                                Pendente de Resgate
                                            </span>
                                        )}
                                        {cart.status === 'contatado' && (
                                            <span className="bg-purple-950/50 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                <Tag size={10} />
                                                Cupom Enviado: {cart.cupom_gerado}
                                            </span>
                                        )}
                                        {cart.status === 'recuperado' && (
                                            <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                <CheckCircle2 size={10} />
                                                Venda Recuperada
                                            </span>
                                        )}

                                        <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                                            <Clock size={11} />
                                            {new Date(cart.created_at).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    {/* Contact Phone Row */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-mono text-zinc-300 font-bold bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                                            📱 {cart.cliente_contato}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(cart.cliente_contato, cart.id)}
                                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                                            title="Copiar telefone"
                                        >
                                            {copiedPhone === cart.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                        </button>
                                    </div>

                                    {/* Cart Items Preview */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {Array.isArray(cart.itens) && cart.itens.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-2.5 py-1 text-xs text-zinc-300"
                                            >
                                                {item.imagem_url ? (
                                                    <div className="w-6 h-6 rounded-md overflow-hidden relative border border-zinc-750 shrink-0">
                                                        <Image
                                                            loader={imageKitLoader}
                                                            src={item.imagem_url}
                                                            alt=""
                                                            fill
                                                            className="object-contain"
                                                            sizes="24px"
                                                        />
                                                    </div>
                                                ) : (
                                                    <ShoppingBag size={12} className="text-zinc-500" />
                                                )}
                                                <span className="font-bold text-white text-[11px] truncate max-w-[140px]">
                                                    {item.nome}
                                                </span>
                                                {item.finish && (
                                                    <span className="text-[9px] uppercase tracking-wider text-orange-400 font-black">
                                                        {item.finish}
                                                    </span>
                                                )}
                                                {item.quantity && item.quantity > 1 && (
                                                    <span className="text-[9px] text-zinc-400 font-bold">
                                                        x{item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Action Panel: Price & Rescue CTA */}
                                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-zinc-850 shrink-0">
                                    <div className="text-left sm:text-right lg:text-right">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                            Valor Total
                                        </span>
                                        <div className="text-xl font-black text-orange-400">
                                            {formatBRL(cart.valor_total)}
                                        </div>
                                    </div>

                                    {/* Action Button & Discount Selector */}
                                    {cart.status !== 'recuperado' && (
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {/* Discount Selector */}
                                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
                                                {[5, 10].map(pct => (
                                                    <button
                                                        key={pct}
                                                        type="button"
                                                        onClick={() => setSelectedDiscounts(prev => ({ ...prev, [cart.id]: pct }))}
                                                        className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                                            discount === pct
                                                                ? 'bg-orange-500 text-black shadow-sm'
                                                                : 'text-zinc-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {pct}%
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Main Rescue Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateRescueCoupon(cart)}
                                                disabled={isGenerating}
                                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Gerando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageCircle size={15} />
                                                        {cart.status === 'contatado' ? 'Reenviar Cupom' : 'Gerar Cupom 24h & WhatsApp'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {cart.status === 'recuperado' && (
                                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                                            <CheckCircle2 size={14} />
                                            Recuperado com Sucesso
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
