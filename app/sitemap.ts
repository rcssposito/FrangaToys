
import { MetadataRoute } from 'next';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// Helper to get base URL
const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'https://frangatoys.com.br';
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getBaseUrl();

    // 1. Static Routes
    const routes = [
        '',
        '/galeria', // Assuming main page is / or /galeria
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    // 2. Fetch Dynamic Routes (Figures)
    // We only want available or visible figures ideally, but let's take all for now.
    const { data: figures } = await supabase
        .from('figuras')
        .select('id, slug, updated_at')
        .order('id', { ascending: false });

    const figureRoutes = (figures || []).map((figure) => ({
        url: `${baseUrl}/figura/${figure.slug || figure.id}`, // Fallback to ID if slug missing (safety)
        lastModified: new Date(), // or figure.updated_at if available and valid date
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [...routes, ...figureRoutes];
}
