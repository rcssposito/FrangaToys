/**
 * Utilitário para processar URLs do ImageKit com parâmetros de transformação e cache-busting.
 */
export function getOptimizedImageUrl(url: string | null): string {
  if (!url) return '/placeholder.png';

  // Se já for uma imagem local ou placeholder, retorna direto
  if (url.startsWith('/') || url.startsWith('data:')) return url;

  try {
    const urlObj = new URL(url);

    // Se for do ImageKit, podemos garantir as transformações e o parâmetro de versão
    if (urlObj.hostname.includes('imagekit.io')) {
      // Adiciona parâmetro de versão baseado no timestamp atual (por sessão/carregamento)
      // Ou poderíamos usar uma constante global se quisermos cache mais longo.
      // Aqui usamos um valor que muda aproximadamente a cada hora para equilíbrio
      const hourScale = Math.floor(Date.now() / (1000 * 60 * 60));

      if (urlObj.searchParams.has('v')) {
        // Se já tem versão, não mexemos (ou atualizamos se necessário)
      } else {
        urlObj.searchParams.set('v', hourScale.toString());
      }

      // As transformações de redimensionamento (width/quality) agora são 
      // gerenciadas pelo Custom Loader (next.config.ts -> image-loader.ts)
      // Aqui garantimos apenas o cache-busting (v).
    }

    return urlObj.toString();
  } catch (e) {
    // Se a URL for inválida (ex: apenas parte do path), tenta concatenar ou retorna original
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
