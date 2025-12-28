'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'sonner';

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
            <CartProvider>
                {children}
                <Toaster position="top-center" richColors />
            </CartProvider>
        </QueryClientProvider>
    );
}
