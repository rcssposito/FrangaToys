/**
 * Utilitário para processar URLs do ImageKit com parâmetros de transformação e cache-busting.
 */
export function getOptimizedImageUrl(url: string | null): string {
  if (!url) return '/placeholder.png';

  // Se já for uma imagem local ou placeholder, retorna direto
  if (url.startsWith('/') || url.startsWith('data:')) return url;

  try {
    const urlObj = new URL(url);
    const r2PublicBase = (
      process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
      'https://pub-ab391b8f43ea4791b533669f933ac2b5.r2.dev'
    ).replace(/\/+$/, '');
    const activeProvider = (process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'imagekit').toLowerCase().trim();

    // Modo Cloudflare R2 Ativo
    if (activeProvider === 'cloudflare') {
      if (urlObj.hostname.includes('r2.dev') || urlObj.hostname.includes('r2.cloudflarestorage.com')) {
        return url.split('?')[0];
      }
      if (urlObj.hostname.includes('imagekit.io')) {
        let cleanPath = urlObj.pathname.replace(/^\/lojinha3d\//, '/');
        return `${r2PublicBase}${cleanPath}`;
      }
    }

    // Modo ImageKit (Padrão de Fallback)
    if (urlObj.hostname.includes('imagekit.io')) {
      const hourScale = Math.floor(Date.now() / (1000 * 60 * 60));
      if (!urlObj.searchParams.has('v')) {
        urlObj.searchParams.set('v', hourScale.toString());
      }
    }

    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Redimensiona e comprime uma imagem no navegador antes do upload.
 * Reduz fotos de câmeras de celular (geralmente 4MB-10MB) para ~100KB-250KB WebP,
 * economizando espaço no ImageKit e agilizando o upload.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1280,
  quality = 0.75
): Promise<File> {
  // Se não estiver em ambiente de navegador ou se o arquivo não for imagem, retorna original
  if (typeof window === 'undefined' || !file || !file.type.startsWith('image/')) {
    return file;
  }

  // Não comprime SVGs ou GIFs animados
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Se a imagem já for menor que a dimensão máxima e for menor que 300KB, mantém original
          if (width <= maxDimension && height <= maxDimension && file.size < 300 * 1024) {
            resolve(file);
            return;
          }

          // Calcula proporção para manter aspect ratio
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file);
            return;
          }

          // Renderiza imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Tenta exportar para WebP com fallback para JPEG
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // Se a compressão não reduziu o tamanho, mantém o original
                resolve(file);
                return;
              }

              const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              const newFile = new File([blob], `${baseName}.webp`, {
                type: 'image/webp',
                lastModified: Date.now(),
              });

              resolve(newFile);
            },
            'image/webp',
            quality
          );
        };

        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };

      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}
