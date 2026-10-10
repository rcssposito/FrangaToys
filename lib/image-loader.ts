'use client';

interface ImageLoaderParams {
    src: string;
    width: number;
    quality?: number;
}

/**
 * Custom Loader para Cloudflare R2 e ImageKit.
 * Controlado pela variável NEXT_PUBLIC_STORAGE_PROVIDER ('cloudflare' ou 'imagekit').
 * Permite alternar instantaneamente entre provedores com zero risco de quebra.
 */
export default function imageKitLoader({ src, width, quality }: ImageLoaderParams): string {
    if (src.startsWith('/') || src.startsWith('data:')) {
        return src;
    }

    try {
        const urlObj = new URL(src);
        const r2PublicBase = (
            process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
            'https://pub-ab391b8f43ea4791b533669f933ac2b5.r2.dev'
        ).replace(/\/+$/, '');
        const activeProvider = (process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'imagekit').toLowerCase().trim();

        // Modo Cloudflare R2 Ativo
        if (activeProvider === 'cloudflare') {
            // Se já for URL do R2, entrega direta com parâmetro width para o Next.js
            if (urlObj.hostname.includes('r2.dev') || urlObj.hostname.includes('r2.cloudflarestorage.com')) {
                const base = src.split('?')[0];
                return `${base}?w=${width}`;
            }

            // Se for do ImageKit, mapeia transparentemente para a réplica idêntica no R2
            if (urlObj.hostname.includes('imagekit.io')) {
                let cleanPath = urlObj.pathname;
                cleanPath = cleanPath.replace(/^\/lojinha3d\//, '/');
                return `${r2PublicBase}${cleanPath}?w=${width}`;
            }
        }

        // Modo ImageKit (Padrão de Fallback)
        if (urlObj.hostname.includes('imagekit.io')) {
            const params = urlObj.searchParams;
            let tr = params.get('tr') || '';
            const newTransforms = [];

            if (!tr.includes('w-')) {
                newTransforms.push(`w-${width}`);
            }
            if (!tr.includes('q-')) {
                newTransforms.push(`q-${quality || 75}`);
            }
            if (!tr.includes('f-')) {
                newTransforms.push('f-auto');
            }

            if (tr) {
                params.set('tr', `${tr},${newTransforms.join(',')}`);
            } else {
                params.set('tr', newTransforms.join(','));
            }

            return urlObj.toString();
        }

        return src;
    } catch (e) {
        return src;
    }
}
