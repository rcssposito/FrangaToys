import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'sonner';
import Footer from '@/components/common/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Franga Toys',
    default: 'Franga Toys | Pintura em Impressão 3D',
  },
  description: 'Figures 3D pintadas à mão. Peças únicas para colecionadores. Sob encomenda. Compre direto pelo site.',
  keywords: ['action figures', 'impressão 3d', 'pintura à mão', 'colecionáveis', 'anime', 'marvel', 'dc', 'customização', 'franga toys'],
  openGraph: {
    title: 'Franga Toys | Pintura em Impressão 3D',
    description: 'Figures 3D pintadas à mão. Peças únicas para colecionadores. Sob encomenda.',
    url: 'https://frangatoys.com.br',
    siteName: 'Franga Toys',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Franga Toys | Pintura em Impressão 3D',
    description: 'Figures 3D pintadas à mão. Peças únicas para colecionadores. Sob encomenda.',
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          {modal}
          <Footer />
          <Toaster position="top-center" richColors />
        </Providers>

        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
