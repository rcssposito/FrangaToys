'use client';

import { X, Trash2, Send } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import imageKitLoader from '@/lib/image-loader';
import { useRef, useEffect } from 'react';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
    const { items, removeFromCart, clearCart, totalItems } = useCart();
    const drawerRef = useRef<HTMLDivElement>(null);

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

        let msg = `Olá! Gostaria de um orçamento para os seguintes itens:\n\n`;
        items.forEach((item, index) => {
            msg += `*${index + 1}. ${item.nome}*\n`;
            if (item.categoria) msg += `   Categoria: ${item.categoria}\n`;
            if (item.studio) msg += `   Estúdio: ${item.studio}\n`;
            msg += `\n`;
        });
        msg += `Total de itens: ${totalItems}`;

        const url = `https://wa.me/5511959737551?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={drawerRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-[#18181b] border-l border-zinc-800 shadow-2xl z-[70] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Orçamento <span className="text-zinc-500 text-sm font-normal">({totalItems} itens)</span>
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                                        <Trash2 size={32} className="opacity-20" />
                                    </div>
                                    <p>Seu carrinho está vazio.</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="flex gap-3 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 items-center"
                                    >
                                        <div className="relative w-16 h-16 bg-zinc-800 rounded flex-shrink-0 overflow-hidden">
                                            <Image
                                                loader={imageKitLoader}
                                                src={getOptimizedImageUrl(item.imagem_url)}
                                                alt={item.nome}
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-white truncate">{item.nome}</h3>
                                            <div className="text-xs text-zinc-400">
                                                {item.studio && <span className="block">{item.studio}</span>}
                                                {item.categoria && <span className="block">{item.categoria}</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors"
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 space-y-3">
                                <button
                                    onClick={clearCart}
                                    className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    Limpar orçamente
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95"
                                >
                                    <Send size={18} />
                                    Enviar Pedido no WhatsApp
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
