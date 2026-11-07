'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Copy, QrCode, MessageSquare, ArrowRight, Package, Truck, MapPin, Check, ExternalLink, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { generatePixPayload } from '@/lib/pix';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pixPayload, setPixPayload] = useState('');
    const [copied, setCopied] = useState(false);
    const [qrLoaded, setQrLoaded] = useState(false);
    const [qrError, setQrError] = useState(false);

    useEffect(() => {
        if (!token) return;

        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/public/order?token=${token}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setOrder(data);

                // Generate PIX payload if it was a PIX order
                if (data.metodo_pagamento === 'pix' && !data.link_pagamento) {
                    const total = data.items.reduce((acc: number, item: any) => acc + (item.valor_venda_final || 0), 0) + (data.valor_frete || 0);
                    const payload = generatePixPayload("contato@frangatoys.com.br", "Bianca Machado Mastrocollo", total, data.checkout_id);
                    setPixPayload(payload);

                    if (data.checkout_id) {
                        fetch('/api/public/orders/notify-pix-copied', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ checkout_id: data.checkout_id, action: 'view' })
                        }).catch(() => {});
                    }
                }
            } catch (err: any) {
                toast.error('Erro ao carregar detalhes do pedido');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [token]);

    const copyPix = () => {
        if (!pixPayload) return;
        navigator.clipboard.writeText(pixPayload);
        setCopied(true);
        toast.success('Chave PIX copiada!');
        setTimeout(() => setCopied(false), 3000);

        if (order?.checkout_id) {
            fetch('/api/public/orders/notify-pix-copied', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkout_id: order.checkout_id, action: 'copy' })
            }).catch(() => {});
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Pedido não encontrado</h1>
                <Link href="/" className="text-orange-500 font-bold hover:underline">Voltar para a loja</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 flex justify-center items-start pt-12 md:pt-24">
            <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header Success */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 mb-2">
                        <CheckCircle2 size={48} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase">Pedido Recebido!</h1>
                    <p className="text-zinc-500 font-medium">Obrigado por comprar na Franga Toys. Seu pedido foi registrado com sucesso.</p>
                </div>

                {/* Order Info Card */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-zinc-800">
                        <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">ID do Pedido</p>
                            <h2 className="text-2xl font-black tracking-tight text-white">#{order.checkout_id}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Status</p>
                            <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                {order.status}
                            </span>
                        </div>
                    </div>

                    {/* Card Payment Section */}
                    {order.link_pagamento && (
                        <div className="mb-8">
                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-6 text-center space-y-4">
                                <div className="inline-flex items-center gap-2 text-orange-400 font-black uppercase tracking-widest text-xs">
                                    <CreditCard size={16} />
                                    <span>Pagamento via Cartão de Crédito</span>
                                </div>
                                <p className="text-xs text-zinc-400 font-medium max-w-md mx-auto">
                                    Caso a janela do Mercado Pago não tenha aberto automaticamente, clique no botão abaixo para concluir seu pagamento com segurança:
                                </p>
                                <a
                                    href={order.link_pagamento}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                >
                                    <ExternalLink size={16} strokeWidth={2.5} />
                                    Pagar Agora no Mercado Pago
                                </a>
                            </div>
                        </div>
                    )}

                    {/* PIX Section */}
                    {pixPayload && !order.link_pagamento && (
                        <div className="mb-8 space-y-6">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 text-center space-y-5">
                                <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                    <QrCode size={15} />
                                    Pagar via PIX
                                </h3>
                                
                                <div className="flex justify-center">
                                    <div className="bg-white p-3 rounded-2xl w-[184px] h-[184px] flex items-center justify-center relative shadow-xl">
                                        {!qrLoaded && !qrError && (
                                            <div className="absolute inset-3 rounded-xl bg-zinc-200 animate-pulse flex items-center justify-center">
                                                <QrCode size={32} className="text-zinc-400" />
                                            </div>
                                        )}
                                        {qrError ? (
                                            <div className="text-center p-2 space-y-1">
                                                <QrCode size={32} className="text-zinc-400 mx-auto" />
                                                <span className="block text-[10px] font-bold text-zinc-600 leading-tight">
                                                    Copie o código PIX no botão abaixo
                                                </span>
                                            </div>
                                        ) : (
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} 
                                                alt="PIX QR Code" 
                                                className={clsx("w-40 h-40 transition-opacity duration-300", qrLoaded ? "opacity-100" : "opacity-0")}
                                                onLoad={() => setQrLoaded(true)}
                                                onError={() => setQrError(true)}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs text-zinc-400 font-medium">Escaneie o QR Code ou copie o código Pix Copia e Cola abaixo:</p>
                                    <div 
                                        onClick={copyPix}
                                        title="Clique para copiar o código PIX"
                                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 p-3.5 rounded-2xl text-[10px] font-mono text-zinc-400 truncate cursor-pointer select-all transition-colors"
                                    >
                                        {pixPayload}
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={copyPix}
                                        className={clsx(
                                            "w-full py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer",
                                            copied
                                                ? "bg-emerald-400 text-black shadow-emerald-500/25"
                                                : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                                        )}
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={16} strokeWidth={3} />
                                                Código PIX Copiado!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copiar Código PIX
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Summary */}
                    <div className="space-y-4">
                        <h3 className="font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
                            <Package size={14} className="text-zinc-500" /> Resumo do Pedido
                        </h3>
                        <div className="space-y-3">
                            {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-zinc-200">{item.figuras?.nome || 'Item'}</span>
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{item.quantidade}x • {item.observacao?.split(']')[0].replace('[', '') || 'Padrão'}</span>
                                    </div>
                                    <span className="font-black text-zinc-400">R$ {(item.valor_venda_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-zinc-800 space-y-2">
                            <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-black tracking-widest">
                                <span>Subtotal</span>
                                <span>R$ {order.items.reduce((acc: number, i: any) => acc + (i.valor_venda_final || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-black tracking-widest">
                                <span className="flex items-center gap-2">
                                    {order.metodo_entrega === 'envio' ? <Truck size={12} /> : <MapPin size={12} />}
                                    Frete ({order.metodo_entrega === 'envio' ? 'Envio' : 'Retirada'})
                                </span>
                                <span>R$ {(order.valor_frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 text-xl font-black tracking-tighter">
                                <span>Total</span>
                                <span className="text-orange-500">R$ {(order.items.reduce((acc: number, i: any) => acc + (i.valor_venda_final || 0), 0) + (order.valor_frete || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {token && (
                        <Link
                            href={`/rastreio/${token}`}
                            className="w-full bg-orange-500 hover:bg-orange-400 text-black p-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                        >
                            <Package size={18} />
                            Acompanhar Meu Pedido & Nota Fiscal
                            <ArrowRight size={16} />
                        </Link>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button 
                            type="button"
                            onClick={() => {
                                const itemsStr = order.items.map((i: any) => `${i.quantidade}x ${i.figuras?.nome || 'Item'}`).join(', ');
                                const total = order.items.reduce((acc: number, item: any) => acc + (item.valor_venda_final || 0), 0) + (order.valor_frete || 0);
                                const trackingLink = `${window.location.origin}/rastreio/${token}`;
                                const msg = `Olá! Acabei de fazer o pedido #${order.checkout_id} (${itemsStr}) no total de R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Gostaria de confirmar o pagamento.\n\n📦 Link do Pedido: ${trackingLink}`;
                                window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer"
                        >
                            <MessageSquare size={17} /> Confirmar via WhatsApp
                        </button>
                        <Link 
                            href="/"
                            className="bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 transition-all border border-zinc-800 active:scale-95"
                        >
                            Continuar Navegando <ArrowRight size={17} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
