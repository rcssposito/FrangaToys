export interface PricingParams {
    id: number;
    custo_resina_kg: number;
    custo_h_impressao: number;
    custo_h_pintura: number;
    margem_pobre: number;    // Estilizado
    margem_basica: number;   // Colorido
    margem_premium: number;  // 2D/Elite
}

export interface FigureMeta {
    resina_kg?: number | null;
    horas_impressao?: number | null;
    horas_pintura?: number | null;
}

export interface PriceResult {
    custo_producao: number;
    estilizado: number;
    colorido: number;
    premium: number;
}

export function calculateFigurePrices(meta: FigureMeta, settings: PricingParams): PriceResult {
    const resina = meta.resina_kg || 0;
    const hImpressao = meta.horas_impressao || 0;
    const hPintura = meta.horas_pintura || 0;

    // 1. Custo de Produção (Resina + Impressão)
    const custoProducao = Math.ceil(
        (resina * (settings.custo_resina_kg || 0)) +
        (hImpressao * (settings.custo_h_impressao || 0))
    );

    // 2. Estilizado: Pintura fixa de 20 minutos (0.33h) + Margem Pobre (1.15 default)
    const custoPinturaEstilizado = 0.33 * (settings.custo_h_pintura || 50);
    const custoBaseEstilizado = (resina * (settings.custo_resina_kg || 0)) +
                                (hImpressao * (settings.custo_h_impressao || 0)) +
                                custoPinturaEstilizado;
    
    // 3. Colorido: Pintura Real + Margem Básica (1.30 default)
    const custoBaseTotal = (resina * (settings.custo_resina_kg || 0)) +
                           (hImpressao * (settings.custo_h_impressao || 0)) +
                           (hPintura * (settings.custo_h_pintura || 0));

    const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

    return {
        custo_producao: custoProducao,
        estilizado: roundTo5(custoBaseEstilizado * (settings.margem_pobre || 1.15)),
        colorido: roundTo5(custoBaseTotal * (settings.margem_basica || 1.30)),
        premium: roundTo5(custoBaseTotal * (settings.margem_premium || 1.60))
    };
}
