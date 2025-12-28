'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FiguraDTO } from '@/lib/dto';
import { toast } from 'sonner';

interface CartItem extends FiguraDTO {
    addedAt: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (figure: FiguraDTO) => void;
    removeFromCart: (figureId: number) => void;
    clearCart: () => void;
    isInCart: (figureId: number) => boolean;
    totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('franga_cart');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse cart', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('franga_cart', JSON.stringify(items));
        }
    }, [items, isInitialized]);

    const addToCart = (figure: FiguraDTO) => {
        if (items.some(i => i.id === figure.id)) {
            toast.error('Figura já está no orçamento!');
            return;
        }
        setItems(prev => [...prev, { ...figure, addedAt: Date.now() }]);
        toast.success('Adicionado ao orçamento!');
    };

    const removeFromCart = (figureId: number) => {
        setItems(prev => prev.filter(i => i.id !== figureId));
        toast.info('Removido do orçamento.');
    };

    const clearCart = () => {
        setItems([]);
        toast.info('Orçamento limpo.');
    };

    const isInCart = (figureId: number) => items.some(i => i.id === figureId);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, isInCart, totalItems: items.length }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
