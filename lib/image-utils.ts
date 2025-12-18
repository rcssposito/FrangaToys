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

      // Garante transformações básicas se não houver 'tr'
      if (!urlObj.searchParams.has('tr')) {
        urlObj.searchParams.set('tr', 'w-800,q-80,f-auto');
      }
    }

    return urlObj.toString();
  } catch (e) {
    // Se a URL for inválida (ex: apenas parte do path), tenta concatenar ou retorna original
    return url;
  }
}
