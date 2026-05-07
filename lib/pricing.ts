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

    // 2. Estilizado: Pintura fixa de 20 minutos (0.33h) + Margem Pobre
    const custoPinturaEstilizado = 0.33 * (settings.custo_h_pintura || 50);
    const custoBaseEstilizado = (resina * (settings.custo_resina_kg || 0)) +
                                (hImpressao * (settings.custo_h_impressao || 0)) +
                                custoPinturaEstilizado;
    
    // 3. Colorido: Pintura Real + Margem Básica
    const custoBaseTotal = (resina * (settings.custo_resina_kg || 0)) +
                           (hImpressao * (settings.custo_h_impressao || 0)) +
                           (hPintura * (settings.custo_h_pintura || 0));

    const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

    // Cálculo das margas líquidas (PIX)
    let pixEstilizado = roundTo5(custoBaseEstilizado * (settings.margem_pobre || 1.15));
    let pixColorido = roundTo5(custoBaseTotal * (settings.margem_basica || 1.30));
    let pixPremium = roundTo5(custoBaseTotal * (settings.margem_premium || 1.60));

    // Aplicar desconto de campanha se ativo
    if (meta.is_campanha_active) {
        if (meta.preco_fixo_campanha && meta.preco_fixo_campanha > 0) {
            // Se tiver preço fixo, ele sobrepõe apenas a versão estilizada (conforme pedido)
            pixEstilizado = meta.preco_fixo_campanha;
        } else if (meta.desconto_campanha && meta.desconto_campanha > 0) {
            // Se não tiver preço fixo, mas tiver porcentagem, aplica em todos
            const factor = 1 - (meta.desconto_campanha / 100);
            pixEstilizado = roundTo5(pixEstilizado * factor);
            pixColorido = roundTo5(pixColorido * factor);
            pixPremium = roundTo5(pixPremium * factor);
        }
    }

    return {
        custo_producao: custoProducao,
        // Preços no Cartão (PIX * Taxa)
        estilizado: roundTo5(pixEstilizado * taxaCartao),
        colorido: roundTo5(pixColorido * taxaCartao),
        premium: roundTo5(pixPremium * taxaCartao),
        // Preços Líquidos
        pix_estilizado: pixEstilizado,
        pix_colorido: pixColorido,
        pix_premium: pixPremium
    };
}
