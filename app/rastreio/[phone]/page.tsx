
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, Calendar, Award, ExternalLink, RefreshCw, ShoppingBag } from 'lucide-react';
import { OrderTracker } from '@/components/OrderTracker';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CustomerDashboard() {
    const params = useParams();
    const router = useRouter();
    const phone = params?.phone as string;
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/public/orders?phone=${phone}`);
            const data = await res.json();
            setOrders(data.items || []);
        } catch (err) {
            toast.error('Erro ao carregar seus pedidos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (phone) fetchOrders();
    }, [phone]);

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
                            ID: {phone}
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
                                                    <img src={order.figura.imagem} alt="" className="object-cover w-full h-full opacity-80" />
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
                                            {/* Somente exibe certificado se estiver pronto/concluído ou se tiver ID */}
                                            <a 
                                                href={`/api/admin/kanban/certificate/${order.id}`}
                                                target="_blank"
                                                className="flex items-center gap-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-full hover:bg-orange-500 transition-all shadow-xl active:scale-95"
                                            >
                                                <Award size={14} />
                                                Certificado Digital
                                            </a>
                                        </div>
                                    </div>

                                    {/* The Visual Tracker */}
                                    <div className="pt-4 border-t border-zinc-800/50">
                                        <OrderTracker status={order.status} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Help Section */}
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-6 text-center">
                    <p className="text-zinc-500 text-xs font-medium">
                        Dúvidas sobre o status ou envio? 
                        <a href="https://wa.me/5511959737551" className="text-orange-500 font-bold ml-1 hover:underline">Fale com o Ateliê no WhatsApp</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
