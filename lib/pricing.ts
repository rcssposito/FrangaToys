export interface PricingParams {
    id: number;
    custo_resina_kg: number;
    custo_h_impressao: number;
    custo_h_pintura: number;
    margem_pobre: number;    // Estilizado
    margem_basica: number;   // Colorido
    margem_premium: number;  // 2D/Premium
    taxa_cartao?: number;    // Multiplicador do cartão (ex: 1.15)
}

export interface FigureMeta {
    resina_kg?: number | null;
    horas_impressao?: number | null;
    horas_pintura?: number | null;
    is_campanha_active?: boolean | null;
    desconto_campanha?: number | null;
    preco_fixo_campanha?: number | null;
}

export interface PriceResult {
    custo_producao: number;
    // Preços no Cartão (Padrão para Vitrine)
    estilizado: number;
    colorido: number;
    premium: number;
    // Preços no PIX (Com desconto)
    pix_estilizado: number;
    pix_colorido: number;
    pix_premium: number;
}

export function calculateFigurePrices(meta: FigureMeta, settings: PricingParams): PriceResult {
    const resina = meta.resina_kg || 0;
    const hImpressao = meta.horas_impressao || 0;
    const hPintura = meta.horas_pintura || 0;
    const taxaCartao = settings.taxa_cartao || 1.15;

    // 1. Custo de Produção (Resina + Impressão)
    const custoProducao = Math.ceil(
        (resina * (settings.custo_resina_kg || 0)) +
        (hImpressao * (settings.custo_h_impressao || 0))
    );

    // 2. Sem Pintura: Custo de Produção (Resina + Impressão) + Margem Pobre (no painting cost)
    const custoBaseEstilizado = custoProducao;
    
    // 3. Colorido: Pintura Real + Margem Básica
    const custoBaseTotal = (resina * (settings.custo_resina_kg || 0)) +
                           (hImpressao * (settings.custo_h_impressao || 0)) +
                           (hPintura * (settings.custo_h_pintura || 0));

    const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

    // Cálculo das margas líquidas (PIX)
    let pixEstilizado = roundTo5(custoBaseEstilizado * (settings.margem_pobre || 1.15));
    let pixColorido = roundTo5(custoBaseTotal * (settings.margem_basica || 1.30));
    let pixPremium = 0; // Removed/Zeroed out

    // Aplicar desconto de campanha se ativo
    if (meta.is_campanha_active) {
        if (meta.preco_fixo_campanha && meta.preco_fixo_campanha > 0) {
            // Se tiver preço fixo, ele sobrepõe apenas a versão sem pintura (conforme pedido)
            pixEstilizado = meta.preco_fixo_campanha;
        } else if (meta.desconto_campanha && meta.desconto_campanha > 0) {
            // Se não tiver preço fixo, mas tiver porcentagem, aplica em todos
            const factor = 1 - (meta.desconto_campanha / 100);
            pixEstilizado = roundTo5(pixEstilizado * factor);
            pixColorido = roundTo5(pixColorido * factor);
            pixPremium = 0;
        } else {
            // Se estiver sem valor de desconto ou preço fixo, é pra usar o custo de produção
            pixEstilizado = custoProducao;
        }
    }

    return {
        custo_producao: custoProducao,
        // Preços no Cartão (PIX * Taxa)
        estilizado: roundTo5(pixEstilizado * taxaCartao),
        colorido: roundTo5(pixColorido * taxaCartao),
        premium: 0,
        // Preços Líquidos
        pix_estilizado: pixEstilizado,
        pix_colorido: pixColorido,
        pix_premium: 0
    };
}

export function getFigureTier(price: number): number {
    if (price >= 1800) return 1;
    if (price >= 1200) return 2;
    if (price >= 700) return 3;
    if (price >= 400) return 4;
    return 5;
}

export function getTierBadgeStyle(tier: number): { label: string, bg: string, text: string, border: string } {
    switch (tier) {
        case 1:
            return { label: 'Tier 1', bg: 'bg-purple-950/40 backdrop-blur-md', text: 'text-purple-400 font-extrabold', border: 'border-purple-500/20' };
        case 2:
            return { label: 'Tier 2', bg: 'bg-amber-950/40 backdrop-blur-md', text: 'text-amber-400 font-extrabold', border: 'border-amber-500/20' };
        case 3:
            return { label: 'Tier 3', bg: 'bg-blue-950/40 backdrop-blur-md', text: 'text-blue-400 font-extrabold', border: 'border-blue-500/20' };
        case 4:
            return { label: 'Tier 4', bg: 'bg-emerald-950/40 backdrop-blur-md', text: 'text-emerald-400 font-extrabold', border: 'border-emerald-500/20' };
        default:
            return { label: 'Tier 5', bg: 'bg-zinc-900/40 backdrop-blur-md', text: 'text-zinc-350 font-extrabold', border: 'border-zinc-500/20' };
    }
}
