
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, Calendar, Award, ExternalLink, RefreshCw, ShoppingBag, Copy, QrCode, Check } from 'lucide-react';
import { OrderTracker } from '@/components/OrderTracker';
import Image from 'next/image';
import imageKitLoader from '@/lib/image-loader';
import Link from 'next/link';
import { toast } from 'sonner';
import { generatePixPayload } from '@/lib/pix';

function PixPaymentWidget({ order }: { order: any }) {
    const [copied, setCopied] = useState(false);
    const [pixPayload, setPixPayload] = useState('');

    const finalVal = Number(order.valor_venda_final) || 0;
    const freteVal = Number(order.valor_frete) || 0;
    const pagoVal = Number(order.valor_pago_parcial) || 0;
    const total = finalVal + freteVal;
    const remaining = Math.max(0, total - pagoVal);

    const checkoutId = order.checkout_id || order.id;

    useEffect(() => {
        if (remaining > 0 && !order.link_pagamento) {
            // Chave E-mail da loja, nome Bianca Machado Mastrocollo
            const payload = generatePixPayload("contato@frangatoys.com.br", "Bianca Machado Mastrocollo", remaining, checkoutId);
            setPixPayload(payload);

            if (checkoutId) {
                fetch('/api/public/orders/notify-pix-copied', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checkout_id: checkoutId, action: 'view' })
                }).catch(err => console.error('Erro ao notificar visualização Pix:', err));
            }
        }
    }, [remaining, order.link_pagamento, checkoutId]);

    const copyPix = () => {
        if (!pixPayload) return;
        navigator.clipboard.writeText(pixPayload);
        setCopied(true);
        toast.success('Chave PIX copiada!');
        setTimeout(() => setCopied(false), 3000);

        if (checkoutId) {
            fetch('/api/public/orders/notify-pix-copied', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkout_id: checkoutId, action: 'copy' })
            }).catch(err => console.error('Erro ao notificar cópia Pix:', err));
        }
    };

    if (remaining <= 0) return null;

    const isCard = !!order.link_pagamento;

    return (
        <div className="mt-6 bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-lg backdrop-blur-sm relative overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                        {isCard ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                        ) : (
                            <QrCode size={20} />
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                            {isCard ? 'EFETUAR PAGAMENTO (CARTÃO)' : 'EFETUAR PAGAMENTO (PIX)'}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            {isCard ? 'Realize o pagamento via Mercado Pago para liberar a produção e o envio da sua figura' : 'Realize o pagamento via PIX para liberar a produção e o envio da sua figura'}
                        </p>
                    </div>
                </div>
                
                <div className="text-right">
                    <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {order.status_pagamento === 'Parcial' ? 'PAGAMENTO PARCIAL' : 'AGUARDANDO PAGAMENTO'}
                    </span>
                </div>
            </div>

            {/* Financial summary and Payment Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* QR Code/Link Area */}
                <div className="lg:col-span-7 flex flex-col sm:flex-row items-center gap-6 w-full min-w-0">
                    {isCard ? (
                        <div className="w-full space-y-4">
                            <p className="text-[10.5px] text-zinc-400 font-medium">
                                Clique no botão abaixo para efetuar o pagamento com cartão de crédito via Mercado Pago:
                            </p>
                            <a 
                                href={order.link_pagamento}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest shadow-lg shadow-orange-500/10"
                            >
                                <ExternalLink size={14} strokeWidth={3} />
                                Pagar Agora (Mercado Pago)
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white p-3 rounded-2xl shrink-0 shadow-xl border border-white/10">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} 
                                    alt="PIX QR Code" 
                                    className="w-32 h-32"
                                />
                            </div>
                            
                            <div className="space-y-3 w-full min-w-0">
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider text-center sm:text-left">
                                    Escaneie o QR Code ao lado ou copie a chave Pix abaixo:
                                </p>
                                
                                <div className="w-full bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-mono text-zinc-500 shadow-inner">
                                    {pixPayload}
                                </div>

                                <button 
                                    onClick={copyPix}
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest shadow-lg shadow-orange-500/10"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={14} strokeWidth={3} />
                                            Código Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            Copiar Código Pix
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Values Summary Card */}
                <div className="lg:col-span-5 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 space-y-3 w-full">
                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Valor do Item:</span>
                        <span>R$ {finalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {freteVal > 0 && (
                        <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            <span>Frete:</span>
                            <span>R$ {freteVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="h-[1px] bg-zinc-800/80 my-2" />
                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Custo Total:</span>
                        <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {pagoVal > 0 && (
                        <div className="flex justify-between text-xs font-bold text-emerald-400 uppercase tracking-widest">
                            <span>Já Pago (Sinal):</span>
                            <span>R$ {pagoVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-black tracking-tight text-white border-t border-zinc-800/60 pt-3">
                        <span className="uppercase text-xs tracking-wider text-orange-500 self-center">Valor a Pagar:</span>
                        <span className="text-orange-500 text-xl font-black">R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NfeWidget({ order }: { order: any }) {
    const [copied, setCopied] = useState(false);

    const copyNfe = () => {
        if (!order.chave_nfe) return;
        navigator.clipboard.writeText(order.chave_nfe);
        setCopied(true);
        toast.success('Chave da NF-e copiada!');
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="mt-4 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-orange-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition-all" />
            <div className="space-y-1 z-10 w-full sm:w-auto min-w-0">
                <div className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Nota Fiscal Eletrônica (NF-e)
                </div>
                <div className="flex items-center gap-2 w-full min-w-0">
                    <div className="text-xs font-mono text-zinc-500 select-all group-hover:text-zinc-300 transition-colors overflow-hidden text-ellipsis whitespace-nowrap">
                        {order.chave_nfe}
                    </div>
                    <button 
                        onClick={copyNfe}
                        className="p-1.5 text-zinc-500 hover:text-orange-500 rounded-lg hover:bg-zinc-850/50 transition-all shrink-0 active:scale-90 flex items-center justify-center"
                        title="Copiar chave de acesso"
                    >
                        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                </div>
            </div>
            {order.link_danfe && (
                <a 
                    href={order.link_danfe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500 border border-orange-500/20 hover:border-orange-500 text-orange-500 hover:text-black text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 z-10 shrink-0"
                >
                    <ExternalLink size={12} strokeWidth={2.5} />
                    Visualizar DANFE (PDF)
                </a>
            )}
        </div>
    );
}

export default function CustomerDashboard() {
    const params = useParams();
    const router = useRouter();
    const identifier = params?.phone as string; // Pode ser telefone ou token
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Verifica se o identificador é um UUID ou telefone
            const isToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            const queryParam = isToken ? `token=${identifier}` : `phone=${identifier}`;
            
            const res = await fetch(`/api/public/orders?${queryParam}`);
            const data = await res.json();
            setOrders(data.items || []);
        } catch (err) {
            toast.error('Erro ao carregar seus pedidos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (identifier) fetchOrders();
    }, [identifier]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 size={40} className="animate-spin text-orange-500" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sincronizando com o Ateliê...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header Nav */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => router.push('/rastreio')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
                    >
                        <ArrowLeft size={16} />
                        Sair / Voltar
                    </button>
                    <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                            ACESSO PROTEGIDO
                         </span>
                         <button onClick={fetchOrders} className="p-2 text-zinc-500 hover:text-orange-500 transition-colors">
                            <RefreshCw size={18} />
                         </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter">MEUS <span className="text-orange-500">PEDIDOS</span></h1>
                    <p className="text-zinc-500 text-sm font-medium">Você tem {orders.length} figura(s) em nossa linha de produção.</p>
                </div>

                {/* Orders List */}
                <div className="space-y-6">
                    {orders.length === 0 ? (
                        <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-3xl p-20 text-center space-y-4">
                            <ShoppingBag size={48} className="mx-auto text-zinc-800" />
                            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Nenhum pedido ativo no momento.</p>
                            <Link href="/" className="inline-block text-orange-500 font-bold text-sm hover:underline">Ver catálogo para novas compras</Link>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <div 
                                key={order.id} 
                                className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all hover:bg-zinc-900/60"
                            >
                                <div className="p-6 md:p-8 space-y-8">
                                    {/* Order Info Row */}
                                    <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 overflow-hidden relative shadow-inner">
                                                {order.figura?.imagem ? (
                                                    <Image
                                                        loader={imageKitLoader}
                                                        src={order.figura.imagem}
                                                        alt=""
                                                        fill
                                                        className="object-cover opacity-80"
                                                        sizes="64px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                                        <Package size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white leading-none mb-1">{order.figura?.nome}</h3>
                                                <div className="flex items-center gap-3 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                                                    <span>{order.figura?.studio}</span>
                                                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                    <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(order.data).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Somente exibe certificado se estiver pronto/concluido ou se tiver ID */}
                                            <a 
                                                href={`/verificar/${order.token}`}
                                                target="_blank"
                                                className="flex items-center gap-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95"
                                            >
                                                <Award size={14} />
                                                Visualizar Certificado
                                            </a>
                                        </div>
                                    </div>

                                    {/* The Visual Tracker */}
                                    <div className="pt-4 border-t border-zinc-800/50">
                                        <OrderTracker status={order.status} />
                                    </div>

                                    {/* Seção de Nota Fiscal (NF-e) se disponível */}
                                    {order.chave_nfe && (
                                        <NfeWidget order={order} />
                                    )}

                                    {/* Seção de Pagamento PIX */}
                                    {((order.status_pagamento === 'Pendente' ||
                                       order.status_pagamento === 'Pendente/Incompleto' || 
                                       order.status_pagamento === 'Aguardando Pagamento' || 
                                       order.status_pagamento === 'Parcial' ||
                                       order.status === 'Aguardando Pagamento') && 
                                      order.status !== 'Cancelada') && (
                                        <PixPaymentWidget order={order} />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Help Section */}
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-6 text-center">
                    <p className="text-zinc-500 text-xs font-medium">
                        Dúvidas sobre o status ou envio? 
                        <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511988781670'}`} className="text-orange-500 font-bold ml-1 hover:underline">Fale com o Ateliê no WhatsApp</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
