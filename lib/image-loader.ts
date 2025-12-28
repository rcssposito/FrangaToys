'use client';

interface ImageLoaderParams {
    src: string;
    width: number;
    quality?: number;
}

/**
 * Custom Loader para ImageKit.
 * Evita o uso do /_next/image da Vercel, gerando URLs diretas para o ImageKit.
 * Documentação: https://nextjs.org/docs/api-reference/next/image#loader
 */
export default function imageKitLoader({ src, width, quality }: ImageLoaderParams): string {
    if (src.startsWith('/') || src.startsWith('data:')) {
        return src;
    }

    try {
        const urlObj = new URL(src);

        // Verifica se é ImageKit
        if (urlObj.hostname.includes('imagekit.io')) {
            const params = urlObj.searchParams;

            // Obtém transformações existentes ou inicia vazio
            let tr = params.get('tr') || '';

            // Adiciona width e quality controlados pelo Next.js
            // Formato ImageKit: tr=w-300,q-80
            const newTransforms = [];

            // Se não tiver width na string original, adiciona a do loader
            if (!tr.includes('w-')) {
                newTransforms.push(`w-${width}`);
            }

            // Se não tiver quality, adiciona
            if (!tr.includes('q-')) {
                newTransforms.push(`q-${quality || 75}`);
            }

            // Garante f-auto (formato automático: WebP/AVIF)
            if (!tr.includes('f-')) {
                newTransforms.push('f-auto');
            }

            // Concatena com vírgula se já existir, senão cria
            if (tr) {
                // Se já existe tr, adicionamos as novas propriedades. 
                // O ImageKit permite tr=w-200,w-300 (o último ganha? ou encadeia?)
                // Melhor abordagem: append na string existente
                // Mas cuidado com a sintaxe. ImageKit usa vírgulas.
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
