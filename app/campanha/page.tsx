import type { Metadata } from 'next';
import CampanhaClient from './CampanhaClient';

// "Tag de metadado" - SEO e OpenGraph para a aba da campanha
export const metadata: Metadata = {
  title: 'Campanha de Ofertas Especiais',
  description: 'Aproveite descontos exclusivos nas nossas peças selecionadas. Quantidades limitadas!',
  keywords: ['campanha', 'promoção', 'ofertas especiais', 'action figures', 'desconto', 'franga toys'],
  openGraph: {
    title: 'Franga Toys | Ofertas Especiais',
    description: 'Aproveite descontos exclusivos nas nossas peças selecionadas. Quantidades limitadas!',
    url: 'https://frangatoys.com.br/campanha',
    siteName: 'Franga Toys',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/lojinha3d/Franga%20Toys.png',
        width: 1200,
        height: 630,
        alt: 'Franga Toys - Ofertas Especiais',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Franga Toys | Ofertas Especiais',
    description: 'Aproveite descontos exclusivos nas nossas peças selecionadas. Quantidades limitadas!',
    images: ['https://ik.imagekit.io/lojinha3d/Franga%20Toys.png'],
  },
};

export default function CampanhaPage() {
  return <CampanhaClient />;
}
