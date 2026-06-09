'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Copy, QrCode, MessageSquare, ArrowRight, Package, Truck, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { generatePixPayload } from '@/lib/pix';
import Link from 'next/link';

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

    useEffect(() => {
        if (!token) return;

        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/public/order?token=${token}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setOrder(data);

                // Generate PIX payload if it was a PIX order
                if (data.metodo_pagamento === 'pix' || !data.link_pagamento) {
                    const total = data.items.reduce((acc: number, item: any) => acc + (item.valor_venda_final || 0), 0) + (data.valor_frete || 0);
                    const payload = generatePixPayload("43687871886", "Rodrigo Casagrande Sposito", total);
                    setPixPayload(payload);
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
        navigator.clipboard.writeText(pixPayload);
        toast.success('Chave PIX copiada!');
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

                    {/* PIX Section */}
                    {pixPayload && (
                        <div className="mb-8 space-y-6">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 text-center space-y-6">
                                <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs">Pagar via PIX</h3>
                                
                                <div className="flex justify-center">
                                    <div className="bg-white p-3 rounded-2xl">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} 
                                            alt="PIX QR Code" 
                                            className="w-40 h-40"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs text-zinc-400 font-medium">Escaneie o QR Code ou copie a chave abaixo:</p>
                                    <button 
                                        onClick={copyPix}
                                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 p-4 rounded-2xl flex items-center justify-between group transition-all"
                                    >
                                        <span className="text-[10px] font-mono text-zinc-500 truncate mr-4">{pixPayload}</span>
                                        <Copy size={16} className="text-zinc-600 group-hover:text-emerald-500 transition-colors shrink-0" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={() => {
                            const msg = `Olá! Acabei de fazer o pedido #${order.checkout_id} e gostaria de informar o pagamento / tirar dúvidas.`;
                            window.open(`https://wa.me/5511988781670?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white p-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
                    >
                        <MessageSquare size={18} /> Confirmar via WhatsApp
                    </button>
                    <Link 
                        href="/"
                        className="bg-zinc-900 hover:bg-zinc-800 text-white p-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all border border-zinc-800 active:scale-95"
                    >
                        Continuar Navegando <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
