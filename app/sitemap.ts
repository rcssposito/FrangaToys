
import { MetadataRoute } from 'next';

// Helper to get base URL
const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'https://frangatoys.com.br';
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getBaseUrl();

    // Bloqueado para crawlers: ZERO figuras expostas no sitemap
    return [
        '',
        '/faq',
        '/rastreio',
        '/privacidade',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
    }));
}

