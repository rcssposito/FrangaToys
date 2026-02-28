'use client';

import { X, Trash2, Send, ChevronLeft, User, Phone, MessageSquare } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
    const { items, removeFromCart, updateQuantity, updateFinish, clearCart, totalItems } = useCart();
    const drawerRef = useRef<HTMLDivElement>(null);
    const [step, setStep] = useState<'cart' | 'checkout'>('cart');
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
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

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen, onClose]);

    const handleCheckout = () => {
        if (items.length === 0) return;
        if (!nome || !telefone) {
            toast.error('Por favor, preencha nome e WhatsApp!');
            return;
        }

        let msg = `*NOVO PEDIDO DE ORÇAMENTO*\n\n`;
        msg += `*Cliente:* ${nome}\n`;
        msg += `*WhatsApp:* ${telefone}\n`;
        if (observacoes) msg += `*Observações:* ${observacoes}\n\n`;
        msg += `------------------------\n\n`;
        msg += `*ITENS SOLICITADOS:*\n\n`;

        const selectedVendedor = vendedores.find(v => v.id === Number(selectedVendedorId));
        if (selectedVendedor) {
            msg += `*Atendimento por:* ${selectedVendedor.nome}\n`;
        }

        items.forEach((item, index) => {
            msg += `*${index + 1}. ${item.nome}*\n`;
            msg += `   Quantidade: ${item.quantity}\n`;
            msg += `   Acabamento: ${item.finish === 'basic' ? 'Básico' : 'Premium'}\n`;
            if (item.categoria) msg += `   Categoria: ${item.categoria}\n`;
            if (item.studio) msg += `   Estúdio: ${item.studio}\n`;
            msg += `\n`;
        });
        msg += `------------------------\n`;
        msg += `*Total de itens:* ${totalItems}`;

        const targetPhone = selectedVendedor ? selectedVendedor.telefone : '5511959737551';
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
                        className="fixed inset-0 bg-[var(--background)]/60 backdrop-blur-md z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={drawerRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--card-bg)] border-l border-[var(--card-border)] shadow-[var(--shadow-xl)] z-[70] flex flex-col transition-all duration-300"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)] bg-[var(--background)]/10">
                            {step === 'cart' ? (
                                <div>
                                    <h2 className="text-xl font-black text-orange-500 uppercase tracking-tighter">
                                        Seu Orçamento
                                    </h2>
                                    <p className="text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase mt-0.5">
                                        {totalItems} {totalItems === 1 ? 'item' : 'itens'} adicionados
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setStep('cart')}
                                        className="p-2 hover:bg-[var(--input-bg)] rounded-xl text-[var(--text-muted)] transition-colors active:scale-95"
                                    >
                                        <ChevronLeft size={20} strokeWidth={2.5} />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-black text-orange-500 uppercase tracking-tighter">
                                            Finalizar Pedido
                                        </h2>
                                        <p className="text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase mt-0.5">
                                            Dados para contato
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="p-2.5 bg-[var(--input-bg)] hover:text-orange-500 rounded-xl text-[var(--text-muted)] border border-[var(--card-border)] transition-all active:scale-90"
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
                                            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-[var(--text-muted)] gap-4">
                                                <div className="w-20 h-20 bg-orange-500/5 rounded-full flex items-center justify-center border border-orange-500/10 shadow-inner">
                                                    <Trash2 size={32} className="text-orange-500/50" strokeWidth={1.5} />
                                                </div>
                                                <p className="font-bold tracking-tight text-sm">Seu carrinho está vazio.</p>
                                            </div>
                                        ) : (
                                            items.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="flex flex-col gap-3 bg-[var(--input-bg)] p-4 rounded-2xl border border-[var(--card-border)] shadow-sm group hover:border-orange-500/30 transition-all"
                                                >
                                                    <div className="flex gap-4">
                                                        <div className="relative w-20 h-20 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl flex-shrink-0 overflow-hidden shadow-inner group-hover:border-orange-500/20 transition-colors">
                                                            <Image
                                                                loader={imageKitLoader}
                                                                src={getOptimizedImageUrl(item.imagem_url)}
                                                                alt={item.nome}
                                                                fill
                                                                className="object-contain p-1"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div>
                                                                    <h3 className="font-bold text-[var(--foreground)] truncate text-sm leading-tight">{item.nome}</h3>
                                                                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider mt-1 opacity-70">
                                                                        {item.categoria}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => removeFromCart(item.id)}
                                                                    className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex items-center gap-3 pt-3 border-t border-[var(--card-border)]/50 mt-1">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">QTD</span>
                                                            <div className="flex items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-sm overflow-hidden">
                                                                <button
                                                                    onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                                                                    className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors active:bg-orange-500/20 text-lg leading-none"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-8 h-7 flex items-center justify-center text-xs font-bold text-[var(--foreground)] border-x border-[var(--card-border)]">
                                                                    {item.quantity || 1}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                                                    className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors active:bg-orange-500/20 text-lg leading-none"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">TIPO</span>
                                                            <select
                                                                value={item.finish || 'basic'}
                                                                onChange={(e) => updateFinish(item.id, e.target.value as 'basic' | 'premium')}
                                                                className="text-xs font-bold bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-lg py-1.5 px-2 outline-none focus:border-orange-500/50 shadow-sm cursor-pointer hover:border-orange-500/30 transition-colors"
                                                            >
                                                                <option value="basic">Básico</option>
                                                                <option value="premium">Premium</option>
                                                            </select>
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
                                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex flex-col gap-2">
                                            <h3 className="font-bold text-[var(--foreground)] leading-tight">Quase lá!</h3>
                                            <p className="text-sm tracking-tight text-[var(--text-muted)] leading-relaxed">
                                                Preencha seus dados para que possamos enviar o seu orçamento personalizado via WhatsApp.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5 focus-within:text-orange-500 transition-colors">
                                                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                                                    <User size={14} /> Nome Completo *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={nome}
                                                    onChange={(e) => setNome(e.target.value)}
                                                    placeholder="Como gosta de ser chamado"
                                                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-[var(--text-muted)]/50"
                                                />
                                            </div>

                                            <div className="space-y-1.5 focus-within:text-orange-500 transition-colors">
                                                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                                                    <Phone size={14} /> WhatsApp *
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={telefone}
                                                    onChange={(e) => setTelefone(e.target.value)}
                                                    placeholder="(11) 90000-0000"
                                                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-[var(--text-muted)]/50"
                                                />
                                            </div>

                                            <div className="space-y-1.5 focus-within:text-orange-500 transition-colors">
                                                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                                                    <User size={14} /> Quem te atendeu? (Opcional)
                                                </label>
                                                <select
                                                    value={selectedVendedorId}
                                                    onChange={(e) => setSelectedVendedorId(e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium appearance-none"
                                                >
                                                    <option value="">Ninguém específico / Atendimento Franga Toys</option>
                                                    {vendedores.map(v => (
                                                        <option key={v.id} value={v.id}>{v.nome}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5 focus-within:text-orange-500 transition-colors">
                                                <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                                                    <MessageSquare size={14} /> Algum detalhe extra?
                                                </label>
                                                <textarea
                                                    value={observacoes}
                                                    onChange={(e) => setObservacoes(e.target.value)}
                                                    placeholder="Tamanho específico, ideia de pintura, etc..."
                                                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-[var(--text-muted)]/50 min-h-[100px] resize-none"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="p-6 border-t border-[var(--card-border)] bg-[var(--background)]/30 backdrop-blur-sm space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                {step === 'cart' ? (
                                    <>
                                        <button
                                            onClick={clearCart}
                                            className="w-full py-2 text-xs text-[var(--text-muted)] hover:text-red-500 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Trash2 size={12} strokeWidth={2.5} />
                                            Esvaziar carrinho
                                        </button>
                                        <button
                                            onClick={() => setStep('checkout')}
                                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                                        >
                                            Continuar para Contato
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={!nome || !telefone}
                                        className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:bg-[var(--card-border)] disabled:text-[var(--text-muted)] text-white font-black uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#25D366]/20 active:scale-95 disabled:active:scale-100 disabled:shadow-none"
                                    >
                                        <Send size={20} strokeWidth={2.5} />
                                        Enviar Pedido
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
