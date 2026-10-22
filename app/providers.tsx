'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { ThemeProvider } from 'next-themes';
import { CartDrawer } from '@/components/Cart/CartDrawer';
import { WishlistDrawer } from '@/components/Wishlist/WishlistDrawer';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
                <CartProvider>
                    <WishlistProvider>
                        {children}
                        <CartDrawer />
                        <WishlistDrawer />
                    </WishlistProvider>
                </CartProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
