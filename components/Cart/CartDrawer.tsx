'use client';

import { X, Trash2, Send, ChevronLeft, User, Phone, MessageSquare, ChevronRight, Truck, MapPin, CreditCard, QrCode, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CartDrawerProps {
}

export const CartDrawer = () => {
    const { items, removeFromCart, updateQuantity, updateFinish, clearCart, totalItems, isCartOpen: isOpen, setIsCartOpen } = useCart();
    
    const onClose = () => setIsCartOpen(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [step, setStep] = useState<'cart' | 'shipping' | 'payment' | 'checkout'>('cart');
    const [nome, setNome] = useState('');
    const [contato, setContato] = useState('');
    const [observacoes, setObservacoes] = useState('');
    
    // Coupon States
    const [cupomCodigo, setCupomCodigo] = useState('');
    const [cupomAplicado, setCupomAplicado] = useState<any>(null);
    const [cupomErro, setCupomErro] = useState('');
    const [isValidatingCupom, setIsValidatingCupom] = useState(false);
    
    // Shipping States
    const [metodoEntrega, setMetodoEntrega] = useState<'retirada' | 'envio'>('retirada');
    const [cep, setCep] = useState('');
    const [isCalculatingFrete, setIsCalculatingFrete] = useState(false);
    const [freteOptions, setFreteOptions] = useState<any[]>([]);
    const [selectedFrete, setSelectedFrete] = useState<any | null>(null);

    // Payment States
    const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'card'>('pix');
    const [isProcessing, setIsProcessing] = useState(false);

    // Salesperson selection state
    const [vendedores, setVendedores] = useState<{ id: number; nome: string; telefone: string }[]>([]);
    const [selectedVendedorId, setSelectedVendedorId] = useState<number | ''>('');

    // Fetch active salespeople when opening checkout step
    useEffect(() => {
        if (step === 'checkout') {
            fetch('/api/admin/users')
                .then(res => res.json())
                .then((data: any[]) => {
                    const salesForce = data.filter(u =>
                        u.telefone &&
                        (u.roles?.includes('sales') || u.roles?.includes('admin'))
                    );
                    setVendedores(salesForce);
                })
                .catch(err => console.error('Error fetching salespeople:', err));
        }
    }, [step]);

    const [hasSentLead, setHasSentLead] = useState(false);
    
    // Send lead notification when contact info is filled
    useEffect(() => {
        if (nome.length > 3 && contato.length >= 10 && !hasSentLead && step === 'checkout') {
            const timer = setTimeout(() => {
                fetch('/api/public/lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        nome, 
                        contato, 
                        itemsCount: items.length,
                        total: calculateTotal()
                    })
                });
                setHasSentLead(true);
            }, 2000); // Wait 2s to make sure they finished typing
            return () => clearTimeout(timer);
        }
    }, [nome, contato, step, hasSentLead, items.length]);

    // Reset step when closed
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep('cart');
                setSelectedVendedorId('');
                setHasSentLead(false);
            }, 300);
        }
    }, [isOpen]);

    // Close on click outside - Removed global listener to avoid conflicts with other modals
    // useEffect(() => {
    //     const handleClick = (e: MouseEvent) => {
    //         if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
    //             onClose();
    //         }
    //     };
    //     if (isOpen) document.addEventListener('mousedown', handleClick);
    //     return () => document.removeEventListener('mousedown', handleClick);
    // }, [isOpen, onClose]);

    const formatPrice = (val?: number) => {
        if (val === undefined || val === null) return 'Sob consulta';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getItemPrice = (item: any) => {
        const finishKey = item.finish || 'estilizado';
        const isPix = metodoPagamento === 'pix';
        const priceKey = isPix ? `pix_${finishKey}` : finishKey;
        return item.precos?.[priceKey] || item.precos?.[finishKey] || 0;
    };

    const calculateSubtotal = () => {
        return items.reduce((acc, item) => {
            return acc + (getItemPrice(item) * (item.quantity || 1));
        }, 0);
    };

    const calculateDesconto = () => {
        if (!cupomAplicado) return 0;
        
        let totalElegivel = 0;
        items.forEach(item => {
            const isCampanha = (item as any).is_campanha || (item as any).is_campanha_active;
            const isSerieEligible = !cupomAplicado.serie_id || item.serie_id === cupomAplicado.serie_id;
            if (!isCampanha && isSerieEligible) {
                totalElegivel += getItemPrice(item) * (item.quantity || 1);
            }
        });

        if (totalElegivel === 0) return 0;

        // Verify minimum value condition dynamically
        if (cupomAplicado.valor_minimo && totalElegivel < cupomAplicado.valor_minimo) {
            return 0;
        }

        if (cupomAplicado.tipo === 'porcentagem') {
            let desconto = totalElegivel * (cupomAplicado.valor / 100);
            if (cupomAplicado.desconto_maximo) {
                desconto = Math.min(desconto, cupomAplicado.desconto_maximo);
            }
            return desconto;
        } else {
            return Math.min(cupomAplicado.valor, totalElegivel);
        }
    };

    const calculateTotal = () => {
        let total = calculateSubtotal() - calculateDesconto();
        if (metodoEntrega === 'envio' && selectedFrete) {
            total += Number(selectedFrete.Valor);
        }
        return Math.max(0, total); // Ensure total is never negative
    };

    const getFinishLabel = (finish: string) => {
        switch (finish) {
            case 'colorido': return 'Colorido';
            default: return 'Sem Pintura';
        }
    };

    const handleFetchShipping = async () => {
        if (cep.length < 8) {
            toast.error('Informe um CEP válido');
            return;
        }

        setIsCalculatingFrete(true);
        try {
            // Geolocalização no cliente (browser) para evitar erro 429 de IP compartilhado na nuvem
            let destLat: number | undefined;
            let destLng: number | undefined;
            try {
                const cleanCep = cep.replace(/\D/g, '');
                const geoRes = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`);
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData.lat && geoData.lng) {
                        destLat = parseFloat(geoData.lat);
                        destLng = parseFloat(geoData.lng);
                    }
                }
            } catch (geoErr) {
                console.error('Erro de geolocalização no cliente:', geoErr);
            }

            const res = await fetch('/api/public/shipping/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sCepDestino: cep,
                    destLat,
                    destLng
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setFreteOptions(data);
            if (data.length > 0) setSelectedFrete(data[0]);
        } catch (error: any) {
            console.error('--- SHIPPING API ERROR ---');
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
            toast.error(error.message || 'Erro ao consultar frete');
        } finally {
            setIsCalculatingFrete(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!cupomCodigo.trim()) return;
        setIsValidatingCupom(true);
        setCupomErro('');
        try {
            const res = await fetch('/api/public/checkout/coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: cupomCodigo })
            });
            const data = await res.json();
            if (data.error) {
                setCupomErro(data.error);
                setCupomAplicado(null);
            } else {
                const cupom = data.cupom;
                
                // Validação imediata no frontend
                if (cupom.serie_id) {
                    const requiredSerieId = cupom.serie_id;
                    const requiredSerieNome = cupom.serie_nome || 'série específica';
                    
                    const itemsInSeries = items.filter(item => item.serie_id === requiredSerieId);
                    if (itemsInSeries.length === 0) {
                        setCupomErro(`Este cupom é válido apenas para produtos da série ${requiredSerieNome}.`);
                        setCupomAplicado(null);
                        return;
                    }
                    
                    const eligibleItemsInSeries = itemsInSeries.filter(item => {
                        const isCampanha = (item as any).is_campanha || (item as any).is_campanha_active;
                        return !isCampanha;
                    });
                    if (eligibleItemsInSeries.length === 0) {
                        setCupomErro(`Os produtos da série ${requiredSerieNome} no carrinho já estão em promoção e não aceitam cupom.`);
                        setCupomAplicado(null);
                        return;
                    }
                }

                let totalElegivelAtual = 0;
                items.forEach(item => { 
                    const isCampanha = (item as any).is_campanha || (item as any).is_campanha_active;
                    const isSerieEligible = !cupom.serie_id || item.serie_id === cupom.serie_id;
                    if (!isCampanha && isSerieEligible) {
                        totalElegivelAtual += getItemPrice(item) * (item.quantity || 1); 
                    }
                });

                if (totalElegivelAtual === 0) {
                    setCupomErro('Nenhum produto no carrinho é elegível para este cupom (produtos em promoção não aceitam cupom).');
                    setCupomAplicado(null);
                } else if (cupom.valor_minimo && totalElegivelAtual < cupom.valor_minimo) {
                    setCupomErro(`Este cupom exige compras acima de R$ ${cupom.valor_minimo.toFixed(2)} em produtos elegíveis.`);
                    setCupomAplicado(null);
                } else {
                    setCupomAplicado(cupom);
                    setCupomErro('');
                    toast.success(`Cupom ${cupom.codigo} aplicado!`);
                }
            }
        } catch (error: any) {
            setCupomErro('Erro ao validar cupom');
        } finally {
            setIsValidatingCupom(false);
        }
    };
    
    const handleRemoveCoupon = () => {
        setCupomAplicado(null);
        setCupomCodigo('');
        setCupomErro('');
    };

    const handleCheckout = async () => {
        if (items.length === 0) return;
        if (!nome || !contato) {
            toast.error('Preencha seu nome e contato!');
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch('/api/public/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(i => ({
                        id: i.id,
                        nome: i.nome,
                        quantity: i.quantity,
                        finish: i.finish,
                        price: getItemPrice(i)
                    })),
                    cliente_nome: nome,
                    cliente_contato: contato,
                    metodo_entrega: metodoEntrega,
                    valor_frete: metodoEntrega === 'envio' ? selectedFrete?.Valor : 0,
                    metodo_pagamento: metodoPagamento,
                    observacoes,
                    vendedor_id: selectedVendedorId,
                    cupom_codigo: cupomAplicado?.codigo
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast.success('Pedido registrado com sucesso!');
            clearCart();
            onClose();

            if (data.payment_url) {
                window.location.href = data.payment_url;
            } else {
                router.push(`/checkout/success?token=${data.access_token}`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar pedido');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] cursor-pointer"
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={drawerRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-[#09090b] border-l border-zinc-800 shadow-2xl z-[70] flex flex-col transition-all duration-300"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-black/20">
                            {step === 'cart' ? (
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                        Seu Carrinho
                                    </h2>
                                    <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase mt-0.5">
                                        {totalItems} {totalItems === 1 ? 'item' : 'itens'} adicionados
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setStep('cart')}
                                        className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors active:scale-95"
                                    >
                                        <ChevronLeft size={20} strokeWidth={2.5} />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                            Finalizar Pedido
                                        </h2>
                                        <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase mt-0.5">
                                            Dados para contato
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="p-2.5 bg-zinc-900 hover:text-white rounded-xl text-zinc-500 border border-zinc-800 transition-all active:scale-90"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar relative overflow-x-hidden">
                            <AnimatePresence mode="wait">
                                {step === 'cart' ? (
                                    <motion.div
                                        key="cart-step"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        {items.length === 0 ? (
                                            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-zinc-600 gap-4">
                                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                                                    <Trash2 size={32} className="text-zinc-600" strokeWidth={1.5} />
                                                </div>
                                                <p className="font-bold tracking-tight text-sm uppercase tracking-widest">Carrinho vazio</p>
                                            </div>
                                        ) : (
                                            items.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="flex flex-col gap-3 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 shadow-sm group hover:border-blue-500/20 transition-all"
                                                >
                                                    <div className="flex gap-4">
                                                        <div className="relative w-16 h-16 bg-black border border-zinc-800 rounded-2xl flex-shrink-0 overflow-hidden shadow-inner group-hover:border-blue-500/10 transition-colors">
                                                            <Image
                                                                loader={imageKitLoader}
                                                                src={getOptimizedImageUrl(item.imagem_url)}
                                                                alt={item.nome}
                                                                fill
                                                                className="object-contain p-1"
                                                                sizes="64px"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-black text-white truncate text-sm leading-tight tracking-tight">{item.nome}</h3>
                                                                        {((item as any).is_campanha || (item as any).is_campanha_active) && (
                                                                            <span className="flex-shrink-0 bg-purple-600 text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter text-white animate-pulse">
                                                                                Oferta
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                                                                        {item.studio}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => removeFromCart(item.id)}
                                                                    className="p-1.5 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800/50 mt-1">
                                                        <div className="flex items-center justify-between">
                                                             <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Acabamento</span>
                                                                <select
                                                                    value={item.finish || 'estilizado'}
                                                                    onChange={(e) => updateFinish(item.id, e.target.value as any)}
                                                                    className="text-[10px] font-black bg-black border border-zinc-800 text-white rounded-full py-1 px-3 outline-none focus:border-blue-500/50 shadow-sm cursor-pointer hover:border-blue-500/30 transition-colors uppercase tracking-tighter"
                                                                >
                                                                    <option value="estilizado">Sem Pintura</option>
                                                                    <option value="colorido">Colorido</option>
                                                                </select>
                                                            </div>
                                                            <div className="text-right">
                                                                {((item as any).is_campanha || (item as any).is_campanha_active) && (
                                                                    <div className="text-[7px] font-black text-purple-400 uppercase tracking-widest mb-0.5">
                                                                        Preço de Campanha 🔥
                                                                    </div>
                                                                )}
                                                                <div className="text-xs font-black text-white tracking-tighter">
                                                                    {formatPrice(getItemPrice(item))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Quantidade</span>
                                                                <div className="flex items-center bg-black border border-zinc-800 rounded-full shadow-sm overflow-hidden h-7">
                                                                    <button
                                                                        onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                                                                        className="w-7 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors active:bg-zinc-700 text-sm leading-none"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="w-8 h-full flex items-center justify-center text-[10px] font-black text-white border-x border-zinc-800">
                                                                        {item.quantity || 1}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                                                        className="w-7 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors active:bg-zinc-700 text-sm leading-none"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </motion.div>
                                ) : step === 'shipping' ? (
                                    <motion.div
                                        key="shipping-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setMetodoEntrega('retirada')}
                                                className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all ${metodoEntrega === 'retirada' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                            >
                                                <MapPin size={24} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Retirada</span>
                                            </button>
                                            <button
                                                onClick={() => setMetodoEntrega('envio')}
                                                className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all ${metodoEntrega === 'envio' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                            >
                                                <Truck size={24} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Envio</span>
                                            </button>
                                        </div>

                                        {metodoEntrega === 'retirada' ? (
                                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-3">
                                                <h4 className="text-xs font-black text-white uppercase tracking-widest">Ateliê Franga Toys</h4>
                                                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                                    Rua Catanduvas do Sul - Jardim Primavera<br />
                                                    São Paulo - SP
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={cep}
                                                        onChange={(e) => setCep(e.target.value.replace(/\D/g, '').substring(0, 8))}
                                                        placeholder="CEP de Destino"
                                                        className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                                    />
                                                    <button
                                                        onClick={handleFetchShipping}
                                                        disabled={isCalculatingFrete || cep.length < 8}
                                                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white px-6 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center"
                                                    >
                                                        {isCalculatingFrete ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    {freteOptions.map((opt, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedFrete(opt)}
                                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedFrete?.Codigo === opt.Codigo ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
                                                        >
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-black text-white uppercase tracking-tight">{opt.Empresa} - {opt.Nome}</p>
                                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                                                    {opt.PrazoEntrega === 0 
                                                                        ? 'Retirada sob agendamento' 
                                                                        : `Prazo: ${opt.PrazoEntrega} ${opt.PrazoEntrega === 1 ? 'dia' : 'dias'}`}
                                                                </p>
                                                            </div>
                                                            <span className="text-xs font-black text-white">{formatPrice(opt.Valor)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : step === 'payment' ? (
                                    <motion.div
                                        key="payment-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setMetodoPagamento('pix')}
                                                className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all ${metodoPagamento === 'pix' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                            >
                                                <QrCode size={24} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">PIX (Desconto)</span>
                                            </button>
                                            <button
                                                onClick={() => setMetodoPagamento('card')}
                                                className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all ${metodoPagamento === 'card' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                            >
                                                <CreditCard size={24} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Cartão de Crédito (Até 12x)</span>
                                            </button>
                                        </div>

                                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-3">
                                            {metodoPagamento === 'pix' ? (
                                                <>
                                                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Pagamento via PIX</h4>
                                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                                        O valor exibido já inclui o desconto de pagamento à vista. Após finalizar, você receberá a chave PIX para pagamento.
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Cartão de Crédito</h4>
                                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                                        Pagamento processado via Mercado Pago. Aceitamos todas as bandeiras em até 12x.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="checkout-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-6 pt-2"
                                    >
                                        <div className="space-y-4">
                                            <div className="space-y-2 focus-within:text-blue-500 transition-colors">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ml-1 text-zinc-600">
                                                    <User size={12} /> Seu Nome
                                                </label>
                                                <input
                                                    type="text"
                                                    value={nome}
                                                    onChange={(e) => setNome(e.target.value)}
                                                    placeholder="Como gosta de ser chamado"
                                                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                                />
                                            </div>

                                            <div className="space-y-2 focus-within:text-blue-500 transition-colors">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ml-1 text-zinc-600">
                                                    <Phone size={12} /> WhatsApp (com DDD)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={contato}
                                                    onChange={(e) => setContato(e.target.value.replace(/\D/g, ''))}
                                                    placeholder="11999999999"
                                                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                                />
                                            </div>

                                            <div className="space-y-2 focus-within:text-blue-500 transition-colors">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ml-1 text-zinc-600">
                                                    <User size={12} /> Consultor (Opcional)
                                                </label>
                                                <div className="relative">
                                                     <select
                                                        value={selectedVendedorId}
                                                        onChange={(e) => setSelectedVendedorId(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold appearance-none text-sm cursor-pointer"
                                                    >
                                                        <option value="">Atendimento Geral</option>
                                                        {vendedores.map(v => (
                                                            <option key={v.id} value={v.id}>{v.nome}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2 focus-within:text-blue-500 transition-colors">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ml-1 text-zinc-600">
                                                    <MessageSquare size={12} /> Observações
                                                </label>
                                                <textarea
                                                    value={observacoes}
                                                    onChange={(e) => setObservacoes(e.target.value)}
                                                    placeholder="Algum detalhe específico?"
                                                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 min-h-[100px] resize-none text-sm"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="p-6 border-t border-zinc-800 bg-black/40 backdrop-blur-md space-y-4">
                                {step === 'cart' && (
                                    <div className="space-y-2 mb-2">
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Cupom de Desconto" 
                                                value={cupomCodigo}
                                                onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                                                disabled={!!cupomAplicado}
                                                className="flex-1 bg-black border border-zinc-800 text-white rounded-xl px-4 py-2 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 text-xs uppercase"
                                            />
                                            {!cupomAplicado ? (
                                                <button 
                                                    onClick={handleApplyCoupon}
                                                    disabled={isValidatingCupom || !cupomCodigo.trim()}
                                                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-4 rounded-xl font-black transition-all text-xs"
                                                >
                                                    {isValidatingCupom ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar'}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={handleRemoveCoupon}
                                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 rounded-xl font-black transition-all text-xs"
                                                >
                                                    Remover
                                                </button>
                                            )}
                                        </div>
                                        {cupomErro && <p className="text-red-500 text-[9px] font-bold uppercase tracking-widest px-1">{cupomErro}</p>}
                                        {cupomAplicado && (
                                            <p className={`${calculateDesconto() === 0 ? 'text-red-500' : 'text-emerald-500'} text-[9px] font-bold uppercase tracking-widest px-1`}>
                                                {calculateDesconto() === 0 ? (
                                                    `Cupom ${cupomAplicado.codigo} aplicado, mas os requisitos de valor mínimo ou elegibilidade de série não foram atendidos.`
                                                ) : (
                                                    <>
                                                        Cupom {cupomAplicado.codigo} aplicado! 
                                                        {items.some(i => (i as any).is_campanha || (i as any).is_campanha_active) && ' (Itens em campanha não recebem desconto)'}
                                                    </>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between items-center text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(calculateSubtotal())}</span>
                                    </div>
                                    {cupomAplicado && calculateDesconto() > 0 && (
                                        <div className="flex justify-between items-center text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                            <span>Desconto ({cupomAplicado.codigo})</span>
                                            <span>- {formatPrice(calculateDesconto())}</span>
                                        </div>
                                    )}
                                    {metodoEntrega === 'envio' && selectedFrete && (
                                        <div className="flex justify-between items-center text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                            <span>Frete ({selectedFrete.Empresa})</span>
                                            <span>{formatPrice(selectedFrete.Valor)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-white text-sm font-black uppercase tracking-widest border-t border-zinc-800 pt-2">
                                        <span>Total</span>
                                        <span className="text-orange-500">{formatPrice(calculateTotal())}</span>
                                    </div>
                                </div>

                                {step === 'cart' ? (
                                    <>
                                        <button
                                            onClick={() => setStep('shipping')}
                                            className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] text-xs hover:bg-orange-500 hover:text-white"
                                        >
                                            Escolher Entrega <ChevronRight size={16} />
                                        </button>
                                        <button
                                            onClick={clearCart}
                                            className="w-full py-1 text-[9px] text-zinc-700 hover:text-red-500 font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                                        >
                                            Limpar lista
                                        </button>
                                    </>
                                ) : step === 'shipping' ? (
                                    <button
                                        onClick={() => setStep('payment')}
                                        disabled={metodoEntrega === 'envio' && !selectedFrete}
                                        className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] text-xs hover:bg-blue-500 hover:text-white disabled:bg-zinc-800 disabled:text-zinc-600"
                                    >
                                        Escolher Pagamento <ChevronRight size={16} />
                                    </button>
                                ) : step === 'payment' ? (
                                    <button
                                        onClick={() => setStep('checkout')}
                                        className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] text-xs hover:bg-emerald-500 hover:text-white"
                                    >
                                        Seus Dados <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={!nome || !contato || isProcessing}
                                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_15px_40px_rgba(234,88,12,0.2)] active:scale-[0.98] text-xs"
                                    >
                                        {isProcessing ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <>
                                                {metodoPagamento === 'card' ? <CreditCard size={18} /> : <QrCode size={18} />}
                                                Finalizar Compra
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
