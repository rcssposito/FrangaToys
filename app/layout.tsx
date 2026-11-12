import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'sonner';
import Footer from '@/components/common/Footer';
import CookieConsent from '@/components/common/CookieConsent';
import AccessBeacon from '@/components/AccessBeacon';
import MobileBottomNav from '@/components/common/MobileBottomNav';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: {
    template: '%s | Franga Toys',
    default: 'Franga Toys | Ateliê de Impressão 3D',
  },
  description: 'Serviços de impressão 3D em resina e pintura artesanal personalizada sob encomenda.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <AccessBeacon />
          {children}
          <Footer />
          <MobileBottomNav />
          <CookieConsent />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
