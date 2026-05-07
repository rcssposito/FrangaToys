'use client';

import { X, Trash2, Send, ChevronLeft, User, Phone, MessageSquare, ChevronRight } from 'lucide-react';
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
    const [step, setStep] = useState<'cart' | 'checkout'>('cart');
    const [nome, setNome] = useState('');
    const [observacoes, setObservacoes] = useState('');

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

    // Reset step when closed
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep('cart');
                setSelectedVendedorId('');
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
        if (!val) return 'Sob consulta';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getFinishLabel = (finish: string) => {
        switch (finish) {
            case 'colorido': return 'Pintura Colorida';
            case 'premium': return 'Premium / 2D';
            default: return 'Pintura Estilizada';
        }
    };

    const handleCheckout = () => {
        if (items.length === 0) return;
        if (!nome) {
            toast.error('Por favor, preencha o seu nome!');
            return;
        }

        let msg = `*NOVO PEDIDO DE ORÇAMENTO*\n\n`;
        msg += `*Cliente:* ${nome}\n`;
        if (observacoes) msg += `*Observações:* ${observacoes}\n\n`;
        msg += `------------------------\n\n`;
        msg += `*ITENS SOLICITADOS:*\n\n`;

        const selectedVendedor = vendedores.find(v => v.id === Number(selectedVendedorId));
        if (selectedVendedor) {
            msg += `*Atendimento por:* ${selectedVendedor.nome}\n`;
        }

        items.forEach((item, index) => {
            const isOffer = (item as any).is_campanha || (item as any).is_campanha_active || (item as any).preco_fixo_campanha || (item as any).desconto_campanha;
            msg += `*${index + 1}. ${item.nome}${isOffer ? ' (OFERTA 🔥)' : ''}*\n`;
            msg += `   Quantidade: ${item.quantity}\n`;
            msg += `   Acabamento: ${getFinishLabel(item.finish)}\n`;
            if (item.categoria) msg += `   Categoria: ${item.categoria}\n`;
            if (item.studio) msg += `   Estúdio: ${item.studio}\n`;
            msg += `\n`;
        });
        msg += `------------------------\n`;
        msg += `*Total de itens:* ${totalItems}`;

        const targetPhone = selectedVendedor ? selectedVendedor.telefone : '5511959737551';

        if (!selectedVendedor) {
            msg += `*Atendimento:* Loja / Sem preferência\n`;
        }

        const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
        onClose();
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
                                        Seu Orçamento
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
                                                                    <option value="estilizado">Estilizado</option>
                                                                    <option value="colorido">Colorido</option>
                                                                    <option value="premium">Premium / 2D</option>
                                                                </select>
                                                            </div>
                                                            <div className="text-right">
                                                                {((item as any).is_campanha || (item as any).is_campanha_active) && (
                                                                    <div className="text-[7px] font-black text-purple-400 uppercase tracking-widest mb-0.5">
                                                                        Preço de Campanha 🔥
                                                                    </div>
                                                                )}
                                                                <div className="text-xs font-black text-white tracking-tighter">
                                                                    {formatPrice(item.precos?.[item.finish || 'estilizado'])}
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
                                ) : (
                                    <motion.div
                                        key="checkout-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-6 pt-2"
                                    >
                                        <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-3xl flex flex-col gap-3">
                                            <h3 className="font-black text-white tracking-tight uppercase tracking-widest text-xs">Atenção ao prazo</h3>
                                            <p className="text-xs font-medium tracking-tight text-zinc-400 leading-relaxed">
                                                Por ser um processo de criação manual e artesanal, o prazo mínimo de entrega é de 30 dias após pagamento.<br /><br />
                                                As cores podem variar levemente conforme o monitor e o processo de pintura física.
                                            </p>
                                        </div>

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
                                                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                                />
                                            </div>

                                            <div className="space-y-2 focus-within:text-blue-500 transition-colors">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ml-1 text-zinc-600">
                                                    <Phone size={12} /> Consultor (Opcional)
                                                </label>
                                                <div className="relative">
                                                     <select
                                                        value={selectedVendedorId}
                                                        onChange={(e) => setSelectedVendedorId(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold appearance-none text-sm cursor-pointer"
                                                    >
                                                        <option value="">Atendimento Franga Toys</option>
                                                        {vendedores.map(v => (
                                                            <option key={v.id} value={v.id}>{v.nome}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2 focus-within:text-blue-500 transition-colors">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ml-1 text-zinc-600">
                                                    <MessageSquare size={12} /> Detalhes Extras
                                                </label>
                                                <textarea
                                                    value={observacoes}
                                                    onChange={(e) => setObservacoes(e.target.value)}
                                                    placeholder="Algum detalhe específico?"
                                                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold placeholder-zinc-700 min-h-[120px] resize-none text-sm"
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
                                {step === 'cart' ? (
                                    <>
                                        <button
                                            onClick={() => setStep('checkout')}
                                            className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] text-xs hover:bg-blue-500 hover:text-white"
                                        >
                                            Checkout <ChevronRight size={16} />
                                        </button>
                                        <button
                                            onClick={clearCart}
                                            className="w-full py-1 text-[9px] text-zinc-700 hover:text-red-500 font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                                        >
                                            Limpar lista
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={!nome}
                                        className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_15px_40px_rgba(37,211,102,0.2)] active:scale-[0.98] text-xs"
                                    >
                                        <Send size={18} />
                                        Enviar para WhatsApp
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
