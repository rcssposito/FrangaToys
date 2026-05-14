'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FiguraDTO } from '@/lib/dto';
import { toast } from 'sonner';

interface CartItem extends FiguraDTO {
    addedAt: number;
    quantity: number;
    finish: 'estilizado' | 'colorido' | 'premium';
}

interface CartContextType {
    items: CartItem[];
    addToCart: (figure: FiguraDTO, finish?: 'estilizado' | 'colorido' | 'premium') => void;
    removeFromCart: (figureId: number) => void;
    updateQuantity: (figureId: number, quantity: number) => void;
    updateFinish: (figureId: number, finish: 'estilizado' | 'colorido' | 'premium') => void;
    clearCart: () => void;
    isInCart: (figureId: number) => boolean;
    totalItems: number;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

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

    const addToCart = (figure: FiguraDTO, finish: 'estilizado' | 'colorido' | 'premium' = 'estilizado') => {
        if (items.some(i => i.id === figure.id)) {
            toast.error('Figura já está no carrinho!');
            setIsCartOpen(true);
            return;
        }
        setItems(prev => [...prev, { ...figure, addedAt: Date.now(), quantity: 1, finish }]);
        toast.success('Adicionado ao carrinho!');
        setIsCartOpen(true);
    };

    const removeFromCart = (figureId: number) => {
        setItems(prev => prev.filter(i => i.id !== figureId));
        toast.info('Removido do carrinho.');
    };

    const updateQuantity = (figureId: number, quantity: number) => {
        if (quantity < 1) return;
        setItems(prev => prev.map(i => i.id === figureId ? { ...i, quantity } : i));
    };

    const updateFinish = (figureId: number, finish: 'estilizado' | 'colorido' | 'premium') => {
        setItems(prev => prev.map(i => i.id === figureId ? { ...i, finish } : i));
    };

    const clearCart = () => {
        setItems([]);
        toast.info('Carrinho limpo.');
    };

    const isInCart = (figureId: number) => items.some(i => i.id === figureId);

    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, updateFinish, clearCart, isInCart, totalItems, isCartOpen, setIsCartOpen }}>
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

